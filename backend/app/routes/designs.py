# backend/app/routes/designs.py (修正版)
from flask import Blueprint
from ..controllers import designs 
from app.middleware.auth import token_required # 導入認證 (假設路徑正確)
import asyncio

# 定義 Blueprint
designs_bp = Blueprint('designs_api', __name__)

# --- 路由定義 ---
# POST /api/designs/save (url_prefix 在 __init__.py 中定義)
@designs_bp.post('/save') # 路由是相對於 url_prefix 的
@token_required
async def save_design():
    # 調用 controller 中的函數
    return await designs.save_design_controller()

# POST /api/designs/feedback (url_prefix 在 __init__.py 中定義)
@designs_bp.post('/feedback')
@token_required
async def submit_feedback():
     # 調用 controller 中的函數
    return await designs.submit_feedback_controller()

# 你可能還需要其他路由，例如:
# @bp.delete('/save/<string:imageId>')
# @token_required
# async def unsave_design(imageId: str):
#     # return await designs_controller.unsave_design_controller(imageId)
#     pass