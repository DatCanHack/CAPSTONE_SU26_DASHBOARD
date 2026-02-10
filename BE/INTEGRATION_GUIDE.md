# Huong dan tich hop Module

Tai lieu huong dan tich hop cac module that vao he thong.

## 1. Tong quan kien truc

```
Upload Source -> SAST Scanner -> LLM Analyzer -> Sandbox -> Ket qua
     (DONE)       (CHUA)          (CHUA)        (CHUA)
```

**Luu tru:**
- SAST: `/tmp/{project}/result/*.json`
- LLM: Vulnerability + Report records trong DB
- Sandbox: Real/Poor PoC

---

## 2. SAST Scanner

**File:** `app/services/sast_scanner.py`

**Cac method can implement:**
- `_run_snyk(source_code_path)` -> Hien tai raise NotImplementedError
- `_run_semgrep(source_code_path)` -> Hien tai raise NotImplementedError  
- `_run_codeql(source_code_path)` -> Hien tai raise NotImplementedError

**Cach tich hop Snyk:**
```python
def _run_snyk(self, source_code_path: str) -> List[Dict[str, Any]]:
    result = subprocess.run(
        ['snyk', 'test', '--json', source_code_path],
        capture_output=True, text=True, timeout=300
    )
    snyk_output = json.loads(result.stdout)
    
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
```

**Cach tich hop Semgrep:**
```python
def _run_semgrep(self, source_code_path: str) -> List[Dict[str, Any]]:
    result = subprocess.run(
        ['semgrep', '--config=auto', '--json', source_code_path],
        capture_output=True, text=True, timeout=300
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
```

**Cach tich hop CodeQL:**
```python
def _run_codeql(self, source_code_path: str) -> List[Dict[str, Any]]:
    db_path = f"/tmp/codeql_db_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Tao database
    subprocess.run(['codeql', 'database', 'create', db_path,
        '--language=java', '--source-root=' + source_code_path],
        capture_output=True, timeout=600)
    
    # Phan tich
    subprocess.run(['codeql', 'database', 'analyze', db_path,
        '--format=sarif-latest', '--output=/tmp/codeql_results.sarif'],
        capture_output=True, timeout=600)
    
    # Doc ket qua SARIF
    with open('/tmp/codeql_results.sarif', 'r') as f:
        sarif_output = json.load(f)
    
    vulnerabilities = []
    for run in sarif_output.get('runs', []):
        for result in run.get('results', []):
            loc = result.get('locations', [{}])[0].get('physicalLocation', {})
            vulnerabilities.append({
                "tool": "codeql",
                "type": result.get('ruleId'),
                "severity": result.get('level', 'warning').upper(),
                "file": loc.get('artifactLocation', {}).get('uri'),
                "line": loc.get('region', {}).get('startLine', 0),
                "description": result.get('message', {}).get('text'),
                "cwe": "",
                "discovered_at": datetime.now().isoformat()
            })
    return vulnerabilities
```

**Dinh dang output chuan:**
```json
{
  "tool": "snyk|semgrep|codeql",
  "type": "SQL Injection|XSS|Command Injection|...",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
  "file": "path/to/file.java",
  "line": 45,
  "description": "Mo ta loi",
  "cwe": "CWE-89",
  "discovered_at": "2024-01-15T10:30:00"
}
```

---

## 3. LLM Analyzer

**File:** `app/services/llm_analyzer.py`

**Cac method can implement:**
- `classify_vulnerability()` -> Hien tai raise NotImplementedError
- `generate_report()` -> Hien tai raise NotImplementedError
- `generate_poc()` -> Hien tai raise NotImplementedError

**Cach tich hop voi Gemini API:**
```python
def _analyze_with_gemini(self, sast_results: List[Dict], api_key: str) -> Dict:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')

    findings = []
    for result in sast_results:
        prompt = f"""
        Phan tich SAST finding va xac dinh True Positive hay False Positive:
        Tool: {result.get('tool')}
        Type: {result.get('type')}
        File: {result.get('file')}
        Line: {result.get('line')}
        Description: {result.get('description')}
        
        Tra ve JSON: {{"is_true_positive": true/false, "confidence_score": 0.0-1.0, "reasoning": "..."}}
        """
        response = model.generate_content(prompt)
        llm_result = json.loads(response.text)
        
        finding = {
            "is_true_positive": llm_result["is_true_positive"],
            "confidence_score": llm_result["confidence_score"],
            "reasoning": llm_result["reasoning"],
            "vulnerability_info": {...}
        }
        
        if llm_result["is_true_positive"]:
            finding["poc"] = self._generate_poc_with_gemini(result, api_key)
        
        findings.append(finding)
    
    return {"findings": findings, "summary": {...}}
```

**Tao PoC voi Gemini:**
```python
def _generate_poc_with_gemini(self, vulnerability_info: Dict, api_key: str) -> Dict:
    prompt = f"""
    Tao Python PoC script cho vulnerability:
    Type: {vulnerability_info.get('type')}
    File: {vulnerability_info.get('file')}
    Description: {vulnerability_info.get('description')}
    
    Yeu cau: In "[SUCCESS]" neu khai thac thanh cong, "[FAILED]" neu that bai.
    Chi tra ve code Python.
    """
    response = model.generate_content(prompt)
    poc_code = response.text.strip()
    
    return {
        "poc_code": poc_code,
        "poc_name": f"poc_{vulnerability_info.get('type').lower().replace(' ', '_')}.py",
        "description": f"PoC cho {vulnerability_info.get('type')}"
    }
```

---

## 4. Sandbox Module

**File:** `app/services/sandbox.py`

**Method can implement:**
- `verify_poc()` -> Hien tai raise NotImplementedError

**Cach tich hop voi Docker:**
```python
import docker

class SandboxModule:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.sandbox_image = "super-sast-sandbox:latest"

    def verify_poc(self, poc_file_path: str, vulnerability_info: Dict) -> Dict:
        with tempfile.TemporaryDirectory() as sandbox_dir:
            shutil.copy(poc_file_path, os.path.join(sandbox_dir, os.path.basename(poc_file_path)))
            
            container = self.docker_client.containers.run(
                self.sandbox_image,
                command=f"python /sandbox/{os.path.basename(poc_file_path)}",
                volumes={sandbox_dir: {'bind': '/sandbox', 'mode': 'ro'}},
                network_mode='none',
                mem_limit='256m',
                detach=True
            )
            
            result = container.wait(timeout=30)
            logs = container.logs().decode('utf-8')
            container.remove()
            
            exploitable = self._analyze_exploitation_result(
                result.get('StatusCode', 1), logs, vulnerability_info
            )
            
            return {"exploitable": exploitable, "output": logs}

    def _analyze_exploitation_result(self, exit_code: int, logs: str, vuln_info: Dict) -> bool:
        vuln_type = vuln_info.get('type', '').lower()
        if 'sql' in vuln_type:
            return any(x in logs.lower() for x in ['password', 'admin', 'extracted'])
        elif 'xss' in vuln_type:
            return any(x in logs.lower() for x in ['alert', 'document.cookie'])
        elif 'command' in vuln_type:
            return exit_code == 0 and len(logs) > 0
        return exit_code == 0
```

**Dockerfile cho Sandbox:**
```dockerfile
FROM python:3.11-slim
RUN useradd -m -s /bin/bash sandbox
USER sandbox
RUN pip install --no-cache-dir requests beautifulsoup4 sqlalchemy
WORKDIR /sandbox
```

---

## 5. Checklist tich hop

### Giai doan 1: SAST Scanner
- Cai dat Snyk CLI: `npm install -g snyk`
- Cai dat Semgrep: `pip install semgrep`
- Cai dat CodeQL CLI
- Implement cac method `_run_snyk()`, `_run_semgrep()`, `_run_codeql()`
- Test voi sample project

### Giai doan 2: LLM Analyzer
- Setup Gemini API key
- Implement `classify_vulnerability()`, `generate_report()`, `generate_poc()`
- (Tuy chon) Train fine-tuned model

### Giai doan 3: Sandbox
- Cai dat Docker
- Tao sandbox Docker image
- Implement `verify_poc()` va `_analyze_exploitation_result()`
- Test voi sample PoC

### Giai doan 4: Kiem thu tich hop
- Test end-to-end: Upload -> SAST -> LLM -> Sandbox -> Bao cao
- Test voi cac loai vulnerability khac nhau
- Kiem thu hieu nang

---

## 6. Bien moi truong

```bash
GEMINI_API_KEY=your_api_key
DOCKER_HOST=unix:///var/run/docker.sock
SANDBOX_IMAGE=super-sast-sandbox:latest
SAST_TIMEOUT=300
LLM_TIMEOUT=60
SANDBOX_TIMEOUT=30
```
