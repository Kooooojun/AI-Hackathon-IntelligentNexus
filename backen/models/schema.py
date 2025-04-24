from pydantic import BaseModel, HttpUrl
from typing import Optional, List

class CaseSchema(BaseModel):
    case_id: str
    name: str
    image_url: HttpUrl
    style: str
    color: str
    lighting: str
    cm_keywords: List[str]

class CaseQueryResponse(CaseSchema):
    pass  # 可以根據需要擴充欄位，例如 created_at
