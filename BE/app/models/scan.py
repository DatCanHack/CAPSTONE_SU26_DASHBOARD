from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING_SAST = "running_sast"  # SAST scan đang chạy
    SAST_COMPLETED = "sast_completed"  # SAST hoàn thành, chờ LLM
    RUNNING_LLM = "running_llm"  # LLM đang phân tích
    COMPLETED = "completed"  # Hoàn thành tất cả
    FAILED = "failed"


class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ScanStatus), default=ScanStatus.PENDING, nullable=False)
    scan_type = Column(String(100), nullable=True)  # "full" or "standard"
    scan_tools = Column(JSON, nullable=True)  # Array: ["snyk", "semgrep", "codeql"] or ["snyk", "semgrep"]
    
    # SAST Scan Info (TODO: Integrate SAST module)
    # Path: C:\tmp\{project_name}\result\
    sast_output_path = Column(String(500), nullable=True)  # Path to folder containing JSON files
    sast_total_issues = Column(Integer, default=0)  # Tổng số lỗi phát hiện
    sast_error_message = Column(Text, nullable=True)  # Lỗi nếu SAST scan failed
    
    # LLM Analysis Info (TODO: Integrate LLM module)
    llm_analysis_mode = Column(String(50), nullable=True)  # "fine_tuning" or "rag"
    llm_output_path = Column(String(500), nullable=True)  # Path to LLM reports
    
    # Source code info (copied from project at scan creation time)
    source_code_path = Column(String(500), nullable=True)
    source_code_type = Column(String(20), nullable=True)  # "file" or "folder"
    source_code_name = Column(String(255), nullable=True)
    source_code_file_count = Column(Integer, nullable=True)
    source_code_size = Column(Integer, nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    sast_completed_at = Column(DateTime(timezone=True), nullable=True)
    llm_completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="scans")
    user = relationship("User", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")
