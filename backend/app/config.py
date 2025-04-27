# src/config.py
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "a-default-secret-key-for-flask")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-jwt-secret")

    # AWS
    AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-1")
    S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
    S3_SIGNED_URL_EXPIRES_IN = int(os.getenv("S3_SIGNED_URL_EXPIRES_IN", "600"))

    # SQLite Database Path
    SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "hackathon_data.db") # Use relative path

    # SQS (Not used in this quick approach)
    # SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL")

    if not S3_BUCKET_NAME:
        raise ValueError("Missing required environment variable: S3_BUCKET_NAME")