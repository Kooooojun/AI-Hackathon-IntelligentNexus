from flask import Blueprint, request, jsonify
from flasgger.utils import swag_from
import uuid
import os
import threading
import time # 用於模擬背景任務狀態更新
from werkzeug.utils import secure_filename
import logging # 加入日誌

# 假設其他模組可以正確導入 (即使內部是 Stub)
try:
    # S3 工具函數
    from ..db.s3 import upload_file_to_s3
except ImportError:
    logging.warning("db.s3 not found, using stub for upload_file_to_s3.")
    # 提供一個 stub 以便程式碼能運行
    def upload_file_to_s3(file_path, key):
        print(f"STUB: Would upload {file_path} to S3 as {key}")
        # 模擬返回一個假的 S3 Key
        return f"uploads/stub_{key}"

try:
    # Prompt 引擎服務
    from ..services.prompt_engine import build_prompt
except ImportError:
    logging.warning("services.prompt_engine not found, using stub for build_prompt.")
    # 提供一個符合新簽名的 stub
    def build_prompt(style, lighting, colors, description, image_paths=None):
        print("STUB: Building prompt")
        img_desc = f"Input images: {image_paths}" if image_paths else ""
        return f"STUB Prompt: Style={style}, Lighting={lighting}, Colors={colors}, Desc={description}. {img_desc}".strip()

try:
    # 圖像生成觸發器 (背景任務)
    from ..services.sagemaker_client import trigger_image_generation_task
except ImportError:
    logging.warning("services.sagemaker_client not found, using stub for trigger_image_generation_task.")
    # 模擬背景任務函數，它會更新 job_status_store
    def mock_background_task(request_id, prompt, input_image_keys=None):
        global job_status_store # 直接修改全域字典 (僅供範例)
        logger.info(f"[Thread-{request_id[:6]}] STUB Background task started with prompt: {prompt[:30]}...")
        time.sleep(10) # 模擬耗時的 AI 生成
        # 模擬成功並設定假 URL
        job_status_store[request_id] = {
            "status": "succeeded",
            "image_url": f"https://placehold.co/512x512.png?text=Result+for+{request_id[:6]}"
        }
        logger.info(f"[Thread-{request_id[:6]}] STUB Background task finished successfully.")
    trigger_image_generation_task = mock_background_task

# --- Logger Setup ---
logger = logging.getLogger(__name__)
# --------------------

# --- Blueprint Definition ---
bp = Blueprint("generate", __name__)
# --------------------------

# --- 簡易記憶體內狀態儲存 (僅供本地開發測試) ---
# !!! 警告: 正式部署需改用資料庫或 Redis !!!
job_status_store = {}
# --------------------------------------------

# --- 檔案上傳配置 ---
UPLOAD_FOLDER = 'temp_uploads' # 暫存上傳檔案的資料夾
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """檢查檔案副檔名是否允許"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
# --------------------

# --- API Endpoints ---

@bp.route("/generate", methods=["POST"])
@swag_from({
    "tags": ["Generate"],
    "summary": "Submit design task, get request_id (Async)",
    "description": "Accepts form-data including text prompt parts and optional images. Returns a request ID immediately. Use the GET endpoint to poll for results.",
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
            "description": "Task successfully submitted",
            "schema": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "succeeded"},
                    "request_id": {"type": "string", "example": "uuid-abcd-1234"},
                    "prompt": {"type": "string", "example": "Generated prompt used for the task"}
                }
            }
        },
        400: {"description": "Bad Request (e.g., missing fields, invalid file type, too many files)"},
        500: {"description": "Internal Server Error (e.g., file upload failed or background task error)"}
    }
})
def submit_generation_task():
    """
    處理新的圖像生成任務提交。
    接收 Form Data 和可選的圖片，觸發背景任務，並立即返回 request ID。
    """
    request_start_time = time.time()
    logger.info("Received POST /api/generate request")
    try:
        # 1. 獲取表單欄位數據
        style = request.form.get('style')
        lighting = request.form.get('lighting')
        colors_str = request.form.get('colors')
        description = request.form.get('description')
        logger.debug(f"Form data - style: {style}, lighting: {lighting}, colors: {colors_str}, desc: {description[:50]}...")

        required_fields = {'style': style, 'lighting': lighting, 'colors': colors_str, 'description': description}
        if not all(required_fields.values()):
            missing = [k for k, v in required_fields.items() if not v]
            logger.warning(f"Missing required form fields: {missing}")
            return jsonify({"error": f"Missing required form fields: {', '.join(missing)}"}), 400

        # 2. 處理檔案上傳
        uploaded_image_keys = [] # 儲存 S3 Keys
        if 'images' in request.files:
            files = request.files.getlist('images')
            logger.info(f"Received {len(files)} file(s) in 'images' field.")
            if len(files) > 3:
                 logger.warning("Too many files uploaded.")
                 return jsonify({"error": "Maximum 3 reference images allowed."}), 400

            for file in files:
                # 檢查是否有檔案且檔名不為空
                if file and file.filename:
                    if allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        # 暫存檔案到本地 (生產環境不建議)
                        temp_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_{filename}")
                        s3_key_prefix = "uploads" # 上傳到 S3 的 uploads 資料夾
                        s3_object_name = f"{s3_key_prefix}/{uuid.uuid4()}_{filename}" # 使用 UUID 確保 S3 key 唯一性
                        try:
                            logger.debug(f"Saving temporary file to {temp_path}")
                            file.save(temp_path)

                            # ===============================================
                            # == 調用 S3 上傳服務 (可以保持 Stub 或實現) ==
                            logger.debug(f"Calling upload_file_to_s3 for {temp_path} as {s3_object_name}")
                            s3_key_or_url = upload_file_to_s3(temp_path, s3_object_name)
                            # ===============================================

                            if s3_key_or_url: # 假設返回 S3 Key 或 URL
                                uploaded_image_keys.append(s3_key_or_url) # 記錄 S3 Key 或 URL
                                logger.info(f"Successfully processed file {filename}, S3 ref: {s3_key_or_url}")
                            else:
                                raise Exception(f"S3 upload function returned None for {filename}")
                        except Exception as e:
                            logger.error(f"Error processing/uploading file {filename}: {e}", exc_info=True)
                            # 清理暫存檔案
                            if os.path.exists(temp_path):
                                os.remove(temp_path)
                            return jsonify({"error": f"Failed to process or upload file {filename}"}), 500
                        finally:
                            # 確保刪除暫存檔案
                            if os.path.exists(temp_path):
                                 logger.debug(f"Removing temporary file {temp_path}")
                                 os.remove(temp_path)
                    else:
                        logger.warning(f"File type not allowed: {file.filename}")
                        return jsonify({"error": f"File type not allowed for {file.filename}. Allowed: {ALLOWED_EXTENSIONS}"}), 400
                # else: # 如果 file.filename 是空的，通常是空的文件欄位，可以忽略
                #    logger.debug("Empty file field detected.")

        # 3. 組合 Prompt (調用服務層 - 使用新的 prompt_engine.py)
        colors_list = colors_str.split(',') if colors_str else []
        logger.debug("Calling build_prompt service...")
        prompt = build_prompt(
            style=style,
            lighting=lighting,
            colors=colors_list,
            description=description,
            image_paths=uploaded_image_keys # 傳遞 S3 Keys/URLs 給 prompt 引擎
        )
        logger.info(f"Generated prompt: {prompt[:100]}...") # 只記錄部分 prompt

        # 4. 產生 Request ID 並記錄初始狀態
        request_id = str(uuid.uuid4())
        job_status_store[request_id] = {"status": "processing"} # 初始化狀態
        logger.info(f"Task {request_id} created. Initial status: processing")

        # 5. 觸發背景任務 (調用服務層 - 使用 stub 或 threading)
        logger.debug(f"Starting background thread for trigger_image_generation_task (request_id: {request_id})")
        thread = threading.Thread(target=trigger_image_generation_task,
                                  args=(request_id, prompt, uploaded_image_keys))
        thread.daemon = True
        thread.start()
        logger.info(f"Background task for {request_id} dispatched.")

        # 6. 立即回傳成功提交的回應
        response_data = {
            "status": "succeeded", # 指 API 請求成功提交
            "request_id": request_id,
            "prompt": prompt
        }
        logger.info(f"Responding to POST /api/generate for {request_id} with: {response_data}")
        total_time = time.time() - request_start_time
        logger.info(f"POST /api/generate request for {request_id} processed in {total_time:.4f} seconds.")
        return jsonify(response_data), 200

    except Exception as e:
        # 通用錯誤處理
        logger.error(f"Unhandled error in POST /api/generate: {str(e)}", exc_info=True)
        total_time = time.time() - request_start_time
        logger.info(f"POST /api/generate request failed after {total_time:.4f} seconds.")
        return jsonify({"error": "An internal server error occurred."}), 500


@bp.route("/generate/<string:request_id>", methods=["GET"])
@swag_from({
    "tags": ["Generate"],
    "summary": "Check generation status and get result URL",
    "description": "Poll this endpoint with the request_id obtained from the POST /api/generate request.",
    "parameters": [
        {"name": "request_id", "in": "path", "type": "string", "required": True, "description": "The request ID"}
    ],
    "responses": {
        200: {
            "description": "Current status or final result",
            "schema": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["processing", "succeeded", "failed"], "description": "Current status of the generation task"},
                    "image_url": {"type": "string", "description": "URL of the generated image (only if status is 'succeeded')"},
                    "error": {"type": "string", "description": "Error message (only if status is 'failed')"}
                }
            }
        },
        404: {"description": "Request ID not found"}
    }
})
def get_generation_status(request_id):
    """
    檢查先前提交的生成任務狀態。
    返回當前狀態，如果成功完成則包含結果 URL。
    """
    logger.info(f"Received GET /api/generate/{request_id} request")
    job_info = job_status_store.get(request_id) # 從模擬儲存中獲取狀態

    if not job_info:
        logger.warning(f"Request ID not found: {request_id}")
        return jsonify({"error": "Request ID not found"}), 404

    logger.info(f"Returning status for {request_id}: {job_info}")
    return jsonify(job_info), 200