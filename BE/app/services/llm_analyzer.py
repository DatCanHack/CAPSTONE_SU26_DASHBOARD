"""
LLM Analyst Module Integration
Handles vulnerability analysis and PoC generation with automatic sandbox verification.

This module integrates:
1. LLM analysis (Gemini API or Fine-tune)
2. Automatic PoC generation for TP vulnerabilities
3. Automatic Sandbox verification
"""

import os
import json
from typing import Dict, Any, List
from app.services.sandbox import sandbox_module


class LLMAnalyzer:
    """
    LLM Analyst Module for vulnerability analysis.
    Automatically verifies PoCs through Sandbox after generation.
    """
    
    def __init__(self):
        self.gemini_api_key = None
        self.analysis_mode = "fine_tune"  # or "gemini_api"
    
    def analyze_vulnerability(
        self, 
        sast_result: Dict[str, Any],
        project_name: str,
        analysis_mode: str = "fine_tune"
    ) -> Dict[str, Any]:
        """
        Analyze SAST vulnerability and generate report + PoC (if TP).
        Automatically verifies PoC through Sandbox.
        
        Args:
            sast_result: SAST scan result JSON
            project_name: Project name for file path
            analysis_mode: "gemini_api" or "fine_tune"
            
        Returns:
            Dict containing:
                - classification: "true_positive" or "false_positive"
                - report: Report content
                - poc: PoC info (if TP) with sandbox verification result
        """
        
        # TODO: Implement actual LLM analysis
        # This is a placeholder that will be replaced with actual LLM implementation
        
        # Simulate LLM analysis
        vulnerability_type = sast_result.get("type", "Unknown")
        severity = sast_result.get("severity", "MEDIUM")
        
        # LLM determines if it's TP or FP
        is_true_positive = True  # Will be determined by LLM
        
        if is_true_positive:
            # TRUE POSITIVE - Generate PoC and verify automatically
            result = self._handle_true_positive(
                sast_result, 
                project_name, 
                vulnerability_type
            )
        else:
            # FALSE POSITIVE - Only generate report
            result = self._handle_false_positive(
                sast_result, 
                project_name, 
                vulnerability_type
            )
        
        return result
    
    def _handle_true_positive(
        self, 
        sast_result: Dict[str, Any],
        project_name: str,
        vulnerability_type: str
    ) -> Dict[str, Any]:
        """
        Handle True Positive vulnerability:
        1. Generate report
        2. Generate PoC
        3. Automatically verify PoC in Sandbox
        4. Save to appropriate folder (Real_PoC or Poor_PoC)
        """
        
        # 1. Generate TP Report
        report_content = self._generate_report(sast_result, "true_positive")
        report_path = f"/tmp/{project_name}/TP/report"
        os.makedirs(report_path, exist_ok=True)
        
        report_file = os.path.join(report_path, f"tp_report_{vulnerability_type}.json")
        with open(report_file, 'w') as f:
            json.dump(report_content, f, indent=2)
        
        # 2. Generate PoC
        poc_content = self._generate_poc(sast_result, vulnerability_type)
        
        # Save PoC temporarily
        temp_poc_path = f"/tmp/{project_name}/TP/PoC"
        os.makedirs(temp_poc_path, exist_ok=True)
        poc_filename = f"poc_{vulnerability_type.lower().replace(' ', '_')}.py"
        temp_poc_file = os.path.join(temp_poc_path, poc_filename)
        
        with open(temp_poc_file, 'w') as f:
            f.write(poc_content)
        
        # 3. AUTOMATICALLY verify PoC in Sandbox
        sandbox_result = sandbox_module.verify_poc(
            poc_file_path=temp_poc_file,
            vulnerability_info=sast_result
        )
        
        # 4. Move PoC to appropriate folder based on verification result
        if sandbox_result.get("exploitable", False):
            # Real PoC - Exploit successful
            poc_type = "real_poc"
            final_poc_path = f"/tmp/{project_name}/TP/PoC/Real_PoC"
            poc_status = "Real PoC - Exploit successful"
        else:
            # Poor PoC - Exploit failed
            poc_type = "poor_poc"
            final_poc_path = f"/tmp/{project_name}/TP/PoC/Poor_PoC"
            poc_status = "Poor PoC - Exploit failed"
        
        os.makedirs(final_poc_path, exist_ok=True)
        final_poc_file = os.path.join(final_poc_path, poc_filename)
        
        # Move file to final location
        import shutil
        shutil.move(temp_poc_file, final_poc_file)
        
        return {
            "classification": "true_positive",
            "report": {
                "path": report_file,
                "content": report_content
            },
            "poc": {
                "generated": True,
                "poc_type": poc_type,
                "poc_name": poc_filename,
                "poc_path": final_poc_file,
                "is_verified": True,
                "is_downloadable": True,
                "status": poc_status,
                "sandbox_result": sandbox_result
            }
        }
    
    def _handle_false_positive(
        self, 
        sast_result: Dict[str, Any],
        project_name: str,
        vulnerability_type: str
    ) -> Dict[str, Any]:
        """
        Handle False Positive vulnerability:
        Only generate report (NO PoC)
        """
        
        # Generate FP Report
        report_content = self._generate_report(sast_result, "false_positive")
        report_path = f"/tmp/{project_name}/FP/report"
        os.makedirs(report_path, exist_ok=True)
        
        report_file = os.path.join(report_path, f"fp_report_{vulnerability_type}.json")
        with open(report_file, 'w') as f:
            json.dump(report_content, f, indent=2)
        
        return {
            "classification": "false_positive",
            "report": {
                "path": report_file,
                "content": report_content
            },
            "poc": {
                "generated": False,
                "reason": "False Positive - No PoC needed"
            }
        }
    
    def _generate_report(self, sast_result: Dict[str, Any], classification: str) -> Dict[str, Any]:
        """Generate report content based on LLM analysis."""
        # ============================================================
        # ⚠️ MOCK LOCATION #2.1 - LLM REPORT GENERATION
        # ============================================================
        # TODO: Replace with actual LLM report generation
        #
        # Example with Gemini:
        #   prompt = f"Generate security report for {sast_result}..."
        #   response = model.generate_content(prompt)
        #   return json.loads(response.text)
        #
        # See: INTEGRATION_GUIDE.md
        # ============================================================
        return {
            "vulnerability_type": sast_result.get("type"),
            "severity": sast_result.get("severity"),
            "classification": classification,
            "description": "LLM analysis result",
            "recommendation": "Fix recommendation"
        }
    
    def _generate_poc(self, sast_result: Dict[str, Any], vulnerability_type: str) -> str:
        """Generate PoC code using LLM."""
        # ============================================================
        # ⚠️ MOCK LOCATION #4 - LLM POC GENERATION
        # ============================================================
        # TODO: Replace with actual LLM PoC generation
        #
        # Example with Gemini:
        #   prompt = f"Generate PoC for {vulnerability_type}..."
        #   response = model.generate_content(prompt)
        #   return response.text
        #
        # See: INTEGRATION_GUIDE.md - Section "MOCK LOCATION #4: PoC Generator"
        # ============================================================
        return f"""#!/usr/bin/env python3
\"\"\"
PoC for {vulnerability_type}
Generated by LLM Analyst Module
\"\"\"

def exploit():
    # TODO: LLM-generated exploit code
    pass

if __name__ == "__main__":
    exploit()
"""
    
    def analyze_all_vulnerabilities(
        self,
        sast_results: List[Dict[str, Any]],
        project_name: str,
        analysis_mode: str = "fine_tune"
    ) -> List[Dict[str, Any]]:
        """
        Analyze all vulnerabilities from SAST scan.
        Automatically verifies all generated PoCs.
        
        Args:
            sast_results: List of SAST results
            project_name: Project name
            analysis_mode: LLM mode
            
        Returns:
            List of analysis results
        """
        results = []
        for sast_result in sast_results:
            result = self.analyze_vulnerability(
                sast_result,
                project_name,
                analysis_mode
            )
            results.append(result)
        
        return results


# Global instance
llm_analyzer = LLMAnalyzer()


def analyze_vulnerability(
    sast_result: Dict[str, Any],
    project_name: str,
    analysis_mode: str = "fine_tune"
) -> Dict[str, Any]:
    """
    Convenience function to analyze a vulnerability.
    Automatically verifies PoC if generated.
    """
    return llm_analyzer.analyze_vulnerability(sast_result, project_name, analysis_mode)
