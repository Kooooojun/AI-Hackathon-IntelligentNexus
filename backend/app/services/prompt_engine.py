import os
import io
import boto3, json, secrets

MAX_TITAN_LEN = 512                 # Titan 上限
TARGET_LEN    = 300                 # 壓縮後目標
def extract_image_features(image_paths):
    """
    暫時只是回傳檔名清單。未來可替換為 image-to-text 模型。
    """
    # TODO: Replace with real model (e.g., BLIP, MiniGPT-4)
    return [f"reference image: {os.path.basename(path)}" for path in image_paths]

def build_prompt(style, lighting, colors, description, image_paths=None):
    """
    將使用者輸入組合為一段清楚、具風格的 prompt。
    """
    prompt_parts = []
    #prompt_parts.append("Create a photo of a product with the following features:")

    # 1.設計風格 + 燈效
    if style:
        prompt_parts.append(f"Design style: {style}")
    if lighting:
        prompt_parts.append(f"Lighting: {lighting}")

    # 2.顏色
    if colors:
        #color_str = ", ".join(colors)
        prompt_parts.append(f"Color scheme: {colors}")

    # 3. 使用者文字描述
    if description:
        prompt_parts.append(f"Description: {description}")

    # 4. 圖片描述（stub）
    if image_paths:
        image_descriptions = extract_image_features(image_paths)
        prompt_parts.append(f"The image should be similar to: {', '.join(image_descriptions)}")
    
    # 5.KEYWORDS
    keywords = find_matching_keywords(style, lighting, colors)
    prompt_parts.append(f"Keywords: {keywords}")

    # 組合成單一段落
    prompt = " | ".join(prompt_parts)

    # print("==== RAW prompt ({0} chars) ====\n{1}".format(len(prompt), prompt))

    # print(f"Prompt {len(prompt)} chars > {MAX_TITAN_LEN}, compressing…")
    # ---------- 若過長，自動壓縮 ----------
    if len(prompt) > MAX_TITAN_LEN:

        prompt = _compress_with_sonnet(prompt)

        # print("==== COMPRESSED prompt ({0} chars) ====\n{1}".format(len(prompt), prompt))

        # print(f"Compressed to {len(prompt)} chars")
    # -------------------------------------

    prompt = prompt + ", full product shot, straight-on, no crop"
    # print(f"\n\nFinal prompt {len(prompt)} chars \n\n")
    return prompt

# --- 查詢 Product_table.csv ------------------------------------------------
import pandas as pd
from functools import lru_cache


@lru_cache(maxsize=1)
def _load_product_table():
    """
    只讀一次 CSV，之後從快取拿，減少 I/O
    預設尋找 backend 根目錄下的 data/Product_table.csv
    """
    csv_path = os.path.join(os.path.dirname(__file__), "..","..", "..", "data", "Product_table.csv")
    csv_path = os.path.abspath(csv_path)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Product_table.csv not found at {csv_path}")
    return pd.read_csv(csv_path)


def find_matching_keywords(style=None, lighting=None, colors=None):
    """
    根據輸入條件回傳符合的 Case_id 清單
    - style / lighting：模糊比對 (contains, 不分大小寫)
    - colors：只要 color 欄位有任一指定顏色字串即算匹配
    """
    df = _load_product_table()

    # 建立布林遮罩
    mask = pd.Series(True, index=df.index)

    if style:
        style_mask = df["style"].astype(str).str.contains(style, case=False, na=False)
        if style_mask.any():
            mask &= style_mask

    if lighting:
        lighting_mask = df["lightning"].astype(str).str.contains(lighting, case=False, na=False)
        if lighting_mask.any():
            mask &= lighting_mask

    if colors:
        # colors 可能是 list 或逗號字串
        if isinstance(colors, str):
            colors = [c.strip() for c in colors.split(",")]
        color_regex = "|".join([c for c in colors if c])

        # 預先檢查是否有任何 color 欄位 match 的值
        color_matched = df["color"].astype(str).str.contains(color_regex, case=False, na=False)
        if color_matched.any():
            mask &= color_matched

     # 把所有 keyword 字串拆解成單一特徵 set，再合併為唯一集合
    keyword_series = df.loc[mask, "cm_keywords"].dropna()
    unique_features = set()
    for keywords in keyword_series:
        features = [kw.strip() for kw in keywords.split(",")]
        unique_features.update(features)

    # 回傳去重後組合的一句話（也可以回傳 list）
    return ", ".join(sorted(unique_features))
# -------------------------------------------------------------------------------

# # 測試用
# keywords = build_prompt(
#     style="Futuristic",
#     lighting="Yes",                   # 可部分字串，如 "RGB" 就能匹配 "RGB_neon"
#     colors= "Black",    # list 或逗號字串都行
#     description="A sleek, modern design with a touch of elegance."
# )
# print   (f"{keywords}")

from botocore.exceptions import ClientError

# === 🔧 只要補上這段就能解決 NameError =========================
import logging
from flask import current_app
from ..db.s3 import _get_cfg             # 從 s3 helper 直接拿

logger = logging.getLogger(__name__)       # 若檔案裡還沒有 logger

def _product_s3_key() -> str | None:
    """
    取 S3 上 Product_table.csv 的 object key
    1. 先看 Flask app.config["PRODUCT_TABLE_S3_KEY"]
    2. 再看環境變數 PRODUCT_TABLE_S3_KEY
    3. 都沒有就回 None
    """
    if current_app:
        v = current_app.config.get("PRODUCT_TABLE_S3_KEY")
        if v:
            return v
    return os.getenv("PRODUCT_TABLE_S3_KEY")
# =================================================================

@lru_cache(maxsize=1)
def _load_product_table():
    """
    從 S3 直接串流讀取 Product_table.csv → DataFrame
    若 S3 無設定或取檔失敗，才退回本地 data/Product_table.csv
    """
    s3_key = _product_s3_key()      # 同前；沒設就回 None
    bucket = os.getenv("S3_BUCKET_NAME")

    if s3_key and bucket:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=_get_cfg("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=_get_cfg("AWS_SECRET_ACCESS_KEY"),
            region_name=_get_cfg("AWS_REGION", "us-east-1"),
        )
        try:
            obj = s3.get_object(Bucket=bucket, Key=s3_key)
            stream = io.BytesIO(obj["Body"].read())   # 直接進記憶體
            return pd.read_csv(stream)
        except ClientError as e:
            # 這裡只記 log，不直接 raise，讓程式有 fallback
            logger.warning(f"⚠️  S3 get_object failed ({bucket}/{s3_key}): {e}")

    # ---------- fallback 本地檔 ----------
    local_fallback = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "data", "Product_table.csv"
        )
    )
    if not os.path.exists(local_fallback):
        raise FileNotFoundError("Product_table.csv not found in S3 nor local data folder")
    return pd.read_csv(local_fallback)


def _compress_with_sonnet(prompt: str) -> str:
    """呼叫 Claude 3 Sonnet，把 prompt 壓到 ~TARGET_LEN 字元"""
    # system_msg = (
    #     "You are a prompt compressor for an image-generation model. "
    #     f"Rewrite the user's description in ≤ {TARGET_LEN} characters, "
    #     "keep all key visual details, comma-separated. "
    #     "Return a single line only."
    # )
    # system_msg = (
    #     "You are a prompt compressor for an image-generation model. "
    #     "Rewrite to ≤ {TARGET_LEN} chars BUT keep every keyword after 'Keywords:' exactly. "
    #     "Preserve comma-separated keyword list verbatim."
    # )
    system_msg = (
        f"Rewrite the user's description to ≤{TARGET_LEN} characters TOTAL, "
        "including the keyword list. "
        "保留最重要且不超過 15 個 Keywords，其餘捨棄。"
    )
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "system": system_msg,                 # ← 放這裡
        "max_tokens": 512,
        "temperature": 0.3,
        "messages": [
            {
                "role": "user",               # 只能 user / assistant
                "content": prompt
            }
        ]
    }

    br = boto3.client(
        "bedrock-runtime",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
        aws_access_key_id=_get_cfg("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=_get_cfg("AWS_SECRET_ACCESS_KEY"),
    )
    resp = br.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps(payload)
    )
    return json.loads(resp["body"].read())["content"][0]["text"].strip()

#from app.services.prompt_engine import _load_product_table
# def main():
#     case_ids = find_matching_keywords(
#         style="Futuristic",
#         lighting="Yes",
#         colors="Blue"
#     )
#     print(f"符合的 keywords: {case_ids}")

# if __name__ == "__main__":
#     main()
