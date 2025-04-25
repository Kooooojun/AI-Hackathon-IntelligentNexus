# backend/app/__init__.py

from flask import Flask
from flasgger import Swagger
from flask_cors import CORS

from .config import Config
from .routes.generate import bp as generate_bp
from .routes.feedback import bp as feedback_bp
# ... 其他可能的 import

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- CORS 設定 (保持不變) ---
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080"]}})
    # --------------------------

    # --- Swagger 設定 ---
    swagger_template = {
        "info": {
            "title": "Design-Gen Backend API",
            "description": "Receive design prompts, call image generation, and collect feedback.",
            "version": "1.0.0",
        },
        "schemes": ["http"], # 本地開發通常是 http
    }

    # *** 在 swagger_config 中加入 headers ***
    swagger_config = {
        "headers": [], # <--- 新增這一行，提供一個空列表
        "specs": [
            {
                "endpoint": "apispec_1",
                "route": "/apispec_1.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs/"
    }
    # ************************************

    # 將 config 傳遞給 Swagger
    Swagger(app, template=swagger_template, config=swagger_config)
    # --------------------

    # --- 註冊 Blueprints (保持不變) ---
    app.register_blueprint(generate_bp, url_prefix="/api")
    app.register_blueprint(feedback_bp, url_prefix="/api")
    # -----------------------

    @app.route('/')
    def index():
        return "Backend API is running. Visit /docs/ for documentation." # 修改路徑

    return app