# backend/app/__init__.py

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from celery import Celery, Task
from werkzeug.exceptions import HTTPException
from flasgger import Swagger

from .config import Config
# from .utils.logger import setup_logging # Example: Uncomment if using custom logging setup

# --- Celery Initialization ---
# Instantiate Celery immediately so worker can import it
celery_app = Celery(__name__, broker=Config.CELERY_BROKER_URL)
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# --- App Factory Function ---
def create_app():
    """Flask application factory."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # --- Logging Setup (Example) ---
    # You might want to configure logging level based on environment
    log_level = logging.DEBUG if app.debug else logging.INFO
    logging.basicConfig(level=log_level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logging.getLogger("werkzeug").setLevel(logging.WARNING) # Quieten Werkzeug logs
    app.logger.info(f"Flask app created with environment: {Config.FLASK_ENV}")
    # setup_logging(log_level) # Or call your custom setup function

    # --- Initialize Extensions ---
    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": Config.ALLOWED_ORIGINS}})
    app.logger.info(f"CORS configured for origins: {Config.ALLOWED_ORIGINS}")

    # Initialize Flasgger for Swagger UI
    swagger_config = Swagger.DEFAULT_CONFIG
    swagger_config['info'] = {
        'title': 'My Image Generation API',
        'version': '1.0.0',
        'description': 'API endpoints for the generation service'
    }
    swagger_config['specs_route'] = "/apidocs/"
    # Example: Define Bearer Authentication for Swagger UI
    swagger_config['securityDefinitions'] = {
        "bearerAuth": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
        }
    }
    Swagger(app, config=swagger_config)
    app.logger.info(f"Flasgger configured, UI available at {swagger_config['specs_route']}")

    # Initialize Supabase client connection context
    from .db.supabase_client import init_supabase
    init_supabase(app) # Sets up teardown context if needed

    # --- Register Blueprints ---
    # Import the blueprints correctly from the routes package
    try:
        from .routes import generate_bp, auth_bp
        app.register_blueprint(generate_bp, url_prefix='/api')
        app.register_blueprint(auth_bp, url_prefix='/api')
        app.logger.info("Registered blueprints: generate, auth")
    except ImportError as e:
        app.logger.error(f"Failed to import or register blueprints: {e}. Ensure routes/generate.py and routes/auth.py exist and define blueprints.", exc_info=True)
        raise e # Re-raise error to stop app creation if blueprints are critical

    # Apply Flask config updates to Celery
    celery_app.conf.update(app.config)
    app.logger.info("Celery configuration updated from Flask config.")

    # --- Register Error Handlers ---
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Return JSON instead of HTML for HTTP errors."""
        # Log the error
        app.logger.warning(f"HTTP Exception Caught: {e.code} {e.name} - {e.description}")
        response = e.get_response()
        response.data = jsonify({
            "code": e.code,
            "name": e.name,
            "error": e.description,
        }).get_data(as_text=True)
        response.content_type = "application/json"
        return response

    @app.errorhandler(Exception)
    def handle_general_exception(e):
        """Handle unexpected errors."""
        app.logger.error(f"Unhandled Exception: {e}", exc_info=True)
        return jsonify({"error": "An unexpected internal server error occurred."}), 500
    app.logger.info("Registered custom error handlers.")

    # --- Root Route ---
    @app.route('/')
    def index():
        # Returns a simple HTML welcome page with a link to apidocs
        html_content = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Status</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; padding: 2em; background-color: #f8f9fa; color: #343a40; }
                .container { max-width: 700px; margin: 2em auto; background-color: #ffffff; padding: 2em; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
                h1 { color: #0056b3; margin-bottom: 0.5em; }
                p { margin-bottom: 1em; }
                a { color: #007bff; text-decoration: none; font-weight: bold; padding: 0.5em 1em; border: 1px solid #007bff; border-radius: 4px; transition: all 0.3s ease; }
                a:hover { background-color: #007bff; color: #ffffff; text-decoration: none; }
                .status { font-weight: bold; color: #28a745; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Image Generation API</h1>
                <p>服務狀態: <span class="status">運行中</span></p>
                <p>歡迎使用本 API 服務！您可以透過以下連結查看詳細的 API 文件 (Swagger UI)。</p>
                <p><a href="/apidocs/">查看 API 文件 (/apidocs/)</a></p>
            </div>
        </body>
        </html>
        """
        return html_content

    return app

