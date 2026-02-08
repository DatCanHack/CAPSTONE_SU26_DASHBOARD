from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.scan import ScanStatus


class ScanCreate(BaseModel):
    project_id: int
    scan_type: Optional[str] = "full"


class ScanResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    status: ScanStatus
    scan_type: Optional[str]
    
    # SAST Info
    sast_output_path: Optional[str]
    sast_total_issues: int
    sast_error_message: Optional[str]
    
    # LLM Info
    llm_analysis_mode: Optional[str]
    llm_output_path: Optional[str]
    
    # Timestamps
    started_at: Optional[datetime]
    sast_completed_at: Optional[datetime]
    llm_completed_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True
