# backend/app/routes/images.py (最終修正版)
import logging
from flask import Blueprint, jsonify
# 導入對應的 Controller 函數
from app.controllers import images # 確保導入 controller
# 導入認證裝飾器
from app.middleware.auth import token_required
# 導入 asyncio
import asyncio

logger = logging.getLogger(__name__)
images_bp = Blueprint('images_api', __name__) # 確保 Blueprint 名稱正確

# --- 路由定義 ---

# GET /api/images/<imageId>/url
@images_bp.get("/<string:imageId>/url")
@token_required
def get_image_signed_url(imageId: str):
    """Get Pre-signed URL for a specific image
    Retrieves a temporary, pre-signed URL allowing access to a private image object in S3.
    ---
    tags:
      - Images
    security:
      - BearerAuth: [] # 假設在 __init__.py 中定義了 BearerAuth security scheme
    parameters:
      - name: imageId
        in: path
        type: string
        required: true
        description: The unique ID of the image.
      - name: Authorization # 明確定義 Header
        in: header
        type: string
        required: true
        description: Bearer token for authentication (e.g., 'Bearer your_token').
    responses:
      '200': # 狀態碼加引號
        description: Signed URL d successfully.
        content: # 使用 content 和 application/json
          application/json:
            schema: # <--- 這裡直接定義 Schema，而不是用 $ref --->
              type: object
              properties:
                signedUrl:
                  type: string
                  description: The temporary pre-signed URL for the image.
                  example: "https://your-bucket.s3.amazonaws.com/image.jpg?AWSAccessKeyId=..."
                imageId:
                  type: string
                  description: The ID of the image corresponding to the URL.
                  example: "some-image-id-123"
              required:
                 - signedUrl
                 - imageId
      '401':
        description: Authentication required or invalid token.
        content:
          application/json:
            schema:
              type: object
              properties:
                message: # 修改這裡的縮排和結構
                  type: string
                  example: "Authentication Token is missing!" # example 值用引號括起來
      '403':
        description: Forbidden, user cannot access this image.
        content:
          application/json:
            schema:
              type: object
              properties:
                message: # 修改這裡的縮排和結構
                  type: string
                  example: "Forbidden: Cannot access this image." # example 值用引號括起來
      '404':
        description: Image ID not found.
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string, example: Image not found. }
      '500':
        description: Internal server error.
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string, example: Failed to get signed URL. }
    """
    logger.info(f"Route: GET /api/images/{imageId}/url")
    # 調用異步 Controller 函數
    # 確認 images_controller 有 get_image_signed_url_controller
    return asyncio.run(images.get_image_signed_url_controller(imageId))

# 你可以在這裡添加其他與 Image 相關的路由