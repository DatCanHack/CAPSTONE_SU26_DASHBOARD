from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.vulnerability import Vulnerability
from app.models.scan import Scan
from app.schemas.vulnerability import VulnerabilityResponse, VulnerabilityUpdate
from app.api.auth import get_current_active_user

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerabilities"])


@router.get("", response_model=List[VulnerabilityResponse])
def get_vulnerabilities(
    skip: int = 0,
    limit: int = 100,
    scan_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all vulnerabilities, optionally filtered by scan."""
    query = db.query(Vulnerability).join(Scan).filter(Scan.user_id == current_user.id)
    
    if scan_id:
        query = query.filter(Vulnerability.scan_id == scan_id)
    
    vulnerabilities = query.offset(skip).limit(limit).all()
    return vulnerabilities


@router.get("/{vulnerability_id}", response_model=VulnerabilityResponse)
def get_vulnerability(
    vulnerability_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific vulnerability by ID."""
    vulnerability = db.query(Vulnerability).join(Scan).filter(
        Vulnerability.id == vulnerability_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not vulnerability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vulnerability not found"
        )
    
    return vulnerability


@router.patch("/{vulnerability_id}", response_model=VulnerabilityResponse)
def update_vulnerability(
    vulnerability_id: int,
    vulnerability_update: VulnerabilityUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a vulnerability status or mark as false positive."""
    vulnerability = db.query(Vulnerability).join(Scan).filter(
        Vulnerability.id == vulnerability_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not vulnerability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vulnerability not found"
        )
    
    # Update only provided fields
    update_data = vulnerability_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vulnerability, field, value)
    
    db.commit()
    db.refresh(vulnerability)
    
    return vulnerability


@router.delete("/{vulnerability_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vulnerability(
    vulnerability_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a vulnerability."""
    vulnerability = db.query(Vulnerability).join(Scan).filter(
        Vulnerability.id == vulnerability_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not vulnerability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vulnerability not found"
        )
    
    db.delete(vulnerability)
    db.commit()
    
    return None
