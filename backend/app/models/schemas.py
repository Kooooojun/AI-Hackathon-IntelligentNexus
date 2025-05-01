from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List

class Request(BaseModel):
    prompt: str = Field(..., min_length=1, description="Text prompt for image generation")
    # Add other potential fields if needed from FormData, converting as necessary
    # e.g., analyze_image: Optional[bool] = False
    # e.g., optimize_prompt: Optional[bool] = False
    # Note: Handling files (reference_image) needs specific logic in the route,
    # Pydantic model might not directly represent the file upload part of FormData.

class Response(BaseModel):
    request_id: str = Field(..., description="Unique ID for the generation request")

class StatusResponse(BaseModel):
    request_id: str = Field(..., description="The ID being polled")
    status: str = Field(..., description="Current status ('processing', 'succeeded', 'failed')")
    result_url: Optional[HttpUrl] = Field(None, description="URL of the d image (if status is 'succeeded')")
    error_message: Optional[str] = Field(None, description="Error details (if status is 'failed')")

class UserProfile(BaseModel):
    user_id: str
    roles: List[str] = []
    # Add other user details if needed