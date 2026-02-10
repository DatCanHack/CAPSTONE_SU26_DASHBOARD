"""
SAST (Static Application Security Testing) Module Integration

Workflow (theo diagram):
1. Nhận source code từ user upload
2. Chạy SAST tools:
   - Standard scan: Snyk + Semgrep
   - Full scan: Snyk + Semgrep + CodeQL
3. Merge kết quả theo vulnerability type (SQL Injection, XSS, Command Injection)
4. Save JSON files vào /tmp/{project}/result/

Output folder structure:
/tmp/{project}/result/
├── sql_injection.json      ← All SQL Injection findings
├── xss.json                 ← All XSS findings
├── command_injection.json   ← All Command Injection findings
└── all_vulnerabilities.json ← Combined results

TODO: Implement actual SAST tool integration
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import defaultdict


# Vulnerability type mapping
VULN_TYPE_MAPPING = {
    # SQL Injection variants
    "sql injection": "sql_injection",
    "sqli": "sql_injection",
    "sql-injection": "sql_injection",
    "cwe-89": "sql_injection",
    
    # XSS variants
    "xss": "xss",
    "cross-site scripting": "xss",
    "cross site scripting": "xss",
    "reflected xss": "xss",
    "stored xss": "xss",
    "dom xss": "xss",
    "cwe-79": "xss",
    
    # Command Injection variants
    "command injection": "command_injection",
    "os command injection": "command_injection",
    "shell injection": "command_injection",
    "code injection": "command_injection",
    "cwe-78": "command_injection",
    "cwe-77": "command_injection",
    
    # Path Traversal
    "path traversal": "path_traversal",
    "directory traversal": "path_traversal",
    "cwe-22": "path_traversal",
    
    # Other types can be added here
}


class SASTScanner:
    """
    SAST Scanner Module for running security scans on source code.
    
    Scan Options:
    1. "standard" - Snyk + Semgrep (faster, good coverage)
    2. "full" - Snyk + Semgrep + CodeQL (comprehensive, slower)
    
    Responsibilities:
    1. Execute SAST tools on source code
    2. Collect and normalize results
    3. Group findings by vulnerability type
    4. Save results as JSON for LLM analysis
    """
    
    def __init__(self):
        self.supported_tools = ["snyk", "semgrep", "codeql"]
        self.scan_options = {
            "standard": ["snyk", "semgrep"],
            "full": ["snyk", "semgrep", "codeql"]
        }
    
    def scan_project(
        self,
        project_name: str,
        source_code_path: str,
        scan_type: str = "standard"
    ) -> Dict[str, Any]:
        """
        Main function: Run SAST scan on project source code.
        
        Args:
            project_name: Project name for file paths
            source_code_path: Path to uploaded source code
            scan_type: 
                - "standard": Snyk + Semgrep (default)
                - "full": Snyk + Semgrep + CodeQL
            
        Returns:
            {
                "success": bool,
                "scan_type": str,
                "tools_used": ["snyk", "semgrep", ...],
                "total_issues": int,
                "issues_by_type": {
                    "sql_injection": 5,
                    "xss": 3,
                    ...
                },
                "results_path": "/tmp/{project}/result",
                "result_files": [
                    "sql_injection.json",
                    "xss.json",
                    ...
                ],
                "errors": [...] or None
            }
        """
        
        # Validate scan type
        if scan_type not in self.scan_options:
            scan_type = "standard"
        
        # Get tools for this scan type
        tools = self.scan_options[scan_type]
        
        # Create results folder
        results_path = f"/tmp/{project_name}/result"
        os.makedirs(results_path, exist_ok=True)
        
        # Run each tool and collect results
        all_vulnerabilities = []
        errors = []
        
        for tool in tools:
            try:
                print(f"[SAST] Running {tool} on {source_code_path}...")
                tool_results = self._run_tool(tool, source_code_path)
                all_vulnerabilities.extend(tool_results)
                print(f"[SAST] {tool} found {len(tool_results)} issues")
            except NotImplementedError as e:
                errors.append(f"{tool}: {str(e)}")
            except Exception as e:
                errors.append(f"{tool}: {str(e)}")
        
        # Group vulnerabilities by type
        grouped_vulns = self._group_by_vulnerability_type(all_vulnerabilities)
        
        # Save grouped results as separate JSON files
        result_files = self._save_grouped_results(results_path, grouped_vulns)
        
        # Save combined results
        all_results_file = os.path.join(results_path, "all_vulnerabilities.json")
        with open(all_results_file, 'w') as f:
            json.dump({
                "scan_info": {
                    "project_name": project_name,
                    "scan_type": scan_type,
                    "tools_used": tools,
                    "scanned_at": datetime.now().isoformat(),
                    "source_code_path": source_code_path
                },
                "summary": {
                    "total_issues": len(all_vulnerabilities),
                    "by_type": {k: len(v) for k, v in grouped_vulns.items()},
                    "by_severity": self._count_by_severity(all_vulnerabilities)
                },
                "vulnerabilities": all_vulnerabilities
            }, f, indent=2)
        result_files.append("all_vulnerabilities.json")
        
        return {
            "success": len(all_vulnerabilities) > 0 or len(errors) == 0,
            "scan_type": scan_type,
            "tools_used": tools,
            "total_issues": len(all_vulnerabilities),
            "issues_by_type": {k: len(v) for k, v in grouped_vulns.items()},
            "results_path": results_path,
            "result_files": result_files,
            "errors": errors if errors else None
        }
    
    def _group_by_vulnerability_type(self, vulnerabilities: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group vulnerabilities by normalized type.
        
        Args:
            vulnerabilities: List of vulnerability dicts
            
        Returns:
            Dict mapping vuln type to list of findings
        """
        grouped = defaultdict(list)
        
        for vuln in vulnerabilities:
            # Get vulnerability type from finding
            vuln_type = vuln.get("type", "unknown").lower()
            cwe = vuln.get("cwe", "").lower()
            
            # Normalize type
            normalized_type = VULN_TYPE_MAPPING.get(vuln_type)
            if not normalized_type:
                normalized_type = VULN_TYPE_MAPPING.get(cwe, "other")
            
            grouped[normalized_type].append(vuln)
        
        return dict(grouped)
    
    def _save_grouped_results(self, results_path: str, grouped_vulns: Dict[str, List]) -> List[str]:
        """
        Save grouped vulnerabilities as separate JSON files.
        
        Args:
            results_path: Path to results folder
            grouped_vulns: Grouped vulnerabilities
            
        Returns:
            List of created filenames
        """
        result_files = []
        
        for vuln_type, vulns in grouped_vulns.items():
            if vulns:  # Only create file if there are findings
                filename = f"{vuln_type}.json"
                filepath = os.path.join(results_path, filename)
                
                with open(filepath, 'w') as f:
                    json.dump({
                        "vulnerability_type": vuln_type,
                        "total_findings": len(vulns),
                        "findings": vulns
                    }, f, indent=2)
                
                result_files.append(filename)
        
        return result_files
    
    def _count_by_severity(self, vulnerabilities: List[Dict]) -> Dict[str, int]:
        """Count vulnerabilities by severity level."""
        severity_count = defaultdict(int)
        for vuln in vulnerabilities:
            severity = vuln.get("severity", "UNKNOWN").upper()
            severity_count[severity] += 1
        return dict(severity_count)
    
    def _run_tool(self, tool_name: str, source_code_path: str) -> List[Dict[str, Any]]:
        """
        Run a specific SAST tool.
        
        Args:
            tool_name: Name of the tool (snyk, semgrep, codeql)
            source_code_path: Path to source code
            
        Returns:
            List of vulnerabilities found
        """
        
        # TODO: Implement actual tool execution
        # This is a placeholder that simulates tool output
        
        if tool_name == "snyk":
            return self._run_snyk(source_code_path)
        elif tool_name == "semgrep":
            return self._run_semgrep(source_code_path)
        elif tool_name == "codeql":
            return self._run_codeql(source_code_path)
        else:
            return []
    
    def _run_snyk(self, source_code_path: str) -> List[Dict[str, Any]]:
        """Run Snyk scan.
        
        TODO: Implement actual Snyk CLI integration
        
        Expected implementation:
            result = subprocess.run(['snyk', 'test', '--json', source_code_path], ...)
            snyk_output = json.loads(result.stdout)
            return [transform_snyk_vuln(v) for v in snyk_output['vulnerabilities']]
        
        Returns:
            List of vulnerabilities in format:
            {
                "tool": "snyk",
                "type": "SQL Injection",
                "severity": "HIGH|MEDIUM|LOW",
                "file": "path/to/file.py",
                "line": 45,
                "description": "...",
                "cwe": "CWE-XX",
                "discovered_at": "ISO timestamp"
            }
        """
        # TODO: Integrate actual Snyk scanner
        raise NotImplementedError("Snyk integration not yet implemented")
    
    def _run_semgrep(self, source_code_path: str) -> List[Dict[str, Any]]:
        """Run Semgrep scan.
        
        TODO: Implement actual Semgrep CLI integration
        
        Expected implementation:
            result = subprocess.run(['semgrep', '--config=auto', '--json', source_code_path], ...)
            semgrep_output = json.loads(result.stdout)
            return [transform_semgrep_finding(f) for f in semgrep_output['results']]
        
        Returns:
            List of vulnerabilities in format:
            {
                "tool": "semgrep",
                "type": "XSS",
                "severity": "HIGH|MEDIUM|LOW",
                "file": "path/to/file.py",
                "line": 23,
                "description": "...",
                "cwe": "CWE-XX",
                "discovered_at": "ISO timestamp"
            }
        """
        # TODO: Integrate actual Semgrep scanner
        raise NotImplementedError("Semgrep integration not yet implemented")
    
    def _run_codeql(self, source_code_path: str) -> List[Dict[str, Any]]:
        """Run CodeQL scan.
        
        TODO: Implement actual CodeQL CLI integration
        
        Expected implementation:
            1. Create CodeQL database: codeql database create ...
            2. Run analysis: codeql database analyze ...
            3. Parse SARIF output
        
        Returns:
            List of vulnerabilities in format:
            {
                "tool": "codeql",
                "type": "Path Traversal",
                "severity": "HIGH|MEDIUM|LOW",
                "file": "path/to/file.py",
                "line": 67,
                "description": "...",
                "cwe": "CWE-XX",
                "discovered_at": "ISO timestamp"
            }
        """
        # TODO: Integrate actual CodeQL scanner
        raise NotImplementedError("CodeQL integration not yet implemented")
    
    def get_scan_results(self, results_path: str) -> List[Dict[str, Any]]:
        """
        Read all vulnerability JSON files from results folder.
        
        Args:
            results_path: Path to results folder
            
        Returns:
            List of vulnerabilities
        """
        
        if not os.path.exists(results_path):
            return []
        
        vulnerabilities = []
        for filename in os.listdir(results_path):
            if filename.endswith('.json'):
                filepath = os.path.join(results_path, filename)
                try:
                    with open(filepath, 'r') as f:
                        vuln = json.load(f)
                        vulnerabilities.append(vuln)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
        
        return vulnerabilities


# Global instance
sast_scanner = SASTScanner()


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================

def scan_project(
    project_name: str,
    source_code_path: str,
    scan_type: str = "standard"
) -> Dict[str, Any]:
    """
    Scan a project with SAST tools.
    
    Args:
        project_name: Project name
        source_code_path: Path to source code
        scan_type: "standard" (Snyk+Semgrep) or "full" (Snyk+Semgrep+CodeQL)
        
    Returns:
        Scan results with grouped vulnerabilities
    """
    return sast_scanner.scan_project(project_name, source_code_path, scan_type)


def get_scan_options() -> Dict[str, List[str]]:
    """
    Get available scan options and their tools.
    
    Returns:
        {
            "standard": ["snyk", "semgrep"],
            "full": ["snyk", "semgrep", "codeql"]
        }
    """
    return sast_scanner.scan_options.copy()


def get_scan_results(results_path: str) -> List[Dict[str, Any]]:
    """Read scan results from results folder."""
    return sast_scanner.get_scan_results(results_path)


def get_results_by_type(results_path: str, vuln_type: str) -> Dict[str, Any]:
    """
    Get scan results for a specific vulnerability type.
    
    Args:
        results_path: Path to results folder
        vuln_type: e.g., "sql_injection", "xss", "command_injection"
        
    Returns:
        Dict with vulnerability type findings or empty dict
    """
    filepath = os.path.join(results_path, f"{vuln_type}.json")
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    return {}
