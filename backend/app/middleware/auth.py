# backend/app/middleware/auth.py

import logging
from functools import wraps
from flask import request, jsonify, g, current_app
from typing import Optional, Dict, Any # 添加導入
# 如果你使用 PyJWT，需要導入它: pip install PyJWT
# import jwt

logger = logging.getLogger(__name__)

# --- 實際的 Token 驗證邏輯 ---
# !!! 你需要替換這個函數的內容 !!!
def validate_token(token: str) -> Optional[Dict[str, Any]]:
    """
    驗證傳入的 Token 並返回用戶信息字典，如果無效則返回 None。
    你需要根據你的認證方式 (JWT, Session, OAuth 等) 來實現這個函數。
    """
    logger.debug(f"Validating token: {token[:10]}...") # 只記錄部分 token

    # --- 範例：使用 PyJWT ---
    # try:
    #     # 從 Flask app config 獲取密鑰
    #     secret = current_app.config['JWT_SECRET_KEY']
    #     # 解碼和驗證 JWT (算法通常是 HS256)
    #     payload = jwt.decode(token, secret, algorithms=["HS256"])
    #     # 從 payload 中獲取用戶 ID (通常在 'sub' 或 'identity' 字段)
    #     user_id = payload.get('sub') or payload.get('identity')
    #     if not user_id:
    #         logger.warning("Token payload missing user identifier ('sub' or 'identity').")
    #         return None
    #
    #     # (可選) 根據 user_id 從數據庫獲取更詳細的用戶信息
    #     # user = database.get_user_by_id(user_id)
    #     # if not user:
    #     #     logger.warning(f"User ID {user_id} from token not found in database.")
    #     #     return None
    #
    #     logger.info(f"Token validated successfully for user ID: {user_id}")
    #     # 返回包含用戶標識符和其他需要的信息的字典
    #     return {'id': user_id, 'username': payload.get('username', 'N/A')} # 根據你的 payload 調整
    #
    # except jwt.ExpiredSignatureError:
    #     logger.warning("Token has expired.")
    #     return None
    # except jwt.InvalidTokenError as e:
    #     logger.warning(f"Invalid token: {e}")
    #     return None
    # except Exception as e:
    #     logger.error(f"Unexpected error during token validation: {e}", exc_info=True)
    #     return None
    # --- 結束 PyJWT 範例 ---


    # --- Hackathon 佔位符邏輯 ---
    # 為了快速測試，暫時接受一個固定的 token
    valid_token = "valid-token-user-123" # 與你的測試工具中使用的 Token 一致
    simulated_user_id = "user-123-py"    # 模擬的用戶 ID

    if token == valid_token:
        logger.info(f"Placeholder validation successful for token: {token[:10]}...")
        return {'id': simulated_user_id, 'username': 'mock_user'}
    else:
        logger.warning(f"Placeholder validation failed for token: {token[:10]}...")
        return None
    # --- ---------------------- ---

# --- Token Required 裝飾器 ---
def token_required(f):
    """
    一個 Flask 路由裝飾器，用於驗證 Authorization Header 中的 Bearer Token。
    如果驗證成功，會將用戶信息附加到 Flask 的全局對象 `g.user`。
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization') # 使用 .get() 更安全

        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            else:
                logger.warning(f"Invalid Authorization header format: {auth_header}")
                return jsonify({'message': 'Invalid Authorization header format. Use Bearer token.'}), 401
        else:
             logger.warning("Authorization header is missing.")
             return jsonify({'message': 'Authentication Token is missing!'}), 401

        if not token: # 雖然上面的邏輯會處理，但再檢查一次
             return jsonify({'message': 'Authentication Token is missing!'}), 401

        # 調用實際的驗證邏輯
        user_info = validate_token(token)

        if user_info is None:
            logger.warning("Token validation failed.")
            return jsonify({'message': 'Invalid or expired Token.'}), 401

        # 將驗證通過的用戶信息存儲在 Flask 的請求上下文 g 中
        g.user = user_info
        logger.debug(f"User attached to g: {g.user}")

        # 執行被裝飾的路由函數
        return f(*args, **kwargs)

    return decorated_function