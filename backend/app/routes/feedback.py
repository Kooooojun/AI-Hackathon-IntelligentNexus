from flask import Blueprint, request, jsonify
from flasgger import swag_from
from ..db.dynamo import save_feedback

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
    save_feedback(data)          # ⇢ 暫存 DynamoDB（stub）
    return jsonify({"status": "stored"})
