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

from typing import Optional, List, Dict, Any # 添加 Optional, List, Dict, Any


# --------------------------------------------------------------------------- #
# 內部工具：取得設定、建立 client
# --------------------------------------------------------------------------- #
def _get_cfg(key: str, default: Optional[str] = None) -> Optional[str]: # <--- 修改返回類型
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
def check_bucket_exists(bucket: Optional[str] = None) -> bool: # <--- 修改類型
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


def upload_file_to_s3(file_path: str, key: str, bucket: Optional[str] = None): # <--- 修改類型
    """
    上傳本機檔案到 S3。
    """
    bucket = bucket or _bucket()
    _s3_client().upload_file(file_path, bucket, key)
    # 你可以在此回傳 S3 URI 或 presigned URL
    return f"s3://{bucket}/{key}"


def download_file_from_s3(key: str, download_path: str, bucket: Optional[str] = None): # <--- 修改類型
    """
    從 S3 下載到指定本機路徑。
    """
    bucket = bucket or _bucket()
    os.makedirs(os.path.dirname(download_path) or ".", exist_ok=True)
    _s3_client().download_file(bucket, key, download_path)
    return download_path


def generate_presigned_url(key: str, expires_in: int = 3600, bucket: Optional[str] = None) -> str: # <--- 修改類型
    """
    產生短效下載連結，預設 1 小時。
    """
    bucket = bucket or _bucket()
    return _s3_client().generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ResponseContentType": "image/png",  # 可選，根據需要調整
            "ResponseContentDisposition": "inline",  # command line 顯示
            },
        ExpiresIn=expires_in,
    )

# feedback.py 會用到的
# --------------------------------------------------------------------------- #
# 追加一筆 JSON 資料到 S3 上的 CSV 檔 (自動建立檔案)                          #
# --------------------------------------------------------------------------- #
import io
import pandas as pd
from datetime import datetime, timezone

def append_row_to_csv_on_s3(data: dict, s3_key: Optional[str] = None):

    """
    1. 下載 (或建立空) feedback.csv → 讀成 DataFrame
    2. 把 `data` + timestamp 轉成一列 append
    3. 以 BytesIO 寫回，再用 upload_fileobj() 上傳 → 完全不落地檔案

    Parameters
    ----------
    data    : 一筆 JSON dict，欄位不限
    s3_key  : S3 物件 key；預設抓 FEEDBACK_TABLE_S3_KEY
    """
    bucket = _bucket()
    s3_key = s3_key or _get_cfg("FEEDBACK_TABLE_S3_KEY", "metadata/feedback.csv")

    # ---------- 1. 下載 (或建立空 DataFrame) ----------
    try:
        obj = _s3_client().get_object(Bucket=bucket, Key=s3_key)
        df = pd.read_csv(io.BytesIO(obj["Body"].read()))
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            df = pd.DataFrame()   # S3 上沒有檔 → 建立空表
        else:
            raise

    # ---------- 2. 新增一列 ----------
    data_with_ts = data.copy()
    data_with_ts["timestamp"] = (
        datetime.now(timezone.utc).isoformat(timespec="seconds")
    )
    df = pd.concat([df, pd.DataFrame([data_with_ts])], ignore_index=True)

    # ---------- 3. 上傳回 S3 ----------
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    _s3_client().upload_fileobj(buf, bucket, s3_key)