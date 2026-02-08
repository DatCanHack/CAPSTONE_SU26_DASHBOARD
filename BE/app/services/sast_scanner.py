"""
SAST (Static Application Security Testing) Module Integration
Handles source code scanning using various tools (Snyk, Semgrep, CodeQL).

This module integrates external SAST tools and saves results for LLM analysis.
TODO: Implement actual SAST tool integration
"""

import os
import json
from typing import Dict, Any, List
from datetime import datetime


class SASTScanner:
    """
    SAST Scanner Module for running security scans on source code.
    Supports multiple tools: Snyk, Semgrep, CodeQL.
    """
    
    def __init__(self):
        self.supported_tools = ["snyk", "semgrep", "codeql"]
    
    def scan_project(
        self,
        project_name: str,
        source_code_path: str,
        scan_type: str = "standard"
    ) -> Dict[str, Any]:
        """
        Run SAST scan on project source code.
        
        Args:
            project_name: Project name for file paths
            source_code_path: Path to source code
            scan_type: "full" (Snyk+Semgrep+CodeQL) or "standard" (Snyk+Semgrep)
            
        Returns:
            Dict containing:
                - success: bool
                - tools_used: List of tools
                - total_issues: int
                - results_path: Path to results folder
                - errors: List of errors (if any)
        """
        
        # Determine which tools to use
        if scan_type == "full":
            tools = ["snyk", "semgrep", "codeql"]
        else:  # standard
            tools = ["snyk", "semgrep"]
        
        # TODO: Implement actual SAST scanning
        # This is a placeholder that will be replaced with actual SAST implementation
        
        # Create results folder
        results_path = f"/tmp/{project_name}/result"
        os.makedirs(results_path, exist_ok=True)
        
        # Run each tool
        all_vulnerabilities = []
        errors = []
        
        for tool in tools:
            try:
                tool_results = self._run_tool(tool, source_code_path)
                all_vulnerabilities.extend(tool_results)
            except Exception as e:
                errors.append(f"{tool}: {str(e)}")
        
        # Save each vulnerability as separate JSON file
        for i, vuln in enumerate(all_vulnerabilities):
            vuln_file = os.path.join(results_path, f"vulnerability_{i+1:03d}.json")
            with open(vuln_file, 'w') as f:
                json.dump(vuln, f, indent=2)
        
        return {
            "success": len(errors) == 0 or len(all_vulnerabilities) > 0,
            "tools_used": tools,
            "total_issues": len(all_vulnerabilities),
            "results_path": results_path,
            "errors": errors if errors else None
        }
    
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
        """Run Snyk scan."""
        # ============================================================
        # ⚠️ MOCK LOCATION #1.1 - SNYK INTEGRATION
        # ============================================================
        # TODO: Replace with actual Snyk CLI integration
        # 
        # Example implementation:
        #   result = subprocess.run(['snyk', 'test', '--json', source_code_path], ...)
        #   snyk_output = json.loads(result.stdout)
        #   return [transform_snyk_vuln(v) for v in snyk_output['vulnerabilities']]
        #
        # See: INTEGRATION_GUIDE.md - Section "MOCK LOCATION #1: SAST Scanner"
        # ============================================================
        
        # MOCK DATA - Remove after implementing real Snyk integration
        return [
            {
                "tool": "snyk",
                "type": "SQL Injection",
                "severity": "HIGH",
                "file": "app/routes/auth.py",
                "line": 45,
                "description": "SQL injection vulnerability in authentication",
                "cwe": "CWE-89",
                "discovered_at": datetime.now().isoformat()
            }
        ]
    
    def _run_semgrep(self, source_code_path: str) -> List[Dict[str, Any]]:
        """Run Semgrep scan."""
        # ============================================================
        # ⚠️ MOCK LOCATION #1.2 - SEMGREP INTEGRATION
        # ============================================================
        # TODO: Replace with actual Semgrep CLI integration
        #
        # Example implementation:
        #   result = subprocess.run(['semgrep', '--config=auto', '--json', source_code_path], ...)
        #   semgrep_output = json.loads(result.stdout)
        #   return [transform_semgrep_finding(f) for f in semgrep_output['results']]
        #
        # See: INTEGRATION_GUIDE.md - Section "MOCK LOCATION #1: SAST Scanner"
        # ============================================================
        
        # MOCK DATA - Remove after implementing real Semgrep integration
        return [
            {
                "tool": "semgrep",
                "type": "XSS",
                "severity": "MEDIUM",
                "file": "app/templates/dashboard.html",
                "line": 23,
                "description": "Potential XSS vulnerability",
                "cwe": "CWE-79",
                "discovered_at": datetime.now().isoformat()
            }
        ]
    
    def _run_codeql(self, source_code_path: str) -> List[Dict[str, Any]]:
        """Run CodeQL scan."""
        # ============================================================
        # ⚠️ MOCK LOCATION #1.3 - CODEQL INTEGRATION
        # ============================================================
        # TODO: Replace with actual CodeQL CLI integration
        #
        # Example implementation:
        #   1. Create CodeQL database: codeql database create ...
        #   2. Run analysis: codeql database analyze ...
        #   3. Parse SARIF output
        #
        # See: INTEGRATION_GUIDE.md - Section "MOCK LOCATION #1: SAST Scanner"
        # ============================================================
        
        # MOCK DATA - Remove after implementing real CodeQL integration
        return [
            {
                "tool": "codeql",
                "type": "Path Traversal",
                "severity": "HIGH",
                "file": "app/utils/file_handler.py",
                "line": 67,
                "description": "Potential path traversal vulnerability",
                "cwe": "CWE-22",
                "discovered_at": datetime.now().isoformat()
            }
        ]
    
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


def scan_project(
    project_name: str,
    source_code_path: str,
    scan_type: str = "standard"
) -> Dict[str, Any]:
    """
    Convenience function to scan a project.
    
    Args:
        project_name: Project name
        source_code_path: Path to source code
        scan_type: "full" or "standard"
        
    Returns:
        Scan results
    """
    return sast_scanner.scan_project(project_name, source_code_path, scan_type)
