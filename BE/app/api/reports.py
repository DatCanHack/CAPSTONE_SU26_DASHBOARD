from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import json
from app.database import get_db
from app.models.user import User
from app.models.report import Report
from app.models.scan import Scan
from app.schemas.report import ReportCreate, ReportResponse
from app.api.auth import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=List[ReportResponse])
def get_reports(
    skip: int = 0,
    limit: int = 100,
    scan_id: int = None,
    vulnerability_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all reports, optionally filtered by scan or vulnerability."""
    query = db.query(Report).join(Scan).filter(Scan.user_id == current_user.id)
    
    if scan_id:
        query = query.filter(Report.scan_id == scan_id)
    
    if vulnerability_id:
        query = query.filter(Report.vulnerability_id == vulnerability_id)
    
    reports = query.offset(skip).limit(limit).all()
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific report by ID."""
    report = db.query(Report).join(Scan).filter(
        Report.id == report_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a report."""
    report = db.query(Report).join(Scan).filter(
        Report.id == report_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    db.delete(report)
    db.commit()
    
    return None


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a report file."""
    report = db.query(Report).join(Scan).filter(
        Report.id == report_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Get project info to construct file path
    from app.models.project import Project
    scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Construct file path based on workflow structure
    # Pattern: /tmp/{project_name}/{FP|TP}/report/{file_name}
    report_type_folder = "TP" if report.report_type == "true_positive" else "FP"
    base_path = f"/tmp/{project.name}/{report_type_folder}/report"
    
    # Try to find the report file
    report_file_path = None
    if report.report_path:
        # If report_path is stored as full path
        if os.path.exists(report.report_path):
            report_file_path = report.report_path
        else:
            # Try to construct path from report_path filename
            filename = os.path.basename(report.report_path)
            constructed_path = os.path.join(base_path, filename)
            if os.path.exists(constructed_path):
                report_file_path = constructed_path
    
    # If still not found, try to list files in the directory
    if not report_file_path and os.path.exists(base_path):
        files = os.listdir(base_path)
        for file in files:
            if file.endswith(('.json', '.txt', '.md', '.pdf')):
                potential_path = os.path.join(base_path, file)
                if os.path.exists(potential_path):
                    report_file_path = potential_path
                    break
    
    # Check if file was found
    if not report_file_path or not os.path.exists(report_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report file not found at {base_path}"
        )
    
    # Determine filename for download
    download_filename = f"report_{report_id}_{report.report_type}.{report_file_path.split('.')[-1]}"
    
    return FileResponse(
        path=report_file_path,
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.get("/{report_id}/preview")
def preview_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Preview a report (returns content for display)."""
    report = db.query(Report).join(Scan).filter(
        Report.id == report_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Get project info to construct file path
    from app.models.project import Project
    scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    # Return basic report info for preview
    preview_data = {
        "id": report.id,
        "scan_id": report.scan_id,
        "vulnerability_id": report.vulnerability_id,
        "report_type": report.report_type,
        "summary": report.summary,
        "details": report.details,
        "recommendations": report.recommendations,
        "llm_analysis_mode": report.llm_analysis_mode,
        "llm_confidence": report.llm_confidence,
        "llm_reasoning": report.llm_reasoning,
        "created_at": str(report.created_at)
    }
    
    # Construct file path based on workflow structure
    # Pattern: /tmp/{project_name}/{FP|TP}/report/{file_name}
    if project:
        report_type_folder = "TP" if report.report_type == "true_positive" else "FP"
        base_path = f"/tmp/{project.name}/{report_type_folder}/report"
        
        # Try to find the report file
        report_file_path = None
        if report.report_path:
            # If report_path is stored as full path
            if os.path.exists(report.report_path):
                report_file_path = report.report_path
            else:
                # Try to construct path from report_path filename
                filename = os.path.basename(report.report_path)
                constructed_path = os.path.join(base_path, filename)
                if os.path.exists(constructed_path):
                    report_file_path = constructed_path
        
        # If still not found, try to list files in the directory
        if not report_file_path and os.path.exists(base_path):
            files = os.listdir(base_path)
            # Look for files that might match this report
            for file in files:
                if file.endswith(('.json', '.txt', '.md')):
                    # Could add more sophisticated matching here
                    potential_path = os.path.join(base_path, file)
                    if os.path.exists(potential_path):
                        report_file_path = potential_path
                        break
        
        preview_data["file_path"] = report_file_path
        preview_data["has_file"] = bool(report_file_path and os.path.exists(report_file_path))
        
        # Read file content if exists
        if report_file_path and os.path.exists(report_file_path):
            try:
                if report_file_path.endswith('.json'):
                    with open(report_file_path, 'r', encoding='utf-8') as f:
                        preview_data["file_content"] = json.load(f)
                elif report_file_path.endswith(('.txt', '.md')):
                    with open(report_file_path, 'r', encoding='utf-8') as f:
                        preview_data["file_content"] = f.read()
                else:
                    preview_data["file_info"] = {
                        "path": report_file_path,
                        "size": os.path.getsize(report_file_path),
                        "type": report_file_path.split('.')[-1]
                    }
            except Exception as e:
                preview_data["file_error"] = f"Could not read file: {str(e)}"
        else:
            preview_data["file_error"] = f"Report file not found at expected path: {base_path}"
    
    return JSONResponse(content=preview_data)
