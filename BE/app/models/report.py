from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ReportType(str, enum.Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id"), nullable=False)
    
    # Report Info
    report_type = Column(Enum(ReportType), nullable=False)
    report_path = Column(String(500), nullable=True)  # Path to report file
    
    # LLM Analysis Details
    llm_analysis_mode = Column(String(50), nullable=True)  # "fine_tuning" or "rag"
    llm_reasoning = Column(Text, nullable=True)  # LLM's reasoning for TP/FP classification
    llm_confidence = Column(String(10), nullable=True)  # Confidence score
    llm_raw_output = Column(JSON, nullable=True)  # Complete LLM output
    
    # Report Content
    summary = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    scan = relationship("Scan", back_populates="reports")
    vulnerability = relationship("Vulnerability", back_populates="reports")
