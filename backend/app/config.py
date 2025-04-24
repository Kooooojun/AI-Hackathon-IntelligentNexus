import os
from dotenv import load_dotenv
load_dotenv()          # 讀取 .env

class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-1")
    SAGEMAKER_ENDPOINT = os.getenv("SAGEMAKER_ENDPOINT", "")
