from flask import Blueprint, request, jsonify
from flasgger import swag_from
from ..db.dynamo import save_feedback
from ..db.s3 import append_row_to_csv_on_s3    # ← 新增匯入

bp = Blueprint("feedback", __name__)

@bp.route("/feedback", methods=["POST"])
@swag_from({
    "tags": ["Feedback"],
    "summary": "Collect designer feedback",
    "parameters": [{
        "in": "body",
        "name": "body",
        "required": True,
        "schema": {
            "type": "object",
            "properties": {
                "image_id":  {"type": "string"},
                "rating":    {"type": "integer", "minimum": 1, "maximum": 5},
                "comment":   {"type": "string"}
            },
            "required": ["image_id", "rating"]
        }
    }],
    "responses": {200: {"description": "stored"}}
})
def feedback():
    data = request.get_json()

     # 1. 先把 JSON 直接追加到 S3 /metadata/feedback.csv
    append_row_to_csv_on_s3(data)              # ← 新增

    # 2. 照舊呼叫 DynamoDB stub（若你還需要）
    save_feedback(data)
    
    return jsonify({"status": "stored"})
