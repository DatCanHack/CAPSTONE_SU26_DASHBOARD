"""
LLM Analyst Module Integration

Workflow (theo diagram):
1. Đọc SAST output (JSON files từ /tmp/{project}/result/)
2. Phân tích từng vulnerability bằng LLM (Fine-tune hoặc Gemini API)
3. Phân loại True Positive / False Positive:
   - False Positive → Generate FP Report → Save to /FP/report/
   - True Positive  → Generate TP Report → Save to /TP/report/
                    → Generate PoC       → Save to /TP/PoC/
4. PoC được gửi đến Sandbox để verify:
   - Success → Real_PoC/
   - Failed  → Poor_PoC/

Supported modes:
- "fine_tune": Use fine-tuned model
- "gemini_api": Use Gemini API with user's API key
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


class LLMAnalyzer:
    """
    LLM Analyst Module for vulnerability analysis.
    
    Responsibilities:
    1. Read SAST JSON output files
    2. Analyze each finding with LLM (classify TP/FP)
    3. Generate Reports for both TP and FP
    4. Generate PoC code for TP only
    """
    
    def __init__(self):
        self.gemini_api_key: Optional[str] = None
        self.analysis_mode = "fine_tune"  # or "gemini_api"
    
    def set_gemini_api_key(self, api_key: str):
        """Set Gemini API key for gemini_api mode."""
        self.gemini_api_key = api_key
    
    def analyze_sast_output(
        self,
        sast_json_path: str,
        project_name: str,
        analysis_mode: str = "fine_tune",
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: Analyze SAST JSON output file.
        
        Args:
            sast_json_path: Path to SAST result JSON file (e.g., sql_injection_results.json)
            project_name: Project name for folder structure
            analysis_mode: "fine_tune" or "gemini_api"
            gemini_api_key: API key (required if mode is gemini_api)
            
        Returns:
            Dict with analysis results for all findings in the file
        """
        # ============================================================
        # INTEGRATION POINT: Read SAST Output
        # ============================================================
        # TODO: Implement reading actual SAST JSON files
        # 
        # Expected SAST JSON format (from SAST Scanner output):
        # {
        #     "tool": "snyk|semgrep|codeql",
        #     "type": "SQL Injection",
        #     "severity": "HIGH",
        #     "file": "path/to/file.py",
        #     "line": 45,
        #     "description": "...",
        #     "cwe": "CWE-89",
        #     "code_snippet": "...",
        #     "discovered_at": "ISO timestamp"
        # }
        # ============================================================
        
        raise NotImplementedError(
            f"SAST output analysis not yet implemented. "
            f"Please implement reading from: {sast_json_path}"
        )
    
    def classify_vulnerability(
        self,
        sast_finding: Dict[str, Any],
        analysis_mode: str = "fine_tune",
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classify a single SAST finding as True Positive or False Positive.
        
        Args:
            sast_finding: Single SAST finding from JSON
            analysis_mode: "fine_tune" or "gemini_api"
            gemini_api_key: API key for Gemini
            
        Returns:
            {
                "is_true_positive": bool,
                "confidence": "XX%",
                "reasoning": "Why this is TP/FP..."
            }
        """
        # ============================================================
        # INTEGRATION POINT: LLM Classification
        # ============================================================
        # TODO: Implement actual LLM classification
        #
        # For Fine-tune mode:
        #   result = fine_tuned_model.predict(sast_finding)
        #
        # For Gemini API mode:
        #   import google.generativeai as genai
        #   genai.configure(api_key=gemini_api_key)
        #   model = genai.GenerativeModel('gemini-pro')
        #   prompt = f"""
        #       Analyze this SAST finding and classify as True Positive or False Positive:
        #       {json.dumps(sast_finding, indent=2)}
        #       
        #       Respond with JSON: {{"is_true_positive": bool, "confidence": "XX%", "reasoning": "..."}}
        #   """
        #   response = model.generate_content(prompt)
        #   return json.loads(response.text)
        # ============================================================
        
        raise NotImplementedError(
            f"LLM classification not yet implemented for mode: {analysis_mode}"
        )
    
    def generate_report(
        self,
        sast_finding: Dict[str, Any],
        classification: str,  # "true_positive" or "false_positive"
        confidence: str,
        reasoning: str,
        analysis_mode: str = "fine_tune",
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate detailed report for a vulnerability (TP or FP).
        
        Args:
            sast_finding: SAST finding data
            classification: "true_positive" or "false_positive"
            confidence: Confidence percentage
            reasoning: LLM reasoning for classification
            analysis_mode: LLM mode
            gemini_api_key: API key for Gemini
            
        Returns:
            Report content dict
        """
        # ============================================================
        # INTEGRATION POINT: LLM Report Generation
        # ============================================================
        # TODO: Implement actual LLM report generation
        #
        # For Gemini API:
        #   prompt = f"""
        #       Generate a detailed security report for this vulnerability:
        #       Finding: {json.dumps(sast_finding)}
        #       Classification: {classification}
        #       
        #       Include:
        #       - Executive summary
        #       - Technical details
        #       - Impact analysis
        #       - Recommendation (fix for TP, explanation for FP)
        #   """
        #   response = model.generate_content(prompt)
        #   return json.loads(response.text)
        #
        # Expected output format:
        # {
        #     "vulnerability_type": "SQL Injection",
        #     "severity": "HIGH",
        #     "classification": "true_positive",
        #     "confidence": "95%",
        #     "summary": "...",
        #     "technical_details": "...",
        #     "impact": "...",
        #     "recommendation": "...",
        #     "references": ["CWE-89", "OWASP A03:2021"]
        # }
        # ============================================================
        
        raise NotImplementedError(
            f"LLM report generation not yet implemented for mode: {analysis_mode}"
        )
    
    def generate_poc(
        self,
        sast_finding: Dict[str, Any],
        analysis_mode: str = "fine_tune",
        gemini_api_key: Optional[str] = None
    ) -> str:
        """
        Generate PoC exploit code for True Positive vulnerability.
        This is ONLY called for True Positives.
        
        Args:
            sast_finding: SAST finding with vulnerability details
            analysis_mode: LLM mode
            gemini_api_key: API key for Gemini
            
        Returns:
            str: Python script for PoC exploit
        """
        # ============================================================
        # INTEGRATION POINT: LLM PoC Generation
        # ============================================================
        # TODO: Implement actual LLM PoC generation
        #
        # For Gemini API:
        #   prompt = f"""
        #       Generate a Proof of Concept (PoC) exploit script for this vulnerability:
        #       {json.dumps(sast_finding)}
        #       
        #       Requirements:
        #       - Python script
        #       - Include comments explaining each step
        #       - Safe to run in sandbox environment
        #       - Should demonstrate the vulnerability is exploitable
        #   """
        #   response = model.generate_content(prompt)
        #   return response.text
        #
        # Expected output: Python script string
        # ============================================================
        
        raise NotImplementedError(
            f"LLM PoC generation not yet implemented for mode: {analysis_mode}"
        )
    
    def process_finding(
        self,
        sast_finding: Dict[str, Any],
        project_name: str,
        analysis_mode: str = "fine_tune",
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a single SAST finding through the complete workflow:
        1. Classify (TP/FP)
        2. Generate Report
        3. If TP: Generate PoC
        
        Args:
            sast_finding: Single SAST finding
            project_name: Project name
            analysis_mode: LLM mode
            gemini_api_key: API key
            
        Returns:
            Complete analysis result
        """
        # Step 1: Classify
        classification_result = self.classify_vulnerability(
            sast_finding, analysis_mode, gemini_api_key
        )
        
        is_tp = classification_result["is_true_positive"]
        confidence = classification_result["confidence"]
        reasoning = classification_result["reasoning"]
        classification = "true_positive" if is_tp else "false_positive"
        
        # Step 2: Generate Report (for both TP and FP)
        report = self.generate_report(
            sast_finding, classification, confidence, reasoning,
            analysis_mode, gemini_api_key
        )
        
        # Save report to appropriate folder
        if is_tp:
            report_folder = f"/tmp/{project_name}/TP/report"
        else:
            report_folder = f"/tmp/{project_name}/FP/report"
        
        os.makedirs(report_folder, exist_ok=True)
        vuln_type = sast_finding.get("type", "unknown").lower().replace(" ", "_")
        report_file = os.path.join(report_folder, f"{classification}_{vuln_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        result = {
            "classification": classification,
            "confidence": confidence,
            "reasoning": reasoning,
            "report": {
                "path": report_file,
                "content": report
            },
            "poc": None
        }
        
        # Step 3: Generate PoC (ONLY for True Positives)
        if is_tp:
            poc_code = self.generate_poc(sast_finding, analysis_mode, gemini_api_key)
            
            # Save PoC to /TP/PoC/ folder (will be moved to Real_PoC or Poor_PoC after sandbox)
            poc_folder = f"/tmp/{project_name}/TP/PoC"
            os.makedirs(poc_folder, exist_ok=True)
            poc_filename = f"poc_{vuln_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
            poc_file = os.path.join(poc_folder, poc_filename)
            
            with open(poc_file, 'w') as f:
                f.write(poc_code)
            
            result["poc"] = {
                "generated": True,
                "poc_name": poc_filename,
                "poc_path": poc_file,
                "poc_code": poc_code,
                "sandbox_tested": False,  # Will be tested by Sandbox module
                "poc_type": None  # Will be set after sandbox: "real_poc" or "poor_poc"
            }
        else:
            result["poc"] = {
                "generated": False,
                "reason": "False Positive - No PoC needed"
            }
        
        return result


# Global instance
llm_analyzer = LLMAnalyzer()


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================

def analyze_sast_output(
    sast_json_path: str,
    project_name: str,
    analysis_mode: str = "fine_tune",
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Analyze SAST JSON output file."""
    return llm_analyzer.analyze_sast_output(
        sast_json_path, project_name, analysis_mode, gemini_api_key
    )


def process_finding(
    sast_finding: Dict[str, Any],
    project_name: str,
    analysis_mode: str = "fine_tune",
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Process a single SAST finding."""
    return llm_analyzer.process_finding(
        sast_finding, project_name, analysis_mode, gemini_api_key
    )
