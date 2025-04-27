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

    def titan_image_edit(
        self,
        prompt: str,
        image_paths: Union[str, List[str]],
        width: int = 768,
        height: int = 768,
        num_output_images: int = 2,
        quality: str = "standard"
    ) -> List[str]:
        """
        使用 Bedrock Titan Image Generator 基於現有圖片和文字提示進行編輯
        
        Args:
            prompt: 描述想要編輯/生成的內容的文字提示
            image_paths: 要編輯的圖片路徑或S3 URL，可以是單一字串或列表
            width: 輸出圖片寬度 (默認 768)
            height: 輸出圖片高度 (默認 768)
            num_output_images: 要生成的圖片數量 (默認 2)
            
        Returns:
            List[str]: 生成的圖片的可訪問 URL 列表
        """
        try:
            # 處理輸入參數
            MAX_PROMPT_LENGTH = 512
            if len(prompt) > MAX_PROMPT_LENGTH:
                logger.warning(f"[Titan Edit] Prompt 長度超過 {MAX_PROMPT_LENGTH}，已自動截斷。")
                prompt = prompt[:MAX_PROMPT_LENGTH]

            # 將單一圖片路徑轉換為列表
            if isinstance(image_paths, str):
                image_paths = [image_paths]

            # 限制輸入圖片數量
            if len(image_paths) > 2:
                logger.warning("[Titan Edit] 輸入圖片數量超過2張，僅使用前2張。")
                image_paths = image_paths[:2]
            
            # 獲取並編碼所有輸入圖片
            base64_images = []
            for img_path in image_paths:
                try:
                    image_bytes = self._get_image_data(img_path)  # 使用圖片標準化方法
                    base64_image = base64.b64encode(image_bytes).decode('utf-8')
                    base64_images.append(base64_image)
                    logger.info(f"成功處理圖片: {os.path.basename(img_path) if isinstance(img_path, str) else 'S3 image'}")
                except Exception as img_error:
                    logger.error(f"處理圖片失敗: {str(img_error)}")
                    return [f"https://placehold.co/768x768.png?text=Image+Processing+Error:{str(img_error)[:20]}"] * num_output_images
 
            payload = {
                "taskType": "IMAGE_VARIATION",
                "imageVariationParams": {
                    "images": base64_images,   # 1‒5 張
                    "text": prompt, # optional，但建議帶上
                    "similarityStrength": 0.2             
                },
                "imageGenerationConfig": {
                    "numberOfImages": num_output_images,
                    "height": height,
                    "width": width,
                    "quality": quality,        # 必填
                    "cfgScale": 8.0,
                    "seed": random.randint(1, 1_000_000)
                }
            }

            model_id = "amazon.titan-image-generator-v2:0"
            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(payload),
                contentType="application/json",
                accept="application/json"
            )
            body = json.loads(response["body"].read())
            images_b64 = body["images"]
            if not images_b64:
                raise RuntimeError("Titan Edit 回傳空 images 陣列")

            # 處理生成的圖片
            presigned_urls: List[str] = []
            prefix = os.getenv("IMAGE_OUTPUT_PREFIX", "titan_outputs/")
            date_tag = datetime.utcnow().strftime("%y%m%d")
                        
            for idx, img_b64 in enumerate(images_b64, start=1):
                # 解碼 base64 圖片
                img_bytes = base64.b64decode(img_b64)
                
                # 直接將二進制數據上傳到 S3，無需臨時文件
                rand_tag = secrets.token_hex(3)
                key = f"{prefix}edit_{date_tag}_{rand_tag}_{idx}.png"
                
                # 使用 boto3 直接上傳
                from app.db.s3 import _bucket, _s3_client
                bucket = _bucket()
                s3_client = _s3_client()
                s3_client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=img_bytes,
                    ContentType="image/png",
                    ContentDisposition="inline"  # 確保瀏覽器直接顯示而非下載
                )
                
                # 生成可訪問 URL
                from app.db.s3 import generate_presigned_url
                presigned_url = generate_presigned_url(key, expires_in=86400)  # 24小時有效
                presigned_urls.append(presigned_url)

            return presigned_urls

        except Exception as e:
            logger.error(f"🌩️ Titan 圖片編輯失敗: {str(e)}", exc_info=True)
            return ["https://placehold.co/768x768.png?text=Titan+Edit+Error"] * 2  # 返回兩個錯誤圖片佔位符

    def _get_image_data(self, image_path: str) -> bytes:
        """
        從本地路徑或 S3 獲取圖片數據，並確保格式符合 Titan 模型需求
        
        Args:
            image_path: 本地路徑或 S3 URL
                
        Returns:
            bytes: 圖片二進制數據 (已處理成 Titan 兼容格式)
        """
        try:
            # 安裝必要的依賴
            # pip install pillow
            from PIL import Image
            import io
            
            # 讀取原始圖片數據
            if image_path.startswith('http') or image_path.startswith('s3://'):
                # 從 S3 或 HTTP URL 讀取
                if image_path.startswith('s3://'):
                    import boto3
                    parts = image_path[5:].split('/', 1)
                    bucket = parts[0]
                    key = parts[1] if len(parts) > 1 else ""
                    s3_client = boto3.client('s3')
                    response = s3_client.get_object(Bucket=bucket, Key=key)
                    image_data = response['Body'].read()
                else:
                    # 從 HTTP URL 讀取
                    import requests
                    response = requests.get(image_path)
                    image_data = response.content
            else:
                # 從本地讀取
                with open(image_path, 'rb') as f:
                    image_data = f.read()
            
            # 將圖片數據轉換為 PIL Image 對象並進行標準化處理
            img = Image.open(io.BytesIO(image_data))
            
            # 確保尺寸合理 (Titan 可能有最大尺寸限制)
            MAX_SIZE = 4096
            if img.width > MAX_SIZE or img.height > MAX_SIZE:
                # 縮小圖片，保持比例
                ratio = min(MAX_SIZE / img.width, MAX_SIZE / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
                logger.info(f"已將圖片縮放到 {new_size[0]}x{new_size[1]}")

            # 標準化為 RGB 或 RGBA (根據是否有透明通道)
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
                logger.info(f"已將圖片色彩模式從 {img.mode} 轉換為 RGB")
            
            # 重新保存為標準 PNG 或 JPEG 格式
            output = io.BytesIO()
            if img.mode == 'RGBA':
                img.save(output, format='PNG')
            else:
                img.save(output, format='JPEG', quality=95)
            
            logger.info(f"已將圖片處理為 Titan 兼容格式: {img.width}x{img.height}, {'PNG' if img.mode=='RGBA' else 'JPEG'}")
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"圖片處理失敗: {str(e)}", exc_info=True)
            raise ValueError(f"無法處理圖片 {image_path}: {str(e)}")

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

