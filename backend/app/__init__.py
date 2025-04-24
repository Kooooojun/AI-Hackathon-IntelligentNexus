from flask import Flask
from flasgger import Swagger            # ← 新增
from .config import Config
from .routes.generate import bp as generate_bp
from .routes.feedback import bp as feedback_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    swagger_template = {
        "info": {
            "title": "Design-Gen Backend API",
            "description": "Receive design prompts, call image generation, and collect feedback.",
            "version": "1.0.0",
        },
        "schemes": ["http", "https"],
    }

    swagger_config = {
        # ★ 加回 specs，至少放一條預設 json
        "specs": [
            {
                "endpoint": "apispec_1",
                "route": "/apispec_1.json",
                "rule_filter": lambda rule: True,      # 所有路由都進文件
                "model_filter": lambda tag: True,      # 所有模型都進文件
            }
        ],
        "specs_route": "/docs",  # Swagger UI 入口
    }

    Swagger(app, template=swagger_template)

    # …其餘 Blueprint 註冊保持不變 …
    app.register_blueprint(generate_bp, url_prefix="/api")
    app.register_blueprint(feedback_bp, url_prefix="/api")
    return app