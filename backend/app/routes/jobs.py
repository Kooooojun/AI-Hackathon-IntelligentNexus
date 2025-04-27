# backend/app/routes/jobs.py
import logging
from flask import Blueprint, jsonify
# 導入對應的 Controller 函數
# 使用絕對導入，假設你的運行環境能找到 app 包
from ..controllers import jobs
# 導入認證裝飾器
from app.middleware.auth import token_required

logger = logging.getLogger(__name__)

# 定義 Blueprint
# 'jobs_api' 是 Blueprint 的名稱，__name__ 幫助 Flask 找到模板等資源
# url_prefix 會在 app/__init__.py 中設定為 /api/jobs
jobs_bp = Blueprint('jobs_api', __name__)

# --- 路由定義 ---

# GET /api/jobs/<jobId>/status
@jobs_bp.get("/<string:jobId>/status") # 使用 Flask 提供的裝飾器簡寫
@token_required # 應用身份驗證
async def get_job_status(jobId: str):
    """
    處理獲取特定 Job 狀態的請求
    ---
    tags:
      - Jobs
    parameters:
      - name: jobId
        in: path
        type: string
        required: true
        description: The ID of the job to check.
      - name: Authorization
        in: header
        type: string
        required: true
        description: Bearer token for authentication. Example 'Bearer your_token'.
    responses:
      200:
        description: Job status returned successfully (including image metadata if succeeded).
        schema:
          $ref: '#/definitions/JobStatusResponse' # 假設你在 Swagger 中定義了這個類型
      401:
        description: Authentication required or invalid token.
      403:
        description: Forbidden, user cannot access this job.
      404:
        description: Job ID not found.
      500:
        description: Internal server error.
    """
    logger.info(f"Route: GET /api/jobs/{jobId}/status")
    # 直接調用異步 Controller 函數 (需要 Flask 2.0+ 或 ASGI 伺服器支持)
    # 如果使用 Flask < 2.0 或 WSGI 伺服器 (如 Gunicorn 默認)，
    # 你可能需要使用 `asyncio.run()` 或 Flask-Executor 等工具來運行異步函數
    # 但現代 Flask 通常可以直接 await
    return await jobs_controller.get_job_status_controller(jobId)

# 你可以在這裡添加其他與 Job 相關的路由，例如 GET /api/jobs/ (列出用戶的 jobs) 等