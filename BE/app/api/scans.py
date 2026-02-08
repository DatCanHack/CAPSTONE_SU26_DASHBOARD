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
    
    # Create scan
    db_scan = Scan(
        project_id=scan.project_id,
        user_id=current_user.id,
        scan_type=scan.scan_type,
        status=ScanStatus.PENDING
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
async def analyze_vulnerability_type(
    scan_id: int,
    vulnerability_type: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze a specific vulnerability type (SQL Injection, XSS, Command Injection) with LLM.
    This endpoint is called for each JSON file individually.
    
    Args:
        scan_id: The scan ID
        vulnerability_type: One of 'sql_injection', 'xss', 'command_injection'
    
    Returns:
        Analysis results including FP/TP classification and reports generated
    """
    import random
    from datetime import datetime
    
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
    
    if existing_vulns:
        # Already analyzed - return cached results from database
        tp_count = sum(1 for v in existing_vulns if v.status == VulnerabilityStatus.TRUE_POSITIVE)
        fp_count = sum(1 for v in existing_vulns if v.status == VulnerabilityStatus.FALSE_POSITIVE)
        
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
            "message": f"LLM analysis already completed for {vulnerability_type}",
            "results": {
                "vulnerability_type": vulnerability_type,
                "total_findings": len(existing_vulns),
                "true_positives": tp_count,
                "false_positives": fp_count,
                "reports_generated": reports_generated,
                "pocs_generated": len(existing_pocs)
            }
        }
    
    try:
        # Update scan status to running LLM
        if scan.status == ScanStatus.SAST_COMPLETED:
            scan.status = ScanStatus.RUNNING_LLM
            db.commit()
        
        # ============================================================
        # ⚠️ MOCK LOCATION #2 - LLM ANALYZER INTEGRATION (MAIN)
        # ============================================================
        # TODO: Replace this entire mock section with actual LLM Module call
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
        #   - Vulnerability records
        #   - Report records  
        #   - PoC records (for True Positives)
        #
        # See: INTEGRATION_GUIDE.md - Section "MOCK LOCATION #2: LLM Analyzer"
        # ============================================================
        
        # ============================================================
        # ⚠️ MOCK DATA - Random realistic vulnerability data
        # ============================================================
        # TODO: Remove after implementing real LLM integration
        # ============================================================
        
        # Mock data templates for each vulnerability type
        mock_data = {
            'sql_injection': {
                'cwe_id': 'CWE-89',
                'files': [
                    'src/main/java/com/app/dao/UserDAO.java',
                    'src/main/java/com/app/dao/ProductDAO.java',
                    'src/main/java/com/app/repository/OrderRepository.java',
                    'src/main/java/com/app/service/AuthService.java',
                    'src/main/java/com/app/controller/SearchController.java',
                    'src/main/java/com/app/api/AdminAPI.java',
                ],
                'titles': [
                    'SQL Injection in user authentication query',
                    'SQL Injection in product search functionality',
                    'SQL Injection in order lookup by ID',
                    'SQL Injection in dynamic table name construction',
                    'SQL Injection in admin dashboard filter',
                    'SQL Injection in report generation query',
                ],
                'descriptions_tp': [
                    'User input is directly concatenated into SQL query without sanitization. Attacker can inject malicious SQL to bypass authentication or extract sensitive data.',
                    'The search parameter is vulnerable to SQL injection. An attacker could use UNION-based injection to extract database contents.',
                    'Order ID parameter is not properly validated, allowing SQL injection attacks that could expose customer information.',
                    'Dynamic SQL construction using string concatenation allows table name injection, potentially accessing unauthorized data.',
                    'Admin filter parameters are passed directly to SQL query, enabling privilege escalation through injection.',
                    'Report date range parameters are vulnerable to time-based blind SQL injection.',
                ],
                'descriptions_fp': [
                    'Parameter is sanitized using PreparedStatement. The pattern detected is a false positive.',
                    'Input validation and parameterized queries prevent actual exploitation.',
                    'ORM framework handles escaping automatically, no real vulnerability exists.',
                    'Whitelist validation ensures only valid table names are accepted.',
                    'Input is validated against regex pattern before use in query.',
                    'Stored procedure with proper parameter binding prevents injection.',
                ],
                'recommendations': [
                    'Use PreparedStatement with parameterized queries instead of string concatenation.',
                    'Implement input validation and use ORM frameworks like Hibernate.',
                    'Apply the principle of least privilege for database accounts.',
                    'Use stored procedures with proper parameter binding.',
                    'Implement Web Application Firewall (WAF) rules for SQL injection patterns.',
                ],
                'code_snippets': [
                    'String query = "SELECT * FROM users WHERE username=\'" + username + "\' AND password=\'" + password + "\'";',
                    'String sql = "SELECT * FROM products WHERE name LIKE \'%" + searchTerm + "%\'";',
                    'stmt.executeQuery("SELECT * FROM orders WHERE id = " + orderId);',
                    'String tableName = request.getParameter("table"); rs = stmt.executeQuery("SELECT * FROM " + tableName);',
                    'String filter = "SELECT * FROM admin_logs WHERE " + filterColumn + " = \'" + filterValue + "\'";',
                ],
                'sandbox_success': [
                    '[SANDBOX] SQL Injection successful! Extracted 150 user records including passwords.',
                    '[SANDBOX] UNION-based injection worked. Database schema exposed.',
                    '[SANDBOX] Authentication bypassed using \' OR 1=1 -- payload.',
                    '[SANDBOX] Time-based blind injection confirmed. Data extraction possible.',
                ],
                'sandbox_fail': [
                    '[SANDBOX] Injection attempt blocked by PreparedStatement.',
                    '[SANDBOX] Input validation rejected malicious payload.',
                    '[SANDBOX] WAF blocked the SQL injection pattern.',
                    '[SANDBOX] Parameterized query prevented exploitation.',
                ],
            },
            'xss': {
                'cwe_id': 'CWE-79',
                'files': [
                    'src/main/webapp/views/profile.jsp',
                    'src/main/webapp/views/search-results.jsp',
                    'src/main/webapp/views/comments.jsp',
                    'src/main/java/com/app/controller/MessageController.java',
                    'src/main/resources/templates/dashboard.html',
                    'src/main/webapp/js/user-input.js',
                ],
                'titles': [
                    'Reflected XSS in user profile display',
                    'Stored XSS in search results page',
                    'DOM-based XSS in comment section',
                    'XSS in error message rendering',
                    'Persistent XSS in dashboard widget',
                    'XSS through URL parameter reflection',
                ],
                'descriptions_tp': [
                    'User-supplied data is rendered without encoding, allowing script injection that executes in victim browsers.',
                    'Search query is reflected in page without proper HTML encoding, enabling reflected XSS attacks.',
                    'Comment content is stored and displayed without sanitization, allowing persistent XSS.',
                    'Error messages include user input without encoding, vulnerable to reflected XSS.',
                    'Dashboard widgets render user data using innerHTML without sanitization.',
                    'URL parameters are directly inserted into DOM using document.write().',
                ],
                'descriptions_fp': [
                    'Output is properly encoded using OWASP encoder library.',
                    'Content Security Policy (CSP) headers prevent script execution.',
                    'React/Angular framework automatically escapes output.',
                    'Server-side template engine escapes HTML by default.',
                    'HttpOnly cookies prevent session hijacking even if XSS exists.',
                    'Input is sanitized using DOMPurify before rendering.',
                ],
                'recommendations': [
                    'Implement proper output encoding using context-aware escaping.',
                    'Use Content Security Policy (CSP) headers to prevent inline script execution.',
                    'Sanitize user input using libraries like DOMPurify or OWASP Java Encoder.',
                    'Use modern frameworks that auto-escape output (React, Angular, Vue).',
                    'Set HttpOnly and Secure flags on session cookies.',
                ],
                'code_snippets': [
                    '<div>Welcome, <%= request.getParameter("name") %></div>',
                    'document.getElementById("results").innerHTML = searchQuery;',
                    '<span th:utext="${userComment}"></span>',
                    'response.getWriter().println("<p>Error: " + errorMsg + "</p>");',
                    'element.innerHTML = userData.bio;',
                ],
                'sandbox_success': [
                    '[SANDBOX] XSS payload executed! Alert box triggered with document.cookie.',
                    '[SANDBOX] Stored XSS persisted. Script executes on page load.',
                    '[SANDBOX] DOM manipulation successful. Fake login form injected.',
                    '[SANDBOX] Session token extracted via XSS payload.',
                ],
                'sandbox_fail': [
                    '[SANDBOX] CSP blocked inline script execution.',
                    '[SANDBOX] Output encoding prevented script injection.',
                    '[SANDBOX] DOMPurify sanitized the malicious payload.',
                    '[SANDBOX] HttpOnly cookie prevented session theft.',
                ],
            },
            'command_injection': {
                'cwe_id': 'CWE-78',
                'files': [
                    'src/main/java/com/app/util/SystemUtils.java',
                    'src/main/java/com/app/service/BackupService.java',
                    'src/main/java/com/app/controller/DiagnosticController.java',
                    'src/main/java/com/app/util/FileProcessor.java',
                    'src/main/java/com/app/service/PdfGenerator.java',
                    'src/main/java/com/app/util/NetworkUtils.java',
                ],
                'titles': [
                    'OS Command Injection in system utility function',
                    'Command Injection in backup filename parameter',
                    'Command Injection in diagnostic ping functionality',
                    'Command Injection in file processing utility',
                    'Command Injection in PDF generation service',
                    'Command Injection in network diagnostic tool',
                ],
                'descriptions_tp': [
                    'User input is passed directly to Runtime.exec() without validation, allowing arbitrary command execution.',
                    'Backup filename parameter is concatenated into shell command, enabling command injection.',
                    'Ping target address is not validated, allowing command chaining with semicolon or pipe.',
                    'File path parameter is used in shell command without sanitization.',
                    'PDF conversion uses external tool with unsanitized filename parameter.',
                    'Network diagnostic accepts IP/hostname that is passed to system commands.',
                ],
                'descriptions_fp': [
                    'ProcessBuilder with argument array prevents command injection.',
                    'Input is validated against strict whitelist of allowed characters.',
                    'Command is executed with no user-controlled parameters.',
                    'Sandboxed execution environment limits command impact.',
                    'Input validation rejects shell metacharacters.',
                    'Using Java native APIs instead of shell commands.',
                ],
                'recommendations': [
                    'Use ProcessBuilder with argument arrays instead of Runtime.exec() with concatenated strings.',
                    'Implement strict input validation using whitelist approach.',
                    'Avoid passing user input to system commands when possible.',
                    'Use language-native APIs instead of shell commands (e.g., Java NIO for file operations).',
                    'Run commands in sandboxed/containerized environment with minimal privileges.',
                ],
                'code_snippets': [
                    'Runtime.getRuntime().exec("ping -c 4 " + hostname);',
                    'Process p = Runtime.getRuntime().exec("tar -czf " + filename + ".tar.gz /backup");',
                    'String cmd = "convert " + inputFile + " " + outputFile; Runtime.getRuntime().exec(cmd);',
                    'ProcessBuilder pb = new ProcessBuilder("sh", "-c", "cat " + userFile);',
                    'String[] cmd = {"/bin/sh", "-c", "nslookup " + domain};',
                ],
                'sandbox_success': [
                    '[SANDBOX] Command injection successful! Executed: id; cat /etc/passwd',
                    '[SANDBOX] Reverse shell established via command injection.',
                    '[SANDBOX] File system access gained through command chaining.',
                    '[SANDBOX] Arbitrary file read achieved using command injection.',
                ],
                'sandbox_fail': [
                    '[SANDBOX] ProcessBuilder argument array prevented injection.',
                    '[SANDBOX] Input validation blocked shell metacharacters.',
                    '[SANDBOX] Sandboxed environment restricted command execution.',
                    '[SANDBOX] Whitelist validation rejected malicious input.',
                ],
            },
        }
        
        # Get mock data for this vulnerability type
        vuln_mock = mock_data[vuln_type_normalized]
        
        # ============================================================
        # Random TP/FP distribution for diverse chart percentages
        # ============================================================
        # Scenarios for different TP/FP ratios:
        # - High TP (70-90%): Many real vulnerabilities found
        # - Balanced (40-60%): Mixed findings
        # - High FP (70-90%): Many false alarms
        # - Edge cases: All TP or mostly FP
        # ============================================================
        
        total_findings = random.randint(4, 10)
        
        # Random scenario selection for diverse percentages
        scenario = random.choice([
            'high_tp',      # 70-90% TP
            'high_tp',      # Weight towards high TP (more realistic)
            'balanced',     # 40-60% TP  
            'balanced',     # Weight towards balanced
            'high_fp',      # 70-90% FP
            'mostly_tp',    # 80-95% TP
            'mostly_fp',    # 80-95% FP
        ])
        
        if scenario == 'high_tp':
            # 70-90% True Positives
            tp_ratio = random.uniform(0.7, 0.9)
        elif scenario == 'balanced':
            # 40-60% True Positives
            tp_ratio = random.uniform(0.4, 0.6)
        elif scenario == 'high_fp':
            # Only 10-30% True Positives (high false positive rate)
            tp_ratio = random.uniform(0.1, 0.3)
        elif scenario == 'mostly_tp':
            # 80-95% True Positives
            tp_ratio = random.uniform(0.8, 0.95)
        else:  # mostly_fp
            # Only 5-20% True Positives
            tp_ratio = random.uniform(0.05, 0.2)
        
        tp_count = max(1, min(total_findings - 1, round(total_findings * tp_ratio)))
        fp_count = total_findings - tp_count
        
        # Ensure at least 1 of each type for chart visibility
        if fp_count == 0:
            fp_count = 1
            tp_count = total_findings - 1
        if tp_count == 0:
            tp_count = 1
            fp_count = total_findings - 1
        
        reports_generated = []
        pocs_generated = 0
        
        # Shuffle indices for random selection
        indices = list(range(len(vuln_mock['files'])))
        random.shuffle(indices)
        
        # Create vulnerabilities and reports in database
        for i in range(total_findings):
            is_tp = i < tp_count
            idx = indices[i % len(indices)]
            
            # Random severity based on TP/FP
            if is_tp:
                severity = random.choice([VulnerabilitySeverity.CRITICAL, VulnerabilitySeverity.HIGH])
            else:
                severity = random.choice([VulnerabilitySeverity.LOW, VulnerabilitySeverity.MEDIUM, VulnerabilitySeverity.INFO])
            
            # Get description based on classification
            description = random.choice(vuln_mock['descriptions_tp'] if is_tp else vuln_mock['descriptions_fp'])
            
            # Random confidence score
            confidence = random.randint(75, 98) if is_tp else random.randint(60, 85)
            
            # Create vulnerability record
            vuln = Vulnerability(
                scan_id=scan_id,
                title=vuln_mock['titles'][idx % len(vuln_mock['titles'])],
                description=description,
                severity=severity,
                status=VulnerabilityStatus.TRUE_POSITIVE if is_tp else VulnerabilityStatus.FALSE_POSITIVE,
                sast_json_path=f"C:\\tmp\\{project.name}\\result\\{vuln_type_normalized}_results.json",
                cwe_id=vuln_mock['cwe_id'],
                file_path=vuln_mock['files'][idx % len(vuln_mock['files'])],
                line_number=random.randint(15, 350),
                code_snippet=vuln_mock['code_snippets'][idx % len(vuln_mock['code_snippets'])] if is_tp else None,
                is_false_positive=not is_tp,
                llm_confidence_score=f"{confidence}%",
                recommendation=random.choice(vuln_mock['recommendations']) if is_tp else "No action required - verified as false positive."
            )
            db.add(vuln)
            db.flush()
            
            # Create report record
            report_type = ReportType.TRUE_POSITIVE if is_tp else ReportType.FALSE_POSITIVE
            report_type_str = "TP" if is_tp else "FP"
            report_path = f"C:\\tmp\\{project.name}\\{report_type_str}\\report\\{report_type_str}_{vuln_type_normalized}_{i+1}_report.html"
            
            # Generate detailed report content
            if is_tp:
                details = f"""LLM Analysis Result: TRUE POSITIVE (Confidence: {confidence}%)

Vulnerability Details:
- Type: {vuln_type_display[vuln_type_normalized]}
- CWE: {vuln_mock['cwe_id']}
- File: {vuln.file_path}
- Line: {vuln.line_number}

Description:
{description}

Code Pattern Detected:
{vuln.code_snippet}

Risk Assessment:
This vulnerability poses a {severity.value} risk to the application security."""
            else:
                details = f"""LLM Analysis Result: FALSE POSITIVE (Confidence: {confidence}%)

Analysis:
{description}

Reason for Classification:
After thorough analysis, the LLM determined this finding is a false positive due to existing security controls."""
            
            report = Report(
                scan_id=scan_id,
                vulnerability_id=vuln.id,
                report_type=report_type,
                report_path=report_path,
                llm_analysis_mode=current_user.llm_analysis_mode,
                llm_confidence=f"{confidence}%",
                summary=f"{vuln_type_display[vuln_type_normalized]}: {vuln.title}",
                details=details,
                recommendations=vuln.recommendation
            )
            db.add(report)
            
            # ============================================================
            # ⚠️ MOCK POC GENERATION - For True Positives only
            # ============================================================
            # PoC is created but NOT verified yet
            # User must click "Verify PoC" to run Sandbox and determine Real/Poor
            # ============================================================
            if is_tp:
                poc_filename = f"poc_{vuln_type_normalized}_{i+1}.py"
                
                # PoC initially saved to pending folder (not yet verified)
                poc_path = f"C:\\tmp\\{project.name}\\TP\\PoC\\pending\\{poc_filename}"
                
                poc = PoC(
                    vulnerability_id=vuln.id,
                    poc_type=PoCType.REAL_POC,  # Default, will be updated after verification
                    poc_name=poc_filename,
                    poc_path=poc_path,
                    description=f"Proof of Concept for {vuln.title}. Click 'Verify PoC' to test in Sandbox.",
                    is_downloadable=False,  # Not downloadable until verified
                    sandbox_tested=False,   # NOT YET TESTED
                    exploit_successful=None,  # Unknown until verified
                    sandbox_result=None  # Will be filled after Sandbox verification
                )
                db.add(poc)
                pocs_generated += 1
            
            reports_generated.append({
                "type": report_type_str,
                "path": report_path
            })
        
        # Check if all vulnerability types have been analyzed
        all_vuln_types_analyzed = True
        for vt in valid_types:
            vt_display = vuln_type_display[vt]
            existing = db.query(Vulnerability).filter(
                Vulnerability.scan_id == scan_id,
                Vulnerability.title.like(f"%{vt_display}%"),
                Vulnerability.status.in_([VulnerabilityStatus.TRUE_POSITIVE, VulnerabilityStatus.FALSE_POSITIVE])
            ).first()
            if not existing and vt != vuln_type_normalized:
                all_vuln_types_analyzed = False
                break
        
        # Update scan status if all types are analyzed
        if all_vuln_types_analyzed:
            scan.status = ScanStatus.COMPLETED
            scan.llm_completed_at = datetime.now()
            scan.completed_at = datetime.now()
        
        db.commit()
        
        return {
            "scan_id": scan_id,
            "vulnerability_type": vulnerability_type,
            "status": "completed",
            "message": f"LLM analysis completed for {vulnerability_type}",
            "results": {
                "vulnerability_type": vulnerability_type,
                "total_findings": total_findings,
                "true_positives": tp_count,
                "false_positives": fp_count,
                "reports_generated": reports_generated,
                "pocs_generated": pocs_generated
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed for {vulnerability_type}: {str(e)}"
        )
