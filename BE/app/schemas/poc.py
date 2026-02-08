from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.poc import PoCType


class PoCResponse(BaseModel):
    id: int
    vulnerability_id: int
    poc_type: PoCType
    poc_name: str
    poc_path: str
    
    # Sandbox Verification
    sandbox_tested: bool
    exploit_successful: Optional[bool]
    sandbox_result: Optional[str]
    sandbox_tested_at: Optional[datetime]
    
    # Metadata
    file_size: Optional[int]
    is_downloadable: bool
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PoCCreate(BaseModel):
    vulnerability_id: int
    poc_type: PoCType
    poc_name: str
    poc_path: str
    file_size: Optional[int] = None
    description: Optional[str] = None


class PoCUpdate(BaseModel):
    poc_type: Optional[PoCType] = None  # Allow user to reclassify real/poor
    is_downloadable: Optional[bool] = None
    description: Optional[str] = None
