from fastapi import APIRouter, HTTPException
from models.schema import CaseSchema, CaseQueryResponse

# 暫存假資料（模擬 DynamoDB 回傳）
dummy_data = [
    {
        "case_id": "cm001",
        "name": "MasterBox TD500 Mesh",
        "image_url": "https://example.com/td500mesh.png",
        "style": "Gaming",
        "color": "Black",
        "lighting": "Yes",
        "cm_keywords": ["hexagonal mesh", "3D"]
    },
    {
        "case_id": "cm002",
        "name": "Silencio S600",
        "image_url": "https://example.com/s600.png",
        "style": "Minimalist",
        "color": "Black",
        "lighting": "No",
        "cm_keywords": ["sound dampening"]
    }
]

router = APIRouter()

@router.get("/", response_model=list[CaseQueryResponse])
def list_all_cases():
    return dummy_data

@router.get("/{case_id}", response_model=CaseQueryResponse)
def get_case(case_id: str):
    for item in dummy_data:
        if item["case_id"] == case_id:
            return item
    raise HTTPException(status_code=404, detail="Case not found")

@router.post("/", response_model=CaseQueryResponse)
def create_case(case: CaseSchema):
    dummy_data.append(case.dict())
    return case
