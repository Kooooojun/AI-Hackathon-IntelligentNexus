from flask import Blueprint, request, jsonify
from flasgger.utils import swag_from
import uuid
import os
from werkzeug.utils import secure_filename # 用於安全地處理檔案名稱
import threading

# 假設 S3 和 Prompt 引擎服務已匯入
try:
    # 注意：s3_utils.py 需要能處理多個檔案上傳
    from ..db.s3 import upload_file_to_s3
except ImportError:
    # 提供一個 stub 以便程式碼能運行
    def upload_file_to_s3(file_path, key):
        print(f"STUB: Would upload {file_path} to S3 as {key}")
        # 模擬返回一個假的 S3 路徑或 Key
        return f"uploads/{key}" # 或者返回完整的假 URL

try:
    from ..services.prompt_engine import build_prompt
except ImportError:
    def build_prompt(description, style_tags=None, colors=None, lighting=None): # 調整參數
        print("STUB: Building prompt")
        return f"STUB Prompt for: {description}"

try:
    # sagemaker_client 需要一個函數來觸發背景生成
    from ..services.sagemaker_client import trigger_image_generation_task
except ImportError:
    def trigger_image_generation_task(request_id, prompt, input_image_keys=None):
        print(f"STUB: Triggering background task for {request_id}")
        # 在 stub 模式下，直接更新狀態為完成並放入假 URL
        job_status_store[request_id] = {
            "status": "succeeded",
            "image_url": "https://placehold.co/768x768.png?text=Mock+Generated+Image"
        }
        print(f"STUB: Marked job {request_id} as succeeded.")


bp = Blueprint("generate", __name__)

# --- Hackathon 簡易狀態儲存 (用字典模擬) ---
# !!! 警告：這只適用於單一進程開發伺服器，部署時會失效，需要換成 Redis/DB !!!
job_status_store = {}
# -----------------------------------------

# --- 檔案上傳設定 ---
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
# --------------------

@bp.route("/generate", methods=["POST"])
@swag_from({
    "tags": ["Generate"],
    "summary": "Submit design task, get request_id",
    "consumes": ["multipart/form-data"],
    "parameters": [
        {"name": "style", "in": "formData", "type": "string", "required": True, "description": "Design style (e.g., Cyberpunk)"},
        {"name": "lighting", "in": "formData", "type": "string", "required": True, "description": "Lighting effect (e.g., RGB_neon)"},
        {"name": "colors", "in": "formData", "type": "string", "required": True, "description": "Comma-separated HEX colors (e.g., #6A0DAD,#1B9AAA)"},
        {"name": "description", "in": "formData", "type": "string", "required": True, "description": "Free text description"},
        {"name": "images", "in": "formData", "type": "file", "required": False, "description": "Reference images (max 3)"}
    ],
    "responses": {
        200: {
            "description": "Task submitted successfully",
            "schema": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "succeeded"}, # API 本身成功接收請求
                    "request_id": {"type": "string", "example": "uuid-abcd-1234"},
                    "prompt": {"type": "string", "example": "Generated prompt..."}
                }
            }
        },
        400: {"description": "Bad input (missing fields, invalid file)"}
    }
})
def submit_generation_task():
    # 1. 檢查必要欄位
    required_fields = ['style', 'lighting', 'colors', 'description']
    if not all(field in request.form for field in required_fields):
        missing = [field for field in required_fields if field not in request.form]
        return jsonify({"error": f"Missing required form fields: {', '.join(missing)}"}), 400

    style = request.form['style']
    lighting = request.form['lighting']
    colors = request.form['colors']
    description = request.form['description']

    # 2. 處理檔案上傳 (可選)
    uploaded_image_keys = [] # 儲存上傳到 S3 後的 Key
    if 'images' in request.files:
        files = request.files.getlist('images')
        if len(files) > 3:
             return jsonify({"error": "Maximum 3 reference images allowed."}), 400

        for file in files:
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                temp_path = os.path.join(UPLOAD_FOLDER, filename)
                try:
                    file.save(temp_path)
                    # 上傳到 S3 (需要 s3_utils.py 中的 upload_file_to_s3 返回 S3 Key)
                    s3_key = upload_file_to_s3(temp_path, f"uploads/{uuid.uuid4()}_{filename}") # 使用 UUID 避免檔名衝突
                    uploaded_image_keys.append(s3_key)
                except Exception as e:
                    # 清理暫存檔案 (如果存在)
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    return jsonify({"error": f"Failed to upload file {filename}: {str(e)}"}), 500
                finally:
                    # 確保暫存檔案被刪除
                    if os.path.exists(temp_path):
                         os.remove(temp_path)
            elif file and file.filename and not allowed_file(file.filename):
                 return jsonify({"error": f"File type not allowed for {file.filename}"}), 400

    # 3. 組合 Prompt (調用服務層)
    # 注意：build_prompt 可能需要修改以接收新的參數格式
    style_tags_list = style.split(',') # 假設 style 也可以是多個 tag
    colors_list = colors.split(',')
    prompt = build_prompt(description, style_tags=style_tags_list, colors=colors_list, lighting=lighting)

    # 4. 產生 Request ID 並記錄初始狀態
    request_id = str(uuid.uuid4())
    job_status_store[request_id] = {"status": "processing"}
    print(f"Received task {request_id}, status: processing")

    # 5. 觸發背景任務執行 AI 生成 (使用 threading 簡化)
    #    實際應用應使用 Celery, RQ 等更可靠的任務隊列
    thread = threading.Thread(target=trigger_image_generation_task,
                              args=(request_id, prompt, uploaded_image_keys))
    thread.start()
    print(f"Background generation task started for {request_id}")

    # 6. 立即回傳 Request ID 給前端
    return jsonify({
        "status": "succeeded", # 表示請求已成功提交
        "request_id": request_id,
        "prompt": prompt
    })

@bp.route("/generate/<string:request_id>", methods=["GET"])
@swag_from({
    "tags": ["Generate"],
    "summary": "Check generation status and get results",
    "parameters": [
        {"name": "request_id", "in": "path", "type": "string", "required": True, "description": "The request ID from the initial POST"}
    ],
    "responses": {
        200: {
            "description": "Status and result (if completed)",
            "schema": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["processing", "succeeded", "failed"]},
                    "image_url": {"type": "string", "description": "URL of the generated image (only if status is succeeded)"},
                    "error": {"type": "string", "description": "Error message (only if status is failed)"}
                }
            }
        },
        404: {"description": "Request ID not found"}
    }
})
def get_generation_status(request_id):
    job_info = job_status_store.get(request_id)

    if not job_info:
        return jsonify({"error": "Request ID not found"}), 404

    print(f"Checking status for {request_id}: {job_info}")
    return jsonify(job_info) # 直接回傳儲存的狀態和結果