import boto3
import os
from dotenv import load_dotenv

load_dotenv()  # 載入 .env 檔案中的變數

# 初始化 S3 client
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

# 上傳函式
def upload_file_to_s3(file_path, key):
    bucket = os.getenv('S3_BUCKET_NAME')
    print(f"🧭 正在上傳到 bucket: {bucket}")
    print(f"📍 Region 設定為: {os.getenv('AWS_REGION')}")
    s3.upload_file(file_path, bucket, key)
    print(f"✅ 檔案已上傳至 s3://{bucket}/{key}")

def check_bucket_exists():
    bucket = os.getenv("S3_BUCKET_NAME")
    try:
        s3.head_bucket(Bucket=bucket)
        print(f"✅ Bucket '{bucket}' 存在")
    except Exception as e:
        print(f"❌ Bucket '{bucket}' 不存在或權限錯誤：{e}")
