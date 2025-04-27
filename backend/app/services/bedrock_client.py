# def titan_image(prompt: str):
#     # TODO: 呼叫 Bedrock Titan Image
#     return ["https://placehold.co/768x768.png?text=Bedrock+Mock"]
import os
import boto3
import base64
import json
import logging
from datetime import datetime
import uuid
import tempfile
from typing import List, Optional, Dict, Any, Union
from app.db.s3 import upload_file_to_s3
import secrets
import random

logger = logging.getLogger(__name__)

class BedrockClient:
    """
    AWS Bedrock 服務客戶端，提供影像到文字和文字到影像的生成功能
    """
    
    def __init__(
        self,
        region_name: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None
    ):
        """
        初始化 Bedrock 客戶端
        
        Args:
            region_name: AWS 區域，默認使用環境變數 AWS_REGION
            access_key_id: AWS 存取金鑰 ID，默認使用環境變數 AWS_ACCESS_KEY_ID
            secret_access_key: AWS 秘密存取金鑰，默認使用環境變數 AWS_SECRET_ACCESS_KEY
        """
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-2")
        self.access_key_id = access_key_id or os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_access_key = secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY")
        
        self.client = self._initialize_client()
        
    def _initialize_client(self):
        try:
            return boto3.client(
                "bedrock-runtime",
                region_name=self.region_name,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key
            )
        except Exception as e:
            logger.error(f"初始化 Bedrock 客戶端失敗: {str(e)}")
            raise

    def image_to_text(
        self,
        image_path: str,
        prompt: Optional[str] = None,
        model_id: Optional[str] = None,
        max_tokens: int = 512,
        temperature: float = 0.5,
    ) -> str:
        """
        使用 AWS Bedrock Claude 3.x (支援 vision) 將圖片轉換為文字描述。
        Args:
            image_path: 圖片的本地路徑或 S3 URL
            prompt: （可選）自訂提示詞（預設為較詳細的描述）
            model_id: （可選）Bedrock Claude Vision 模型 ID，預設用 Claude 3.5 Sonnet
            max_tokens: 最大回傳 tokens 數（預設 512）
            temperature: 生成溫度（預設 0.5）
        Returns:
            str: 圖片的文字描述
        """
        try:
            # 預設 prompt
            if not prompt:
                prompt = (
                    "Describe this image in detail, focusing on colors, objects, style, "
                    "and visual elements that would be useful for generating a similar image."
                )
            # 預設模型 ID（需確定你 Bedrock 有權限）
            if not model_id:
                model_id = "anthropic.claude-3-7-sonnet-20250219-v1:0"

            # 取得圖片 bytes 並 base64 encode
            image_bytes = self._get_image_data(image_path)
            base64_image = base64.b64encode(image_bytes).decode('utf-8')

            # 組建 request payload，格式與官方 sample code 一致
            native_request = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/webp",  # 或根據實際檔案判斷
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ],
            }

            logger.info(f"正在使用模型: {model_id}")
            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(native_request)
            )

            # 處理回應
            response_body = json.loads(response["body"].read())
            # Claude 3 Vision 系列的格式
            description = response_body["content"][0]["text"]
            return description

        except Exception as e:
            logger.error(f"圖像處理失敗: {str(e)}")
            return f"圖像處理錯誤: {str(e)}"
    
    # --- MODIFIED titan_image ---
    def titan_image(self, prompt: str, width: int = 768, height: int = 768) -> List[bytes]:
        """
        使用 Bedrock Titan Image 從文字提示生成圖片。
        返回圖片數據的 bytes 列表。由調用者負責上傳和記錄。
        """
        try:
            MAX_PROMPT_LENGTH = 7000 # Check current limits
            if len(prompt) > MAX_PROMPT_LENGTH:
                logger.warning(f"[Titan] Prompt length {len(prompt)} > {MAX_PROMPT_LENGTH}, truncating.")
                prompt = prompt[:MAX_PROMPT_LENGTH]

            payload = {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {"text": prompt},
                "imageGenerationConfig": {
                    "numberOfImages": 1, # Generate one image per call for simplicity
                    "quality": "standard", # or "premium"
                    "height": height,
                    "width": width,
                    "cfgScale": 8.0,
                    "seed": random.randint(0, 2147483647), # Use full range for Titan
                },
            }
            # Negative prompts can be added here if needed:
            # "textToImageParams": {"text": prompt, "negativeText": "disfigured, bad quality"},

            model_id = "amazon.titan-image-generator-v1"
            logger.info(f"[Titan] Invoking model: {model_id} with prompt (start): {prompt[:50]}...")
            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(payload),
                accept='application/json',
                contentType='application/json'
            )

            response_body = json.loads(response.get('body').read())

            # Check for errors in response
            if response_body.get('error'):
                 raise RuntimeError(f"Titan API returned error: {response_body['error']}")

            images_b64 = response_body.get("images")
            if not images_b64:
                raise RuntimeError("Titan returned empty images array or unexpected format")

            image_bytes_list: List[bytes] = []
            for img_b64 in images_b64:
                try:
                    image_bytes_list.append(base64.b64decode(img_b64))
                except (TypeError, ValueError) as decode_error:
                     logger.error(f"Failed to decode base64 image string: {decode_error}")
                     # Decide how to handle partially successful results
                     # Maybe continue and return only successfully decoded images?

            logger.info(f"[Titan] Successfully generated {len(image_bytes_list)} image(s).")
            return image_bytes_list # Return list of bytes

        except Exception as e:
            logger.error(f"🌩️ Titan image generation failed: {str(e)}", exc_info=True)
            raise # Re-raise the exception so the worker knows it failed
    # --- END MODIFIED titan_image ---

    def _get_image_data(self, image_path: str) -> bytes:
        """
        從本地路徑或 S3 獲取圖片數據
        
        Args:
            image_path: 本地路徑或 S3 URL
            
        Returns:
            bytes: 圖片二進制數據
        """
        if image_path.startswith('http') or image_path.startswith('s3://'):
            # 從 S3 讀取圖片
            s3_client = boto3.client('s3')
            bucket_name, key = self._parse_s3_url(image_path)
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            return response['Body'].read()
        else:
            # 從本地讀取圖片
            with open(image_path, 'rb') as f:
                return f.read()

    def _parse_s3_url(self, s3_url: str) -> tuple:
        """
        解析 S3 URL 為 bucket 和 key
        
        Args:
            s3_url: S3 URL (s3:// 或 https://)
            
        Returns:
            tuple: (bucket, key)
        """
        if s3_url.startswith('s3://'):
            parts = s3_url[5:].split('/', 1)
        else:  # 假設它是 https URL
            parts = s3_url.split('/')
            parts = [p for p in parts if p and p != 'https:' and not p.endswith('.amazonaws.com')]
        
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ""
        return bucket, key


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", default="test prompt")
    args = parser.parse_args()

    client = BedrockClient()
    print(client.titan_image(args.prompt))

