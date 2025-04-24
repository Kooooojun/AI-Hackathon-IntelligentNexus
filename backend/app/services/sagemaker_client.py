import os
from typing import List
import boto3

def _sagemaker_runtime():
    return boto3.client("sagemaker-runtime",
                        region_name=os.getenv("AWS_REGION", "ap-northeast-1"))

def generate_image(prompt: str, *, use_bedrock=False) -> List[str]:
    """
    實務會把 prompt 送到 Stable Diffusion / Titan Image。
    這裡先返回假資料，至少 Swagger 可以跑通。
    """
    if use_bedrock:
        from .bedrock_client import titan_image
        return titan_image(prompt)

    # 💡 真正呼叫
    # response = _sagemaker_runtime().invoke_endpoint(
    #     EndpointName=os.getenv("SAGEMAKER_ENDPOINT"),
    #     ContentType="application/json",
    #     Body=json.dumps({"prompt": prompt})
    # )
    # result = json.loads(response["Body"].read())
    # return result["image_urls"]

    # ---- stub ----
    return ["https://placehold.co/768x768.png?text=Mock+Image"]
