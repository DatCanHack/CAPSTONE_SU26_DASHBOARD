from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.scan import Scan, ScanStatus
from app.models.project import Project
from app.models.vulnerability import Vulnerability, VulnerabilitySeverity, VulnerabilityStatus
from app.models.report import Report, ReportType
from app.models.poc import PoC, PoCType
from app.schemas.scan import ScanCreate, ScanResponse
from app.api.auth import get_current_active_user
from app.services import sast_scanner, llm_analyzer

router = APIRouter(prefix="/scans", tags=["Scans"])


def run_sast_scan(
    scan_id: int,
    project_name: str,
    source_code_path: str,
    scan_type: str,
    db: Session
):
    """Background task to run SAST scan."""
    try:
        # Update status
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        scan.status = ScanStatus.RUNNING_SAST
        scan.started_at = datetime.now()
        scan.scan_tools = ["snyk", "semgrep", "codeql"] if scan_type == "full" else ["snyk", "semgrep"]
        db.commit()
        
        # Run SAST scan
        result = sast_scanner.scan_project(
            project_name=project_name,
            source_code_path=source_code_path,
            scan_type=scan_type
        )
        
        # Update scan with results
        scan.sast_output_path = result["results_path"]
        scan.sast_total_issues = result["total_issues"]
        scan.sast_completed_at = datetime.now()
        
        if result["success"]:
            scan.status = ScanStatus.SAST_COMPLETED
        else:
            scan.status = ScanStatus.FAILED
            scan.sast_error_message = "; ".join(result.get("errors", []))
        
        db.commit()
        
    except Exception as e:
        scan.status = ScanStatus.FAILED
        scan.sast_error_message = str(e)
        db.commit()


@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def create_scan(
    scan: ScanCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create and start a new scan."""
    # Check if project exists and belongs to user
    project = db.query(Project).filter(
        Project.id == scan.project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Validate source code exists
    if not project.source_code_path or not project.source_code_path.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source code not uploaded. Please upload source code first."
        )
    
    # Find the smallest available scan ID (reuse deleted IDs)
    from sqlalchemy import text
    existing_ids = db.execute(text("SELECT id FROM scans ORDER BY id")).fetchall()
    existing_id_set = {row[0] for row in existing_ids}
    
    new_scan_id = 1
    while new_scan_id in existing_id_set:
        new_scan_id += 1
    
    # Create scan with source code info copied from project
    db_scan = Scan(
        id=new_scan_id,
        project_id=scan.project_id,
        user_id=current_user.id,
        scan_type=scan.scan_type,
        status=ScanStatus.PENDING,
        # Copy source code info from project at scan creation time
        source_code_path=project.source_code_path,
        source_code_type=project.source_code_type,
        source_code_name=project.source_code_name,
        source_code_file_count=project.source_code_file_count,
        source_code_size=project.source_code_size
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    
    # Add background task to run SAST scan
    background_tasks.add_task(
        run_sast_scan,
        scan_id=db_scan.id,
        project_name=project.name,
        source_code_path=project.source_code_path,
        scan_type=scan.scan_type,
        db=db
    )
    
    return db_scan


@router.get("", response_model=List[ScanResponse])
def get_scans(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all scans for current user, optionally filtered by project."""
    query = db.query(Scan).filter(Scan.user_id == current_user.id)
    
    if project_id:
        query = query.filter(Scan.project_id == project_id)
    
    scans = query.offset(skip).limit(limit).all()
    return scans


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific scan by ID."""
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    return scan


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a scan."""
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    db.delete(scan)
    db.commit()
    
    return None


@router.post("/{scan_id}/analyze-all")
async def analyze_all_vulnerabilities(
    scan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze all SAST vulnerabilities with LLM (automatic PoC verification)."""
    
    # Get scan
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    # Check if SAST completed
    if scan.status != ScanStatus.SAST_COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAST scan not completed yet. Current status: {scan.status}"
        )
    
    # Get project
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    # Update status
    scan.status = ScanStatus.RUNNING_LLM
    scan.llm_analysis_mode = current_user.llm_analysis_mode
    db.commit()
    
    try:
        # Get SAST results
        sast_results = sast_scanner.get_scan_results(scan.sast_output_path)
        
        if not sast_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SAST results found"
            )
        
        # LLM analyzes ALL with automatic Sandbox verification
        llm_results = llm_analyzer.analyze_all_vulnerabilities(
            sast_results=sast_results,
            project_name=project.name,
            analysis_mode=current_user.llm_analysis_mode
        )
        
        # Save results to database
        from app.models.vulnerability import Vulnerability, VulnerabilitySeverity, VulnerabilityStatus
        from app.models.report import Report, ReportType
        from app.models.poc import PoC, PoCType
        
        tp_count = 0
        fp_count = 0
        pocs_verified = 0
        
        for result in llm_results:
            # Create vulnerability record
            severity_map = {
                "CRITICAL": VulnerabilitySeverity.CRITICAL,
                "HIGH": VulnerabilitySeverity.HIGH,
                "MEDIUM": VulnerabilitySeverity.MEDIUM,
                "LOW": VulnerabilitySeverity.LOW,
                "INFO": VulnerabilitySeverity.INFO
            }
            
            vuln = Vulnerability(
                scan_id=scan_id,
                title=result["report"]["content"]["vulnerability_type"],
                description=result["report"]["content"]["description"],
                severity=severity_map.get(result["report"]["content"]["severity"], VulnerabilitySeverity.MEDIUM),
                status=VulnerabilityStatus.TRUE_POSITIVE if result["classification"] == "true_positive" else VulnerabilityStatus.FALSE_POSITIVE
            )
            db.add(vuln)
            db.flush()
            
            # Create report
            report_type = ReportType.TRUE_POSITIVE if result["classification"] == "true_positive" else ReportType.FALSE_POSITIVE
            if result["classification"] == "true_positive":
                tp_count += 1
            else:
                fp_count += 1
                
            report = Report(
                scan_id=scan_id,
                vulnerability_id=vuln.id,
                report_type=report_type,
                report_path=result["report"]["path"],
                llm_analysis_mode=current_user.llm_analysis_mode,
                summary=result["report"]["content"].get("vulnerability_type"),
                details=result["report"]["content"].get("description"),
                recommendations=result["report"]["content"].get("recommendation")
            )
            db.add(report)
            db.flush()
            
            # Create PoC if generated (TP only)
            if result["poc"]["generated"]:
                pocs_verified += 1
                poc = PoC(
                    vulnerability_id=vuln.id,
                    poc_type=PoCType.REAL_POC if result["poc"]["poc_type"] == "real_poc" else PoCType.POOR_POC,
                    poc_name=result["poc"]["poc_name"],
                    poc_path=result["poc"]["poc_path"],
                    description=f"Generated and verified PoC for {vuln.title}",
                    is_verified=result["poc"]["is_verified"],
                    is_downloadable=result["poc"]["is_downloadable"],
                    actual_result=result["poc"]["status"]
                )
                db.add(poc)
        
        # Update scan status
        scan.status = ScanStatus.COMPLETED
        scan.llm_completed_at = datetime.now()
        scan.completed_at = datetime.now()
        db.commit()
        
        return {
            "scan_id": scan_id,
            "status": "completed",
            "total_analyzed": len(llm_results),
            "true_positives": tp_count,
            "false_positives": fp_count,
            "pocs_verified": pocs_verified
        }
        
    except Exception as e:
        scan.status = ScanStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed: {str(e)}"
        )


@router.post("/{scan_id}/analyze-vulnerability-type")
def analyze_vulnerability_type(
    scan_id: int,
    vulnerability_type: str,
    force_reanalyze: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze a specific vulnerability type (SQL Injection, XSS, Command Injection) with LLM.
    This endpoint is called for each JSON file individually.
    
    Args:
        scan_id: The scan ID
        vulnerability_type: One of 'sql_injection', 'xss', 'command_injection'
        force_reanalyze: If True, delete existing analysis and re-analyze with new random data
    
    Returns:
        Analysis results including FP/TP classification and reports generated
    """
    # Validate vulnerability type
    valid_types = ['sql_injection', 'xss', 'command_injection']
    vuln_type_normalized = vulnerability_type.lower()
    if vuln_type_normalized not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vulnerability type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Map vulnerability type to display name
    vuln_type_display = {
        'sql_injection': 'SQL Injection',
        'xss': 'XSS',
        'command_injection': 'Command Injection'
    }
    
    # Get scan
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    # Check if SAST completed
    if scan.status not in [ScanStatus.SAST_COMPLETED, ScanStatus.RUNNING_LLM, ScanStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SAST scan not completed yet. Current status: {scan.status}"
        )
    
    # Get project
    project = db.query(Project).filter(Project.id == scan.project_id).first()
    
    # Check if this vulnerability type has already been analyzed for this scan
    existing_vulns = db.query(Vulnerability).filter(
        Vulnerability.scan_id == scan_id,
        Vulnerability.title.like(f"%{vuln_type_display[vuln_type_normalized]}%"),
        Vulnerability.status.in_([VulnerabilityStatus.TRUE_POSITIVE, VulnerabilityStatus.FALSE_POSITIVE])
    ).all()
    
    if existing_vulns and not force_reanalyze:
        # Already analyzed - return cached results from database
        tp_count = sum(1 for v in existing_vulns if v.status == VulnerabilityStatus.TRUE_POSITIVE)
        fp_count = sum(1 for v in existing_vulns if v.status == VulnerabilityStatus.FALSE_POSITIVE)
        
        print(f"")
        print(f"========== RETURNING CACHED RESULTS ==========")
        print(f"[CACHE] Scan {scan_id} - {vulnerability_type}")
        print(f"[CACHE] TP: {tp_count}, FP: {fp_count}")
        print(f"[CACHE] Use force_reanalyze=true to generate new random data")
        print(f"===============================================")
        print(f"")
        
        # Get reports for these vulnerabilities
        vuln_ids = [v.id for v in existing_vulns]
        existing_reports = db.query(Report).filter(
            Report.vulnerability_id.in_(vuln_ids)
        ).all()
        
        # Count PoCs for these vulnerabilities
        existing_pocs = db.query(PoC).filter(
            PoC.vulnerability_id.in_(vuln_ids)
        ).all()
        
        reports_generated = []
        for report in existing_reports:
            reports_generated.append({
                "type": "TP" if report.report_type == ReportType.TRUE_POSITIVE else "FP",
                "path": report.report_path
            })
        
        return {
            "scan_id": scan_id,
            "vulnerability_type": vulnerability_type,
            "status": "already_analyzed",
            "message": f"LLM analysis already completed for {vulnerability_type}. Use force_reanalyze=true to re-analyze.",
            "results": {
                "vulnerability_type": vulnerability_type,
                "total_findings": len(existing_vulns),
                "true_positives": tp_count,
                "false_positives": fp_count,
                "reports_generated": reports_generated,
                "pocs_generated": len(existing_pocs)
            }
        }
    
    # If force_reanalyze, delete existing data for this vulnerability type
    if existing_vulns and force_reanalyze:
        print(f"[LLM] Force re-analyze: Deleting {len(existing_vulns)} existing vulnerabilities for {vuln_type_normalized}")
        vuln_ids = [v.id for v in existing_vulns]
        
        # Delete related PoCs first (foreign key constraint)
        db.query(PoC).filter(PoC.vulnerability_id.in_(vuln_ids)).delete(synchronize_session=False)
        
        # Delete related Reports
        db.query(Report).filter(Report.vulnerability_id.in_(vuln_ids)).delete(synchronize_session=False)
        
        # Delete Vulnerabilities
        db.query(Vulnerability).filter(Vulnerability.id.in_(vuln_ids)).delete(synchronize_session=False)
        
        db.commit()
    
    try:
        # Update scan status to running LLM
        if scan.status == ScanStatus.SAST_COMPLETED:
            scan.status = ScanStatus.RUNNING_LLM
            db.commit()
        
        # ============================================================
        # LLM ANALYZER INTEGRATION
        # ============================================================
        # TODO: Implement actual LLM Module integration
        # 
        # Expected implementation:
        #   llm_results = llm_analyzer.analyze_vulnerability_type(
        #       scan_id=scan_id,
        #       vulnerability_type=vulnerability_type,
        #       sast_results_path=scan.sast_output_path,
        #       project_name=project.name,
        #       analysis_mode=current_user.llm_analysis_mode,
        #       gemini_api_key=current_user.gemini_api_key
        #   )
        #
        # Then iterate over llm_results["findings"] to create:
        #   - Vulnerability records (with status TRUE_POSITIVE or FALSE_POSITIVE)
        #   - Report records
        #   - PoC records (for True Positives only)
        #
        # Required llm_results format:
        # {
        #     "findings": [
        #         {
        #             "is_true_positive": bool,
        #             "title": "...",
        #             "description": "...",
        #             "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
        #             "cwe_id": "CWE-XX",
        #             "file_path": "...",
        #             "line_number": int,
        #             "code_snippet": "...",
        #             "confidence_score": "XX%",
        #             "recommendation": "...",
        #             "report_content": "...",
        #             "poc_code": "..." (only for TP)
        #         },
        #         ...
        #     ]
        # }
        # ============================================================
        
        raise NotImplementedError(
            f"LLM analysis not yet implemented for {vulnerability_type}. "
            "Please integrate llm_analyzer.analyze_vulnerability_type() function."
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed for {vulnerability_type}: {str(e)}"
        )
