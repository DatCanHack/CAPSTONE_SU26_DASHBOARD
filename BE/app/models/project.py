from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)  # Array of tags for project categorization
    repository_url = Column(String(500), nullable=True)
    target_url = Column(String(500), nullable=True)
    
    # Source Code Upload Info (C:\tmp\{project_name}\source_code\)
    source_code_path = Column(String(500), nullable=True)  # Base path: C:\tmp\{project_name}\
    source_code_size = Column(Integer, nullable=True)  # Size in bytes
    source_code_type = Column(String(20), nullable=True)  # "file" or "folder"
    source_code_name = Column(String(255), nullable=True)  # Original filename or folder name
    source_code_file_count = Column(Integer, nullable=True)  # Number of files (for folder upload)
    source_code_uploaded_at = Column(DateTime(timezone=True), nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    scans = relationship("Scan", back_populates="project", cascade="all, delete-orphan")
