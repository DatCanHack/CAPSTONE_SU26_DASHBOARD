from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import LLMAnalysisMode


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    llm_analysis_mode: Optional[LLMAnalysisMode] = LLMAnalysisMode.FINE_TUNE


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    llm_analysis_mode: LLMAnalysisMode
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    llm_analysis_mode: Optional[LLMAnalysisMode] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
