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
    import random
    from datetime import datetime
    
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
    
    # ========== MOCK #3: SANDBOX MODULE ==========
    # TODO: Replace with actual Sandbox Module integration
    # Expected: sandbox_result = sandbox_module.verify_poc(poc_file_path)
    # Input: PoC file path
    # Output: { success: bool, exploitable: bool, execution_log: str }
    # ==============================================
    
    # Mock Sandbox results - 70% chance of Real PoC (exploit successful)
    is_exploitable = random.random() < 0.7
    
    # Mock execution logs based on vulnerability type (derived from title or cwe_id)
    vuln_title = (vulnerability.title or "").lower()
    cwe_id = (vulnerability.cwe_id or "").lower()
    
    # Determine vulnerability type from title or CWE
    if 'sql' in vuln_title or 'cwe-89' in cwe_id:
        vuln_type = 'sql_injection'
    elif 'xss' in vuln_title or 'cross-site' in vuln_title or 'cwe-79' in cwe_id:
        vuln_type = 'xss'
    elif 'command' in vuln_title or 'injection' in vuln_title or 'cwe-78' in cwe_id:
        vuln_type = 'command_injection'
    else:
        vuln_type = 'sql_injection'  # Default fallback
    
    mock_success_logs = {
        'sql_injection': [
            "[SANDBOX] Executing PoC against test database...\n[SUCCESS] SQL injection payload executed successfully\n[RESULT] Unauthorized data retrieved: 15 user records exposed\n[VERDICT] Exploit successful - Real PoC confirmed",
            "[SANDBOX] Setting up MySQL test environment...\n[INJECT] Payload: ' OR '1'='1' --\n[SUCCESS] Authentication bypassed, admin access gained\n[VERDICT] Real PoC - Critical vulnerability confirmed",
            "[SANDBOX] Testing blind SQL injection...\n[SUCCESS] Time-based extraction successful\n[RESULT] Database version: MySQL 8.0.32\n[VERDICT] Exploit successful - Data exfiltration possible"
        ],
        'xss': [
            "[SANDBOX] Loading test page in headless browser...\n[INJECT] Script: <script>alert(document.cookie)</script>\n[SUCCESS] JavaScript executed in browser context\n[RESULT] Session cookie captured: PHPSESSID=abc123...\n[VERDICT] Real PoC - XSS attack successful",
            "[SANDBOX] Testing DOM-based XSS...\n[SUCCESS] Payload executed via innerHTML\n[RESULT] Simulated cookie theft successful\n[VERDICT] Real PoC - Client-side attack confirmed"
        ],
        'command_injection': [
            "[SANDBOX] Executing command injection test...\n[INJECT] Payload: ; cat /etc/passwd\n[SUCCESS] System file read successful\n[RESULT] Retrieved 45 lines from /etc/passwd\n[VERDICT] Real PoC - RCE vulnerability confirmed",
            "[SANDBOX] Testing OS command injection...\n[SUCCESS] Reverse shell connection established\n[RESULT] Shell access gained with www-data privileges\n[VERDICT] Real PoC - Critical RCE confirmed"
        ]
    }
    
    mock_fail_logs = {
        'sql_injection': [
            "[SANDBOX] Executing PoC against test database...\n[BLOCKED] WAF detected and blocked SQL injection attempt\n[RESULT] Query sanitized, no data leaked\n[VERDICT] Poor PoC - Exploit blocked by security controls",
            "[SANDBOX] Testing SQL injection payload...\n[FAILED] Prepared statements prevented injection\n[RESULT] Query executed safely with escaped input\n[VERDICT] Poor PoC - Parameterized queries effective"
        ],
        'xss': [
            "[SANDBOX] Loading test page in headless browser...\n[BLOCKED] Content Security Policy prevented script execution\n[RESULT] Inline script blocked by CSP\n[VERDICT] Poor PoC - CSP headers effective",
            "[SANDBOX] Testing XSS payload...\n[FAILED] Output encoding neutralized attack\n[RESULT] Script tags rendered as text\n[VERDICT] Poor PoC - Input sanitization working"
        ],
        'command_injection': [
            "[SANDBOX] Executing command injection test...\n[BLOCKED] Input validation rejected malicious characters\n[RESULT] Command not executed\n[VERDICT] Poor PoC - Input filtering effective",
            "[SANDBOX] Testing OS command injection...\n[FAILED] Sandboxed environment blocked system calls\n[RESULT] Permission denied for dangerous operations\n[VERDICT] Poor PoC - Sandbox restrictions effective"
        ]
    }
    
    # Select appropriate mock log
    if is_exploitable:
        logs = mock_success_logs.get(vuln_type, mock_success_logs.get('sql_injection'))
    else:
        logs = mock_fail_logs.get(vuln_type, mock_fail_logs.get('sql_injection'))
    
    execution_log = random.choice(logs)
    
    # Update PoC with Sandbox results
    from app.models.poc import PoCType
    
    poc.sandbox_tested = True
    poc.sandbox_tested_at = datetime.utcnow()
    poc.exploit_successful = is_exploitable
    poc.sandbox_result = execution_log
    
    if is_exploitable:
        # Real PoC - Exploit successful
        poc.poc_type = PoCType.REAL_POC
        poc.is_downloadable = True
        
        # Update path to Real_PoC folder
        new_path = f"C:\\tmp\\{project.name}\\TP\\PoC\\Real_PoC\\{poc.poc_name}"
        poc.poc_path = new_path
    else:
        # Poor PoC - Exploit failed
        poc.poc_type = PoCType.POOR_POC
        poc.is_downloadable = True
        
        # Update path to Poor_PoC folder
        new_path = f"C:\\tmp\\{project.name}\\TP\\PoC\\Poor_PoC\\{poc.poc_name}"
        poc.poc_path = new_path
    
    db.commit()
    db.refresh(poc)
    
    return poc


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
