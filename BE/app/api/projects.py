from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import shutil
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.api.auth import get_current_active_user
from app.config import settings

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new project."""
    from sqlalchemy import text
    
    # Check if project name already exists (case-insensitive)
    existing_project = db.query(Project).filter(
        Project.name.ilike(project.name)
    ).first()
    
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project name '{project.name}' already exists. Please choose a different name."
        )
    
    # Find the smallest available ID (reuse deleted IDs)
    existing_ids = db.execute(text("SELECT id FROM projects ORDER BY id")).fetchall()
    existing_id_set = {row[0] for row in existing_ids}
    
    # Find first gap or use max + 1
    new_id = 1
    while new_id in existing_id_set:
        new_id += 1
    
    db_project = Project(
        id=new_id,
        **project.dict(),
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.get("", response_model=List[ProjectResponse])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all projects for current user."""
    projects = db.query(Project).filter(
        Project.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific project by ID."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if new name already exists (if name is being updated)
    if project_update.name and project_update.name.lower() != project.name.lower():
        existing_project = db.query(Project).filter(
            Project.name.ilike(project_update.name),
            Project.id != project_id
        ).first()
        
        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project name '{project_update.name}' already exists. Please choose a different name."
            )
    
    # Update only provided fields
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    
    return None


@router.post("/{project_id}/upload-source", response_model=ProjectResponse)
async def upload_source_code(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload source code for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Validate file type (zip, tar.gz, java, etc.)
    allowed_extensions = [".java"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create upload directory if not exists
    upload_dir = os.path.join("uploads", "source_code", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"project_{project_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
    finally:
        file.file.close()
    
    # Update project with source code info
    project.source_code_path = file_path
    project.source_code_size = os.path.getsize(file_path)
    project.source_code_type = "file"
    project.source_code_name = file.filename
    project.source_code_file_count = 1
    project.source_code_uploaded_at = datetime.now()
    
    db.commit()
    db.refresh(project)
    
    return project


@router.post("/{project_id}/upload-folder", response_model=ProjectResponse)
async def upload_source_folder(
    project_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload source code folder for a project.
    Accepts multiple files with their relative paths preserved.
    """
    from typing import List
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Create base upload directory for this project
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_upload_dir = os.path.join(
        "uploads", 
        "source_code", 
        str(current_user.id), 
        f"project_{project_id}_{timestamp}"
    )
    os.makedirs(base_upload_dir, exist_ok=True)
    
    total_size = 0
    file_count = 0
    
    # Allowed extensions for source code
    allowed_extensions = {".java", ".py", ".js", ".ts", ".jsx", ".tsx", ".c", ".cpp", ".h", ".hpp", 
                          ".cs", ".go", ".rb", ".php", ".swift", ".kt", ".scala", ".rs",
                          ".xml", ".json", ".yaml", ".yml", ".properties", ".gradle", ".md", ".txt",
                          ".html", ".css", ".scss", ".less", ".sql", ".sh", ".bat", ".ps1"}
    
    try:
        for upload_file in files:
            # Get the relative path from filename (browser sends full path)
            relative_path = upload_file.filename
            
            # Skip hidden files and common non-source directories
            if any(part.startswith('.') for part in relative_path.split('/')):
                continue
            if any(skip_dir in relative_path for skip_dir in ['node_modules/', '__pycache__/', '.git/', 'target/', 'build/', 'dist/']):
                continue
            
            # Check file extension
            file_ext = os.path.splitext(relative_path)[1].lower()
            if file_ext and file_ext not in allowed_extensions:
                continue
            
            # Create full path preserving directory structure
            full_path = os.path.join(base_upload_dir, relative_path)
            file_dir = os.path.dirname(full_path)
            
            # Create subdirectories if needed
            if file_dir:
                os.makedirs(file_dir, exist_ok=True)
            
            # Save file
            with open(full_path, "wb") as buffer:
                content = await upload_file.read()
                buffer.write(content)
                total_size += len(content)
                file_count += 1
            
            await upload_file.close()
        
        if file_count == 0:
            # Clean up empty directory
            shutil.rmtree(base_upload_dir, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid source code files found in the uploaded folder"
            )
        
        # Extract folder name from the first file's path
        first_file_path = files[0].filename if files else ""
        folder_name = first_file_path.split('/')[0] if '/' in first_file_path else "uploaded_folder"
        
        # Update project with source code info
        project.source_code_path = base_upload_dir
        project.source_code_size = total_size
        project.source_code_type = "folder"
        project.source_code_name = folder_name
        project.source_code_file_count = file_count
        project.source_code_uploaded_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        
        print(f"[UPLOAD] Folder '{folder_name}' uploaded: {file_count} files, {total_size/1024:.2f} KB to {base_upload_dir}")
        
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up on error
        shutil.rmtree(base_upload_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload folder: {str(e)}"
        )
