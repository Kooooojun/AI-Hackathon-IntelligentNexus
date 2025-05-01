import os

class Config:
    """Application configuration from environment variables."""
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key_please_change')

    # Supabase
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')
    ADMIN_ROLE_NAME = os.environ.get('ADMIN_ROLE_NAME', 'admin')

    # Grok
    GROK_API_KEY = os.environ.get('GROK_API_KEY')
    GROK_VISION_ENDPOINT = os.environ.get('GROK_VISION_ENDPOINT')
    GROK_LLM_ENDPOINT = os.environ.get('GROK_LLM_ENDPOINT')

    # Celery
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', None) # Optional

    # CORS Allowed Origins (Important for security)
    # Example: "http://localhost:5173,https://your-frontend-domain.com"
    ALLOWED_ORIGINS_STR = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173') # Default to common Vite dev port
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(',')]

    # Basic validation
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not SUPABASE_JWT_SECRET:
        raise ValueError("Supabase URL, Service Role Key, and JWT Secret must be set in environment variables.")
    if not GROK_API_KEY or not GROK_VISION_ENDPOINT or not GROK_LLM_ENDPOINT:
        # Allow missing Grok config if only ImageGen is used by worker
        print("Warning: Grok API Key or Endpoints might be missing (needed for Vision/LLM).")