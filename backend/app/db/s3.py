"""
S3 helper functions
-------------------
整合上傳 / 下載 / Bucket 檢查，供 routes 與 service 模組呼叫。
"""

import os
from functools import lru_cache

import boto3
from botocore.exceptions import ClientError
from flask import current_app


# --------------------------------------------------------------------------- #
# 內部工具：取得設定、建立 client
# --------------------------------------------------------------------------- #
def _get_cfg(key: str, default: str | None = None) -> str | None:
    """
    先從 Flask app.config 取值；若沒有再回退環境變數。
    """
    if current_app:
        val = current_app.config.get(key)
        if val is not None:
            return val
    return os.getenv(key, default)


@lru_cache
def _s3_client():
    """
    使用 LRU cache，整個進程只建一次 client。
    """
    return boto3.client(
        "s3",
        aws_access_key_id=_get_cfg("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=_get_cfg("AWS_SECRET_ACCESS_KEY"),
        region_name=_get_cfg("AWS_REGION", "us-east-1"),
    )


def _bucket() -> str:
    """
    取得預設 Bucket 名稱，若沒設定直接拋錯方便偵錯。
    """
    bucket = _get_cfg("S3_BUCKET_NAME")
    if not bucket:
        raise RuntimeError("S3_BUCKET_NAME not configured")
    return bucket


# --------------------------------------------------------------------------- #
# 對外 API
# --------------------------------------------------------------------------- #
def check_bucket_exists(bucket: str | None = None) -> bool:
    """
    確認 Bucket 是否存在且憑證有權限。
    """
    bucket = bucket or _bucket()
    try:
        _s3_client().head_bucket(Bucket=bucket)
        return True
    except ClientError as e:
        # 可視情況記錄 log
        raise RuntimeError(f"Bucket '{bucket}' 不存在或權限不足: {e}")


def upload_file_to_s3(file_path: str, key: str, bucket: str | None = None):
    """
    上傳本機檔案到 S3。
    """
    bucket = bucket or _bucket()
    _s3_client().upload_file(file_path, bucket, key)
    # 你可以在此回傳 S3 URI 或 presigned URL
    return f"s3://{bucket}/{key}"


def download_file_from_s3(key: str, download_path: str, bucket: str | None = None):
    """
    從 S3 下載到指定本機路徑。
    """
    bucket = bucket or _bucket()
    os.makedirs(os.path.dirname(download_path) or ".", exist_ok=True)
    _s3_client().download_file(bucket, key, download_path)
    return download_path


def generate_presigned_url(key: str, expires_in: int = 3600, bucket: str | None = None) -> str:
    """
    產生短效下載連結，預設 1 小時。
    """
    bucket = bucket or _bucket()
    return _s3_client().generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )