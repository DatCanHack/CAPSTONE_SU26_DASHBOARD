# Super SAST - Module Integration Guide

Tài liệu này hướng dẫn cách tích hợp các module thật vào hệ thống để thay thế các phần mock hiện tại.

## Tổng quan kiến trúc

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │ ──▶ │    SAST     │ ──▶ │     LLM     │ ──▶ │   Sandbox   │
│  Source     │     │   Scanner   │     │   Analyzer  │     │   Module    │
│   ✅ DONE   │     │  ⚠️ MOCK    │     │  ⚠️ MOCK    │     │  ⚠️ MOCK    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    /tmp/{project}/     Vulnerability +      PoC verified
                    result/*.json       Report records       Real/Poor PoC
```

---

## 📍 MOCK LOCATION #1: SAST Scanner

### File: `app/services/sast_scanner.py`

### Vị trí mock (lines 109-164):
```python
def _run_snyk(self, source_code_path: str) -> List[Dict[str, Any]]:
    """Run Snyk scan."""
    # ⚠️ TODO: MOCK - Implement actual Snyk integration
    # Example: subprocess.run(['snyk', 'test', source_code_path])
    return [
        {
            "tool": "snyk",
            "type": "SQL Injection",
            ...  # MOCK DATA
        }
    ]

def _run_semgrep(self, source_code_path: str) -> List[Dict[str, Any]]:
    # ⚠️ TODO: MOCK - Implement actual Semgrep integration
    ...

def _run_codeql(self, source_code_path: str) -> List[Dict[str, Any]]:
    # ⚠️ TODO: MOCK - Implement actual CodeQL integration
    ...
```

### Cách tích hợp:

```python
import subprocess
import json

def _run_snyk(self, source_code_path: str) -> List[Dict[str, Any]]:
    """Run Snyk scan - REAL IMPLEMENTATION."""
    try:
        # Chạy Snyk CLI
        result = subprocess.run(
            ['snyk', 'test', '--json', source_code_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        # Parse JSON output
        snyk_output = json.loads(result.stdout)
        
        # Transform Snyk output sang format chuẩn
        vulnerabilities = []
        for vuln in snyk_output.get('vulnerabilities', []):
            vulnerabilities.append({
                "tool": "snyk",
                "type": vuln.get('title'),
                "severity": vuln.get('severity', 'MEDIUM').upper(),
                "file": vuln.get('from', ['unknown'])[0],
                "line": vuln.get('line', 0),
                "description": vuln.get('description'),
                "cwe": vuln.get('identifiers', {}).get('CWE', [''])[0],
                "discovered_at": datetime.now().isoformat()
            })
        
        return vulnerabilities
        
    except subprocess.TimeoutExpired:
        raise Exception("Snyk scan timed out")
    except json.JSONDecodeError:
        raise Exception("Failed to parse Snyk output")
    except FileNotFoundError:
        raise Exception("Snyk CLI not found. Please install: npm install -g snyk")


def _run_semgrep(self, source_code_path: str) -> List[Dict[str, Any]]:
    """Run Semgrep scan - REAL IMPLEMENTATION."""
    try:
        result = subprocess.run(
            ['semgrep', '--config=auto', '--json', source_code_path],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        semgrep_output = json.loads(result.stdout)
        
        vulnerabilities = []
        for finding in semgrep_output.get('results', []):
            vulnerabilities.append({
                "tool": "semgrep",
                "type": finding.get('check_id', 'Unknown'),
                "severity": finding.get('extra', {}).get('severity', 'MEDIUM').upper(),
                "file": finding.get('path'),
                "line": finding.get('start', {}).get('line', 0),
                "description": finding.get('extra', {}).get('message'),
                "cwe": finding.get('extra', {}).get('metadata', {}).get('cwe', ''),
                "discovered_at": datetime.now().isoformat()
            })
        
        return vulnerabilities
        
    except Exception as e:
        raise Exception(f"Semgrep scan failed: {str(e)}")


def _run_codeql(self, source_code_path: str) -> List[Dict[str, Any]]:
    """Run CodeQL scan - REAL IMPLEMENTATION."""
    try:
        # Step 1: Create CodeQL database
        db_path = f"/tmp/codeql_db_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        subprocess.run(
            ['codeql', 'database', 'create', db_path, 
             '--language=java',  # hoặc detect language
             '--source-root=' + source_code_path],
            capture_output=True,
            timeout=600
        )
        
        # Step 2: Run analysis
        result = subprocess.run(
            ['codeql', 'database', 'analyze', db_path,
             '--format=sarif-latest',
             '--output=/tmp/codeql_results.sarif'],
            capture_output=True,
            timeout=600
        )
        
        # Step 3: Parse SARIF output
        with open('/tmp/codeql_results.sarif', 'r') as f:
            sarif_output = json.load(f)
        
        vulnerabilities = []
        for run in sarif_output.get('runs', []):
            for result in run.get('results', []):
                vulnerabilities.append({
                    "tool": "codeql",
                    "type": result.get('ruleId'),
                    "severity": result.get('level', 'warning').upper(),
                    "file": result.get('locations', [{}])[0].get('physicalLocation', {}).get('artifactLocation', {}).get('uri'),
                    "line": result.get('locations', [{}])[0].get('physicalLocation', {}).get('region', {}).get('startLine', 0),
                    "description": result.get('message', {}).get('text'),
                    "cwe": "",  # Extract from rule metadata
                    "discovered_at": datetime.now().isoformat()
                })
        
        return vulnerabilities
        
    except Exception as e:
        raise Exception(f"CodeQL scan failed: {str(e)}")
```

### Output format chuẩn:
```json
{
    "tool": "snyk|semgrep|codeql",
    "type": "SQL Injection|XSS|Command Injection|...",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
    "file": "path/to/vulnerable/file.java",
    "line": 45,
    "description": "Description of the vulnerability",
    "cwe": "CWE-89",
    "discovered_at": "2024-01-15T10:30:00"
}
```

---

## 📍 MOCK LOCATION #2: LLM Analyzer (Main Integration Point)

### File: `app/api/scans.py`

### Vị trí mock (lines 419-480):
```python
@router.post("/{scan_id}/analyze-vulnerability-type")
async def analyze_vulnerability_type(...):
    ...
    # ⚠️ TODO: MOCK - Replace with actual LLM Module call (lines 419-480)
    # 
    # Expected call:
    # llm_results = llm_analyzer.analyze_vulnerability_type(
    #     scan_id=scan_id,
    #     vulnerability_type=vulnerability_type,
    #     sast_results_path=scan.sast_output_path,
    #     project_name=project.name,
    #     analysis_mode=current_user.llm_analysis_mode
    # )
    
    # ⚠️ MOCK: Random FP/TP generation
    total_findings = random.randint(3, 8)
    tp_count = random.randint(1, total_findings - 1)
    fp_count = total_findings - tp_count
```

### Cách tích hợp:

**Bước 1:** Tạo interface trong `app/services/llm_analyzer.py`:

```python
def analyze_vulnerability_type(
    self,
    scan_id: int,
    vulnerability_type: str,
    sast_results_path: str,
    project_name: str,
    analysis_mode: str = "fine_tune",
    gemini_api_key: str = None
) -> Dict[str, Any]:
    """
    Analyze a specific vulnerability type using LLM.
    
    Args:
        scan_id: The scan ID
        vulnerability_type: 'sql_injection' | 'xss' | 'command_injection'
        sast_results_path: Path to SAST JSON results
        project_name: Project name
        analysis_mode: 'fine_tune' | 'gemini_api'
        gemini_api_key: Gemini API key (required if mode is gemini_api)
    
    Returns:
        {
            "findings": [
                {
                    "is_true_positive": True/False,
                    "confidence_score": 0.95,
                    "reasoning": "LLM explanation...",
                    "vulnerability_info": {
                        "title": "SQL Injection in login",
                        "description": "...",
                        "severity": "HIGH",
                        "cwe_id": "CWE-89",
                        "file_path": "src/auth.java",
                        "line_number": 45,
                        "code_snippet": "String query = \"SELECT * FROM users WHERE...\"",
                        "recommendation": "Use parameterized queries..."
                    },
                    "poc": {  # Only if is_true_positive
                        "poc_code": "...",
                        "poc_name": "poc_sqli_auth.py",
                        "description": "PoC to exploit SQL injection..."
                    }
                },
                ...
            ],
            "summary": {
                "total": 5,
                "true_positives": 3,
                "false_positives": 2
            }
        }
    """
    
    # 1. Read SAST results
    sast_results = self._read_sast_results(sast_results_path, vulnerability_type)
    
    # 2. Choose analysis method
    if analysis_mode == "gemini_api":
        results = self._analyze_with_gemini(sast_results, gemini_api_key)
    else:  # fine_tune
        results = self._analyze_with_fine_tune(sast_results)
    
    return results


def _analyze_with_gemini(self, sast_results: List[Dict], api_key: str) -> Dict:
    """Use Gemini API for analysis."""
    import google.generativeai as genai
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
    
    findings = []
    for result in sast_results:
        prompt = f"""
        Analyze this SAST finding and determine if it's a True Positive or False Positive:
        
        Tool: {result.get('tool')}
        Type: {result.get('type')}
        File: {result.get('file')}
        Line: {result.get('line')}
        Description: {result.get('description')}
        Code context: {result.get('code_snippet', 'N/A')}
        
        Respond in JSON format:
        {{
            "is_true_positive": true/false,
            "confidence_score": 0.0-1.0,
            "reasoning": "explanation...",
            "recommendation": "how to fix if TP..."
        }}
        """
        
        response = model.generate_content(prompt)
        llm_result = json.loads(response.text)
        
        finding = {
            "is_true_positive": llm_result["is_true_positive"],
            "confidence_score": llm_result["confidence_score"],
            "reasoning": llm_result["reasoning"],
            "vulnerability_info": {
                "title": result.get('type'),
                "description": result.get('description'),
                "severity": result.get('severity'),
                "cwe_id": result.get('cwe'),
                "file_path": result.get('file'),
                "line_number": result.get('line'),
                "recommendation": llm_result.get("recommendation")
            }
        }
        
        # Generate PoC if True Positive
        if llm_result["is_true_positive"]:
            poc = self._generate_poc_with_gemini(result, api_key)
            finding["poc"] = poc
        
        findings.append(finding)
    
    return {
        "findings": findings,
        "summary": {
            "total": len(findings),
            "true_positives": sum(1 for f in findings if f["is_true_positive"]),
            "false_positives": sum(1 for f in findings if not f["is_true_positive"])
        }
    }


def _analyze_with_fine_tune(self, sast_results: List[Dict]) -> Dict:
    """Use fine-tuned model for analysis."""
    # TODO: Implement your fine-tuned model inference
    # Example using Hugging Face transformers:
    #
    # from transformers import AutoModelForSequenceClassification, AutoTokenizer
    # model = AutoModelForSequenceClassification.from_pretrained("your-fine-tuned-model")
    # tokenizer = AutoTokenizer.from_pretrained("your-fine-tuned-model")
    #
    # inputs = tokenizer(sast_result_text, return_tensors="pt")
    # outputs = model(**inputs)
    # prediction = outputs.logits.argmax(-1).item()  # 0=FP, 1=TP
    
    raise NotImplementedError("Fine-tune model not yet integrated")
```

**Bước 2:** Cập nhật `app/api/scans.py` để gọi LLM thật:

```python
@router.post("/{scan_id}/analyze-vulnerability-type")
async def analyze_vulnerability_type(
    scan_id: int,
    vulnerability_type: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # ... existing validation code ...
    
    try:
        # ✅ REAL IMPLEMENTATION - Call LLM Module
        llm_results = llm_analyzer.analyze_vulnerability_type(
            scan_id=scan_id,
            vulnerability_type=vulnerability_type,
            sast_results_path=scan.sast_output_path,
            project_name=project.name,
            analysis_mode=current_user.llm_analysis_mode,
            gemini_api_key=current_user.gemini_api_key
        )
        
        # Save results to database
        for finding in llm_results["findings"]:
            is_tp = finding["is_true_positive"]
            
            # Create Vulnerability record
            vuln = Vulnerability(
                scan_id=scan_id,
                title=finding["vulnerability_info"]["title"],
                description=finding["vulnerability_info"]["description"],
                severity=VulnerabilitySeverity[finding["vulnerability_info"]["severity"]],
                status=VulnerabilityStatus.TRUE_POSITIVE if is_tp else VulnerabilityStatus.FALSE_POSITIVE,
                cwe_id=finding["vulnerability_info"]["cwe_id"],
                file_path=finding["vulnerability_info"]["file_path"],
                line_number=finding["vulnerability_info"]["line_number"],
                is_false_positive=not is_tp,
                llm_confidence_score=str(finding["confidence_score"])
            )
            db.add(vuln)
            db.flush()
            
            # Create Report record
            report = Report(
                scan_id=scan_id,
                vulnerability_id=vuln.id,
                report_type=ReportType.TRUE_POSITIVE if is_tp else ReportType.FALSE_POSITIVE,
                summary=finding["vulnerability_info"]["title"],
                details=finding["reasoning"],
                recommendations=finding["vulnerability_info"]["recommendation"],
                llm_confidence=str(finding["confidence_score"])
            )
            db.add(report)
            
            # Create PoC if True Positive
            if is_tp and finding.get("poc"):
                poc = PoC(
                    vulnerability_id=vuln.id,
                    poc_code=finding["poc"]["poc_code"],
                    poc_name=finding["poc"]["poc_name"],
                    description=finding["poc"]["description"],
                    is_verified=False  # Will be verified by Sandbox
                )
                db.add(poc)
        
        db.commit()
        
        return {
            "scan_id": scan_id,
            "vulnerability_type": vulnerability_type,
            "status": "completed",
            "results": llm_results["summary"]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM analysis failed: {str(e)}"
        )
```

---

## 📍 MOCK LOCATION #3: Sandbox Module

### File: `app/services/sandbox.py`

### Vị trí mock:
```python
def verify_poc(self, poc_file_path: str, vulnerability_info: Dict) -> Dict:
    # ⚠️ TODO: MOCK - Implement actual sandbox verification
    return {
        "exploitable": True,  # MOCK - always returns True
        "output": "Mock verification result",
        ...
    }
```

### Cách tích hợp:

```python
import docker
import tempfile
import os

class SandboxModule:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.sandbox_image = "your-sandbox-image:latest"
    
    def verify_poc(
        self,
        poc_file_path: str,
        vulnerability_info: Dict,
        target_app_path: str = None
    ) -> Dict[str, Any]:
        """
        Verify PoC in isolated Docker sandbox.
        
        Args:
            poc_file_path: Path to PoC script
            vulnerability_info: Info about the vulnerability
            target_app_path: Path to target application (optional)
        
        Returns:
            {
                "exploitable": True/False,
                "output": "Execution output...",
                "error": "Error message if failed",
                "execution_time": 5.2,
                "sandbox_logs": "..."
            }
        """
        
        try:
            # 1. Create temporary directory for sandbox
            with tempfile.TemporaryDirectory() as sandbox_dir:
                # 2. Copy PoC to sandbox directory
                poc_filename = os.path.basename(poc_file_path)
                sandbox_poc_path = os.path.join(sandbox_dir, poc_filename)
                shutil.copy(poc_file_path, sandbox_poc_path)
                
                # 3. Create Docker container with resource limits
                container = self.docker_client.containers.run(
                    self.sandbox_image,
                    command=f"python /sandbox/{poc_filename}",
                    volumes={
                        sandbox_dir: {'bind': '/sandbox', 'mode': 'ro'}
                    },
                    network_mode='none',  # No network access
                    mem_limit='256m',
                    cpu_period=100000,
                    cpu_quota=50000,  # 50% CPU
                    detach=True,
                    remove=False
                )
                
                # 4. Wait for execution with timeout
                start_time = time.time()
                result = container.wait(timeout=30)
                execution_time = time.time() - start_time
                
                # 5. Get output
                logs = container.logs().decode('utf-8')
                
                # 6. Analyze result
                exit_code = result.get('StatusCode', 1)
                exploitable = self._analyze_exploitation_result(
                    exit_code, logs, vulnerability_info
                )
                
                # 7. Cleanup
                container.remove()
                
                return {
                    "exploitable": exploitable,
                    "output": logs,
                    "error": None if exit_code == 0 else f"Exit code: {exit_code}",
                    "execution_time": execution_time,
                    "sandbox_logs": logs
                }
                
        except docker.errors.ContainerError as e:
            return {
                "exploitable": False,
                "output": str(e),
                "error": "Container execution failed",
                "execution_time": 0,
                "sandbox_logs": str(e)
            }
        except Exception as e:
            return {
                "exploitable": False,
                "output": "",
                "error": str(e),
                "execution_time": 0,
                "sandbox_logs": ""
            }
    
    def _analyze_exploitation_result(
        self,
        exit_code: int,
        logs: str,
        vulnerability_info: Dict
    ) -> bool:
        """
        Analyze if the PoC successfully exploited the vulnerability.
        
        Logic depends on vulnerability type:
        - SQL Injection: Check for data extraction
        - XSS: Check for script execution
        - Command Injection: Check for command output
        """
        vuln_type = vulnerability_info.get('type', '').lower()
        
        if 'sql' in vuln_type:
            # SQL Injection - check for database data in output
            indicators = ['password', 'admin', 'user', 'SELECT', 'extracted']
            return any(ind.lower() in logs.lower() for ind in indicators)
        
        elif 'xss' in vuln_type:
            # XSS - check for script execution indicators
            indicators = ['alert', 'document.cookie', 'XSS', 'executed']
            return any(ind.lower() in logs.lower() for ind in indicators)
        
        elif 'command' in vuln_type:
            # Command Injection - check for command output
            return exit_code == 0 and len(logs) > 0
        
        else:
            # Generic check
            return exit_code == 0


# Global instance
sandbox_module = SandboxModule()
```

### Dockerfile cho Sandbox:
```dockerfile
# sandbox/Dockerfile
FROM python:3.11-slim

# Security: Run as non-root user
RUN useradd -m -s /bin/bash sandbox
USER sandbox

# Install common dependencies
RUN pip install --no-cache-dir requests beautifulsoup4 sqlalchemy

WORKDIR /sandbox

# No network, limited resources enforced at runtime
```

---

## 📍 MOCK LOCATION #4: PoC Generator (trong LLM Analyzer)

### File: `app/services/llm_analyzer.py` và `app/api/scans.py`

### Vị trí mock trong `app/api/scans.py` (lines 495-527):
```python
# ============================================================
# ⚠️ MOCK POC GENERATION - For True Positives only
# ============================================================
# TODO: Replace with actual LLM Module PoC generation
# Real flow: LLM generates PoC code → Sandbox verifies → Classify as Real/Poor
# ============================================================
if is_tp:
    poc_filename = f"poc_{vuln_type_normalized}_{i+1}.py"
    
    # Mock: Randomly classify as Real or Poor PoC
    is_real_poc = random.choice([True, False])
    poc_type_folder = "Real_PoC" if is_real_poc else "Poor_PoC"
    poc_path = f"C:\\tmp\\{project.name}\\TP\\PoC\\{poc_type_folder}\\{poc_filename}"
    
    # Mock sandbox result
    sandbox_result = (
        "[SANDBOX] Exploit executed successfully. Vulnerability confirmed."
        if is_real_poc else
        "[SANDBOX] Exploit failed. Could not reproduce vulnerability."
    )
    
    poc = PoC(
        vulnerability_id=vuln.id,
        poc_type=PoCType.REAL_POC if is_real_poc else PoCType.POOR_POC,
        poc_name=poc_filename,
        poc_path=poc_path,
        description=f"PoC for {vuln_type_display[vuln_type_normalized]} vulnerability",
        is_downloadable=True,
        sandbox_tested=True,
        exploit_successful=is_real_poc,
        sandbox_result=sandbox_result
    )
    db.add(poc)
```

### Vị trí mock (lines 197-212):
```python
def _generate_poc(self, sast_result: Dict[str, Any], vulnerability_type: str) -> str:
    # ⚠️ TODO: MOCK - Returns template PoC
    return f'''#!/usr/bin/env python3
...
def exploit():
    # TODO: LLM-generated exploit code
    pass
'''
```

### Cách tích hợp:

```python
def _generate_poc_with_gemini(
    self,
    vulnerability_info: Dict,
    api_key: str
) -> Dict[str, Any]:
    """Generate PoC using Gemini API."""
    import google.generativeai as genai
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
    Generate a Python Proof-of-Concept (PoC) script to demonstrate this vulnerability:
    
    Type: {vulnerability_info.get('type')}
    File: {vulnerability_info.get('file')}
    Line: {vulnerability_info.get('line')}
    Description: {vulnerability_info.get('description')}
    
    Requirements:
    1. The PoC should be safe and only demonstrate the vulnerability
    2. Include clear comments explaining each step
    3. Print "[SUCCESS]" if exploitation is successful
    4. Print "[FAILED]" if exploitation fails
    5. Include error handling
    
    Return ONLY the Python code, no explanations.
    """
    
    response = model.generate_content(prompt)
    poc_code = response.text
    
    # Clean up code (remove markdown if present)
    if poc_code.startswith('```python'):
        poc_code = poc_code[9:]
    if poc_code.endswith('```'):
        poc_code = poc_code[:-3]
    
    vuln_type_safe = vulnerability_info.get('type', 'unknown').lower().replace(' ', '_')
    
    return {
        "poc_code": poc_code.strip(),
        "poc_name": f"poc_{vuln_type_safe}.py",
        "description": f"PoC to exploit {vulnerability_info.get('type')} vulnerability"
    }
```

---

## Checklist tích hợp

### Phase 1: SAST Scanner
- [ ] Cài đặt Snyk CLI: `npm install -g snyk`
- [ ] Cài đặt Semgrep: `pip install semgrep`
- [ ] Cài đặt CodeQL CLI
- [ ] Implement `_run_snyk()` method
- [ ] Implement `_run_semgrep()` method
- [ ] Implement `_run_codeql()` method
- [ ] Test với sample vulnerable project

### Phase 2: LLM Analyzer
- [ ] Setup Gemini API key
- [ ] Implement `_analyze_with_gemini()` method
- [ ] Implement `_generate_poc_with_gemini()` method
- [ ] (Optional) Train fine-tuned model
- [ ] Implement `_analyze_with_fine_tune()` method
- [ ] Update `analyze_vulnerability_type` endpoint

### Phase 3: Sandbox Module
- [ ] Install Docker
- [ ] Create sandbox Docker image
- [ ] Implement `verify_poc()` method
- [ ] Implement `_analyze_exploitation_result()` logic
- [ ] Test with sample PoCs

### Phase 4: Integration Testing
- [ ] End-to-end test: Upload → SAST → LLM → Sandbox → Report
- [ ] Test với vulnerable Java project
- [ ] Test với các loại vulnerability khác nhau
- [ ] Performance testing

---

## Environment Variables cần thiết

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key
DOCKER_HOST=unix:///var/run/docker.sock
SANDBOX_IMAGE=super-sast-sandbox:latest
SAST_TIMEOUT=300
LLM_TIMEOUT=60
SANDBOX_TIMEOUT=30
```

---

## Liên hệ

Nếu cần hỗ trợ tích hợp, liên hệ team qua:
- Email: support@super-sast.dev
- Slack: #super-sast-integration
