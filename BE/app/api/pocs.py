from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import json
from app.database import get_db
from app.models.user import User
from app.models.poc import PoC
from app.models.vulnerability import Vulnerability
from app.models.scan import Scan
from app.schemas.poc import PoCCreate, PoCResponse, PoCUpdate
from app.api.auth import get_current_active_user

router = APIRouter(prefix="/pocs", tags=["PoCs"])


@router.get("", response_model=List[PoCResponse])
def get_pocs(
    skip: int = 0,
    limit: int = 100,
    vulnerability_id: int = None,
    poc_type: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all PoCs, optionally filtered by vulnerability or type."""
    query = db.query(PoC).join(Vulnerability).join(Scan).filter(
        Scan.user_id == current_user.id
    )
    
    if vulnerability_id:
        query = query.filter(PoC.vulnerability_id == vulnerability_id)
    
    if poc_type:
        query = query.filter(PoC.poc_type == poc_type)
    
    pocs = query.offset(skip).limit(limit).all()
    return pocs


@router.get("/{poc_id}", response_model=PoCResponse)
def get_poc(
    poc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific PoC by ID."""
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    return poc


@router.get("/{poc_id}/download")
def download_poc(
    poc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a PoC file."""
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    if not poc.is_downloadable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This PoC is not available for download"
        )
    
    # Get project info to construct file path based on workflow structure
    from app.models.project import Project
    vulnerability = db.query(Vulnerability).filter(Vulnerability.id == poc.vulnerability_id).first()
    scan = db.query(Scan).filter(Scan.id == vulnerability.scan_id).first()
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Construct file path based on workflow structure
    # Pattern: /tmp/{project_name}/TP/PoC/{Real_PoC|Poor_PoC}/{file_name}
    poc_type_folder = "Real_PoC" if poc.poc_type == "real_poc" else "Poor_PoC"
    base_path = f"/tmp/{project.name}/TP/PoC/{poc_type_folder}"
    
    # Try to find the PoC file
    poc_file_path = None
    if poc.poc_path:
        # If poc_path is stored as full path
        if os.path.exists(poc.poc_path):
            poc_file_path = poc.poc_path
        else:
            # Try to construct path from poc_path filename
            filename = os.path.basename(poc.poc_path)
            constructed_path = os.path.join(base_path, filename)
            if os.path.exists(constructed_path):
                poc_file_path = constructed_path
    
    # If still not found, try to list files in the directory
    if not poc_file_path and os.path.exists(base_path):
        files = os.listdir(base_path)
        for file in files:
            # Look for files that might match this PoC
            potential_path = os.path.join(base_path, file)
            if os.path.exists(potential_path):
                poc_file_path = potential_path
                break
    
    # Check if file was found
    if not poc_file_path or not os.path.exists(poc_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PoC file not found at {base_path}"
        )
    
    # Determine filename for download
    download_filename = poc.poc_name if poc.poc_name else f"poc_{poc_id}_{poc.poc_type}.{poc_file_path.split('.')[-1]}"
    
    return FileResponse(
        path=poc_file_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.get("/{poc_id}/preview")
def preview_poc(
    poc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Preview a PoC (returns content for display)."""
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    # Get project info to construct file path
    from app.models.project import Project
    vulnerability = db.query(Vulnerability).filter(Vulnerability.id == poc.vulnerability_id).first()
    scan = db.query(Scan).filter(Scan.id == vulnerability.scan_id).first()
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    # Return basic PoC info for preview
    preview_data = {
        "id": poc.id,
        "vulnerability_id": poc.vulnerability_id,
        "poc_type": poc.poc_type,
        "poc_name": poc.poc_name,
        "description": poc.description,
        "steps_to_reproduce": poc.steps_to_reproduce,
        "expected_result": poc.expected_result,
        "actual_result": poc.actual_result,
        "is_verified": poc.is_verified,
        "is_downloadable": poc.is_downloadable,
        "created_at": str(poc.created_at)
    }
    
    # Construct file path based on workflow structure
    if project:
        poc_type_folder = "Real_PoC" if poc.poc_type == "real_poc" else "Poor_PoC"
        base_path = f"/tmp/{project.name}/TP/PoC/{poc_type_folder}"
        
        # Try to find the PoC file
        poc_file_path = None
        if poc.poc_path:
            if os.path.exists(poc.poc_path):
                poc_file_path = poc.poc_path
            else:
                filename = os.path.basename(poc.poc_path)
                constructed_path = os.path.join(base_path, filename)
                if os.path.exists(constructed_path):
                    poc_file_path = constructed_path
        
        # If still not found, try to list files in the directory
        if not poc_file_path and os.path.exists(base_path):
            files = os.listdir(base_path)
            for file in files:
                if file.endswith(('.py', '.sh', '.txt', '.md', '.json')):
                    potential_path = os.path.join(base_path, file)
                    if os.path.exists(potential_path):
                        poc_file_path = potential_path
                        break
        
        preview_data["file_path"] = poc_file_path
        preview_data["has_file"] = bool(poc_file_path and os.path.exists(poc_file_path))
        
        # Read file content if exists
        if poc_file_path and os.path.exists(poc_file_path):
            try:
                # For code files, read as text
                if poc_file_path.endswith(('.py', '.sh', '.txt', '.md')):
                    with open(poc_file_path, 'r', encoding='utf-8') as f:
                        preview_data["file_content"] = f.read()
                elif poc_file_path.endswith('.json'):
                    with open(poc_file_path, 'r', encoding='utf-8') as f:
                        preview_data["file_content"] = json.load(f)
                else:
                    preview_data["file_info"] = {
                        "path": poc_file_path,
                        "size": os.path.getsize(poc_file_path),
                        "type": poc_file_path.split('.')[-1]
                    }
            except Exception as e:
                preview_data["file_error"] = f"Could not read file: {str(e)}"
        else:
            preview_data["file_error"] = f"PoC file not found at expected path: {base_path}"
    
    return JSONResponse(content=preview_data)


@router.patch("/{poc_id}", response_model=PoCResponse)
def update_poc(
    poc_id: int,
    poc_update: PoCUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update PoC (e.g., reclassify as real/poor)."""
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    # Update only provided fields
    update_data = poc_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(poc, field, value)
    
    db.commit()
    db.refresh(poc)
    
    return poc


@router.post("/{poc_id}/verify", response_model=PoCResponse)
def verify_poc(
    poc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify a PoC by sending it to Sandbox Module for execution.
    
    This endpoint is called when user clicks "Verify PoC" button.
    PoC is created unverified during LLM analysis, and only classified
    as Real/Poor when user triggers this verification.
    """
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    # Check if already verified
    if poc.sandbox_tested:
        return poc  # Return existing result
    
    # Get project info to construct file path
    from app.models.project import Project
    vulnerability = db.query(Vulnerability).filter(Vulnerability.id == poc.vulnerability_id).first()
    scan = db.query(Scan).filter(Scan.id == vulnerability.scan_id).first()
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # ============================================================
    # SANDBOX MODULE INTEGRATION
    # ============================================================
    # TODO: Implement actual Sandbox Module integration
    #
    # Expected implementation:
    #   from app.services.sandbox import sandbox_module
    #   sandbox_result = sandbox_module.verify_poc(
    #       poc_file_path=poc.poc_path,
    #       vulnerability_info={
    #           "title": vulnerability.title,
    #           "cwe_id": vulnerability.cwe_id,
    #           "type": vulnerability.description
    #       }
    #   )
    #
    # Expected sandbox_result format:
    # {
    #     "success": bool,        # Whether sandbox execution was successful
    #     "exploitable": bool,    # Whether the exploit worked
    #     "execution_log": str,   # Execution output/logs
    #     "classification": str,  # "real_poc" or "poor_poc"
    # }
    #
    # Then update PoC record:
    #   poc.sandbox_tested = True
    #   poc.sandbox_tested_at = datetime.utcnow()
    #   poc.exploit_successful = sandbox_result["exploitable"]
    #   poc.sandbox_result = sandbox_result["execution_log"]
    #   poc.poc_type = PoCType.REAL_POC if exploitable else PoCType.POOR_POC
    #   poc.is_downloadable = True
    # ============================================================
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Sandbox verification not yet implemented. Please integrate sandbox_module.verify_poc() function."
    )


@router.delete("/{poc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poc(
    poc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a PoC."""
    poc = db.query(PoC).join(Vulnerability).join(Scan).filter(
        PoC.id == poc_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not poc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PoC not found"
        )
    
    db.delete(poc)
    db.commit()
    
    return None
