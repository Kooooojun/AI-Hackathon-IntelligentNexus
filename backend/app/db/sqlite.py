# src/database.py
import sqlite3
import logging
import json
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timezone
from ..config import Config
from ..services.api.types import GeneratedImage, JobStatus, DesignParameters # 導入類型

logger = logging.getLogger(__name__)
DB_FILE = Path(Config.SQLITE_DB_PATH).resolve()

def get_db():
    """ 獲取資料庫連接 """
    try:
        # 檢查目錄是否存在
        DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_FILE), timeout=10) # 設置超時
        conn.row_factory = sqlite3.Row # 返回字典形式的行
        logger.debug("Database connection established.")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {e}", exc_info=True)
        raise

def init_db():
    """ 初始化資料庫表格 """
    try:
        conn = get_db()
        cursor = conn.cursor()
        # 創建 Jobs 表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            parent_id TEXT, -- For variants
            parameters TEXT, -- Store as JSON string
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)
        # 創建 Images 表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS images (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            parent_id TEXT, -- For variants
            s3_bucket TEXT NOT NULL,
            s3_key TEXT NOT NULL UNIQUE,
            parameters TEXT, -- Store as JSON string
            is_saved INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
            created_at TEXT NOT NULL
        )
        """)
        # 創建 Feedback 表 (示例)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            image_id TEXT NOT NULL,
            rating TEXT NOT NULL, -- 'up' or 'down'
            created_at TEXT NOT NULL
        )
        """)
        conn.commit()
        logger.info("Database initialized successfully.")
    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

def db_execute(sql: str, params: tuple = (), fetchone=False, fetchall=False, commit=False):
    """ 執行 SQL 語句的輔助函數 """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        if commit:
            conn.commit()
            logger.debug(f"Executed COMMIT for SQL: {sql[:50]}...")
            return cursor.lastrowid # 或受影響行數
        if fetchone:
            result = cursor.fetchone()
            return dict(result) if result else None
        if fetchall:
            results = cursor.fetchall()
            return [dict(row) for row in results]
        return None # For non-query commands without commit
    except sqlite3.Error as e:
        logger.error(f"Database query error executing: {sql[:100]}... with params: {params}. Error: {e}", exc_info=True)
        if conn and commit:
            conn.rollback() # 回滾事務
        raise # Re-raise the exception
    finally:
        if conn:
            conn.close()
            logger.debug("Database connection closed.")

# --- Job 操作 ---
async def create_job(user_id: str, job_id: str, parameters: dict, parent_id: Optional[str] = None) -> str:
    now = datetime.now(timezone.utc).isoformat()
    params_json = json.dumps(parameters) if parameters else None
    sql = """
    INSERT INTO jobs (id, user_id, status, parameters, parent_id, created_at, updated_at)
    VALUES (?, ?, 'pending', ?, ?, ?, ?)
    """
    db_execute(sql, (job_id, user_id, params_json, parent_id, now, now), commit=True)
    logger.info(f"DB: Job {job_id} created for user {user_id}, parent: {parent_id}")
    return job_id

async def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    sql = "SELECT id, user_id, status, parent_id, error FROM jobs WHERE id = ?"
    job = db_execute(sql, (job_id,), fetchone=True)
    logger.debug(f"DB: Fetched job {job_id}: {'Found' if job else 'Not Found'}")
    return job

async def update_job_status(job_id: str, status: JobStatus, error: Optional[str] = None):
    now = datetime.now(timezone.utc).isoformat()
    sql = "UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?"
    db_execute(sql, (status, error, now, job_id), commit=True)
    logger.info(f"DB: Job {job_id} status updated to {status}")

# --- Image 操作 ---
async def save_image_metadata(
    image_id: str, user_id: str, job_id: str, s3_bucket: str, s3_key: str,
    parameters: Optional[DesignParameters] = None, parent_id: Optional[str] = None
):
    now = datetime.now(timezone.utc).isoformat()
    params_json = json.dumps(parameters) if parameters else None
    sql = """
    INSERT INTO images (id, user_id, job_id, parent_id, s3_bucket, s3_key, parameters, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    db_execute(sql, (image_id, user_id, job_id, parent_id, s3_bucket, s3_key, params_json, now), commit=True)
    logger.info(f"DB: Metadata saved for image {image_id}")

async def get_images_for_job(job_id: str) -> List[GeneratedImage]:
    sql = "SELECT id, parent_id as parentId, parameters FROM images WHERE job_id = ?" # Alias parent_id
    images_raw = db_execute(sql, (job_id,), fetchall=True)
    images = []
    for img_raw in images_raw:
        params = json.loads(img_raw['parameters']) if img_raw['parameters'] else None
        images.append({
            "id": img_raw['id'],
            "parentId": img_raw['parentId'],
            "parameters": params,
        })
    logger.debug(f"DB: Fetched {len(images)} images for job {job_id}")
    return images

async def get_image_metadata(image_id: str) -> Optional[GeneratedImage]:
    sql = """
    SELECT id, user_id, job_id, parent_id as parentId, s3_bucket, s3_key, parameters, is_saved, created_at
    FROM images WHERE id = ?
    """
    img_raw = db_execute(sql, (image_id,), fetchone=True)
    if img_raw:
        params = json.loads(img_raw['parameters']) if img_raw['parameters'] else None
        logger.debug(f"DB: Found metadata for image {image_id}")
        # 將 is_saved 從 0/1 轉為 boolean
        is_saved_bool = bool(img_raw['is_saved'])
        return {
            "id": img_raw['id'], "user_id": img_raw['user_id'], "job_id": img_raw['job_id'],
            "parentId": img_raw['parentId'], "s3_bucket": img_raw['s3_bucket'], "s3_key": img_raw['s3_key'],
            "parameters": params, "is_saved": is_saved_bool, "created_at": img_raw['created_at']
        }
    logger.debug(f"DB: Metadata not found for image {image_id}")
    return None

# --- Design Saving & Feedback ---
async def save_design(user_id: str, image_id: str) -> bool:
    # Check if image exists and belongs to user first (optional but good)
    img_meta = await get_image_metadata(image_id)
    if not img_meta or img_meta.get('user_id') != user_id:
        logger.warning(f"DB: Save failed. Image {image_id} not found or user {user_id} mismatch.")
        return False # Or raise specific error

    sql = "UPDATE images SET is_saved = 1 WHERE id = ? AND user_id = ?"
    try:
        # db_execute returns lastrowid or rowcount, check if update happened
        # For SQLite, checking changes() might be better via connection directly
        db_execute(sql, (image_id, user_id), commit=True)
        # Here we assume it worked if no exception, a more robust check is needed in real app
        logger.info(f"DB: Design {image_id} marked as saved for user {user_id}.")
        return True
    except Exception as e:
         logger.error(f"DB: Failed to save design {image_id} for user {user_id}: {e}", exc_info=True)
         return False


async def record_feedback(user_id: str, job_id: str, image_id: str, rating: str) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    sql = "INSERT INTO feedback (user_id, job_id, image_id, rating, created_at) VALUES (?, ?, ?, ?, ?)"
    try:
        db_execute(sql, (user_id, job_id, image_id, rating, now), commit=True)
        logger.info(f"DB: Feedback recorded for image {image_id}.")
        return True
    except Exception as e:
        logger.error(f"DB: Failed to record feedback for {image_id}: {e}", exc_info=True)
        return False