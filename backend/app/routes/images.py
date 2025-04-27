# backend/app/routes/images.py
import logging
from flask import Blueprint, jsonify
# 導入對應的 Controller 函數
from ..controllers import images
# 導入認證裝飾器
from ..middleware.auth import token_required

logger = logging.getLogger(__name__)
import asyncio


# 定義 Blueprint
# url_prefix 會在 app/__init__.py 中設定為 /api/images
images_bp = Blueprint('images_api', __name__)

# --- 路由定義 ---

# GET /api/images/<imageId>/url
@images_bp.get("/<string:imageId>/url") # 簡寫
@token_required # 應用身份驗證
def get_image_signed_url(imageId: str):
    """
    處理獲取特定圖片預簽名 URL 的請求
    ---
    tags:
      - Images
    parameters:
      - name: imageId
        in: path
        type: string
        required: true
        description: The ID of the image to get the URL for.
      - name: Authorization
        in: header
        type: string
        required: true
        description: Bearer token for authentication. Example 'Bearer your_token'.
    responses:
      200:
        description: Signed URL generated successfully.
        schema:
          $ref: '#/definitions/SignedUrlResponse' # 假設你在 Swagger 中定義了這個類型
      401:
        description: Authentication required or invalid token.
      403:
        description: Forbidden, user cannot access this image.
      404:
        description: Image ID not found.
      500:
        description: Internal server error (e.g., failed to get metadata or generate URL).
    """
    logger.info(f"Route: GET /api/images/{imageId}/url")
    # 調用異步 Controller 函數
    
    return asyncio.run(images.get_image_signed_url_controller())

# 你可以在這裡添加其他與 Image 相關的路由，例如 GET /api/images/{imageId}/metadata 等