from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LLMAnalysisMode(str, enum.Enum):
    GEMINI_API = "gemini_api"  # RAG mode with Gemini
    FINE_TUNE = "fine_tune"  # Fine-tuned model


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    phone_number = Column(String(20), nullable=True)
    
    # LLM Analysis Settings
    llm_analysis_mode = Column(Enum(LLMAnalysisMode), default=LLMAnalysisMode.FINE_TUNE, nullable=False)
    gemini_api_key = Column(String(500), nullable=True)  # Encrypted API key
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
