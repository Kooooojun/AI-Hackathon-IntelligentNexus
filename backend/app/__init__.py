# backend/app/__init__.py

from flask import Flask, jsonify # 添加 jsonify
from flasgger import Swagger
from flask_cors import CORS
import logging # 添加 logging

from .config import Config
# --- 導入所有需要的 Blueprints ---
from .routes.generate import bp as generate_bp
# from .routes.feedback import bp as feedback_bp # Feedback 功能已整合到 designs_bp
from .routes.jobs import jobs_bp            # 新增：處理 Job 狀態
from .routes.images import images_bp         # 新增：處理 Image URL
from .routes.designs import designs_bp       # 新增：處理 Save/Feedback

# --- 導入資料庫初始化函數 (假設在 src/database.py) ---
try:
    from . import init_db
    db_initialized = True
except ImportError:
    logging.warning("Database module or init_db function not found. Skipping DB initialization.")
    db_initialized = False
# --------------------------------------------------

# --- 基礎日誌設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)-7s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)
# --------------------


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    logger.info(f"Flask app created with config: {config_class.__name__}")
    if app.config['DEBUG']:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Debug mode enabled.")

    # --- 初始化資料庫 ---
    # 在應用上下文中執行，或者如果你的 DB 設置不同，調整此處
    with app.app_context():
        if db_initialized:
            try:
                init_db() # 確保表格存在
            except Exception as e:
                 logger.error(f"Database initialization failed: {e}", exc_info=True)
        else:
            logger.warning("Skipping database initialization.")
    # --------------------

    # --- CORS 設定 ---
    # 為了方便開發/黑客松，暫時允許所有來源，生產環境務必收緊！
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    logger.info("CORS configured to allow all origins for /api/*.")
    # -----------------

    # --- Swagger 設定 ---
    swagger_template = {
        "info": {
            "title": "AI Designer Backend API",
            "description": "API for generating initial designs and multi-level variants, checking job status, retrieving images, and saving designs/feedback.",
            "version": "2.0.0", # 更新版本號
        },
        "schemes": ["http", "https"], # 添加 https
        "basePath": "/api", # 建議設置 API 基礎路徑
        "consumes": ["application/json", "multipart/form-data"],
        "produces": ["application/json"],
    }
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/apispec_1.json',
                "rule_filter": lambda rule: True, # all in
                "model_filter": lambda tag: True, # all in
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs/" # API 文件路徑
    }
    Swagger(app, template=swagger_template, config=swagger_config)
    logger.info(f"Swagger UI configured at {swagger_config['specs_route']}")
    # --------------------

    # --- 註冊 Blueprints ---
    app.register_blueprint(generate_bp, url_prefix='/api/generate') # POST /, POST /variants
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')         # GET /<jobId>/status
    app.register_blueprint(images_bp, url_prefix='/api/images')       # GET /<imageId>/url
    app.register_blueprint(designs_bp, url_prefix='/api/designs')     # POST /save, POST /feedback
    logger.info("Blueprints registered: generate, jobs, images, designs")
    # -----------------------

    # --- 基礎根路由 ---
    @app.route('/')
    def index():
        # 提供 API 文檔鏈接
        return f"AI Designer Backend API is running. Visit <a href='{swagger_config['specs_route']}'>{swagger_config['specs_route']}</a> for API documentation."

    # --- 全局錯誤處理器 (範例) ---
    @app.errorhandler(Exception)
    def handle_exception(e):
        # 記錄完整錯誤堆疊
        logger.error(f"An unhandled exception occurred: {e}", exc_info=True)
        # 在生產環境中，避免返回詳細錯誤訊息
        response = jsonify(message="An internal server error occurred.")
        # 嘗試獲取 HTTP 錯誤代碼，否則默認為 500
        code = getattr(e, 'code', 500)
        # 確保返回的是有效的 HTTP 狀態碼
        response.status_code = code if isinstance(code, int) and 100 <= code <= 599 else 500
        return response

    return app