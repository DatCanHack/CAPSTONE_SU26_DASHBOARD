from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.report import ReportType


class ReportResponse(BaseModel):
    id: int
    scan_id: int
    vulnerability_id: int
    report_type: ReportType
    report_path: Optional[str]
    llm_analysis_mode: Optional[str]
    llm_reasoning: Optional[str]
    llm_confidence: Optional[str]
    llm_raw_output: Optional[Dict[str, Any]]
    summary: Optional[str]
    details: Optional[str]
    recommendations: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    vulnerability_id: int
    report_type: ReportType
    llm_reasoning: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[str] = None
