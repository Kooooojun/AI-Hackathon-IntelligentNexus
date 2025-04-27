# src/services/api/types.py
# (保持之前的 TypedDict 或 Pydantic 定義)
# 確保 GeneratedImage 包含: id, user_id, job_id, parent_id,
#                          s3_bucket, s3_key, parameters, is_saved, created_at
# 確保 Job 相關類型定義: JobStatus, JobStatusResponse 等
from typing import TypedDict, List, Optional, Literal, Dict, Any

class DesignParameters(TypedDict, total=False):
    style: str
    color: str
    lighting: bool
    description: str

class GeneratedImage(TypedDict, total=False):
    id: str
    url: Optional[str] # 前端按需獲取
    job_id: Optional[str]
    parameters: Optional[DesignParameters]
    parentId: Optional[str] # 父圖片ID
    s3_key: Optional[str]
    s3_bucket: Optional[str]
    user_id: Optional[str]
    created_at: Optional[str] # ISO 8601 格式字符串
    is_saved: Optional[bool] # 是否被用戶收藏

class GeneratePayload(TypedDict, total=False):
    description: str
    features: DesignParameters
    reference_image_id: Optional[str] # 用於初始生成的參考(如果需要)

class GenerateVariantsPayload(TypedDict, total=False):
    reference_image_id: str # 父圖片ID
    base_parameters: Optional[DesignParameters]

class StartGenerationResponse(TypedDict):
    job_id: str
    message: Optional[str]

JobStatus = Literal['pending', 'processing', 'succeeded', 'failed']

class JobStatusResponse(TypedDict, total=False):
    job_id: str
    status: JobStatus
    images: Optional[List[GeneratedImage]] # 只包含元數據 (id, parentId, parameters)
    error: Optional[str]

class SignedUrlResponse(TypedDict):
    signedUrl: str
    imageId: str # 返回 imageId 便於前端匹配

class FeedbackPayload(TypedDict):
    job_id: str # 與圖片關聯的 job id
    image_id: str
    rating: Literal['up', 'down']

class FeedbackResponse(TypedDict):
    status: str
    message: Optional[str]

class SaveDesignPayload(TypedDict):
    image_id: str

class SaveDesignResponse(TypedDict):
    status: str
    message: Optional[str]