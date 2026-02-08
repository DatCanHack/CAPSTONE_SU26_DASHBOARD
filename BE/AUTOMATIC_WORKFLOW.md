# Automatic Workflow - LLM Analysis với Sandbox Verification

## 📋 Overview

Luồng TỰ ĐỘNG theo WORKFLOW.md: LLM phân tích vulnerability → Generate PoC → **TỰ ĐỘNG** verify qua Sandbox → Lưu kết quả → User chỉ xem trong Report View.

---

## 🔄 Complete Automatic Flow

```
SAST Scan → LLM Analysis → [TP: Generate PoC → Auto Sandbox Verify → Classify] → Save Results → Display in Report View
                          → [FP: Generate Report Only]
```

---

## 📍 Chi Tiết Từng Bước

### **Step 1: SAST Scan Complete**
```
📁 /tmp/{project_name}/result/
├── vulnerability_001.json
├── vulnerability_002.json
└── vulnerability_003.json
```

### **Step 2: User Triggers LLM Analysis**
**Scan View → User clicks "Scan" or "Scan All"**

```http
POST /api/scans/{scan_id}/analyze
Authorization: Bearer {token}
{
  "analysis_mode": "fine_tune"  # or "gemini_api"
}
```

### **Step 3: LLM Analyzes Vulnerability**

#### **Backend Code:**
```python
from app.services import llm_analyzer

# Read SAST result
sast_result = read_json(f"/tmp/{project}/result/vuln_001.json")

# LLM analyzes and automatically handles PoC verification
result = llm_analyzer.analyze_vulnerability(
    sast_result=sast_result,
    project_name=project.name,
    analysis_mode=user.llm_analysis_mode
)
```

#### **LLM Module Internal Flow:**

##### **If FALSE POSITIVE:**
```python
1. LLM classifies as FP
2. Generate FP report
3. Save to: /tmp/{project}/FP/report/{file}.json
4. NO PoC generation
5. Return result
```

##### **If TRUE POSITIVE:**
```python
1. LLM classifies as TP
2. Generate TP report
3. Save to: /tmp/{project}/TP/report/{file}.json
4. Generate PoC code
5. Save PoC temporarily
6. 🔥 AUTOMATICALLY send to Sandbox
7. Sandbox verifies:
   - Execute PoC
   - Determine success/failure
8. Based on Sandbox result:
   ├─ Exploit Success → Move to Real_PoC/
   └─ Exploit Failed  → Move to Poor_PoC/
9. Return complete result
```

### **Step 4: Automatic Sandbox Verification**

**Internal Process (Transparent to User):**

```python
# Inside LLM Analyzer
def _handle_true_positive(self, sast_result, project_name, vuln_type):
    # 1. Generate PoC
    poc_code = self._generate_poc(sast_result, vuln_type)
    temp_file = save_temp_poc(poc_code)
    
    # 2. 🤖 AUTOMATICALLY send to Sandbox
    sandbox_result = sandbox_module.verify_poc(
        poc_file_path=temp_file,
        vulnerability_info=sast_result
    )
    
    # 3. Classify based on result
    if sandbox_result["exploitable"]:
        move_to("/tmp/{project}/TP/PoC/Real_PoC/")
        poc_type = "real_poc"
    else:
        move_to("/tmp/{project}/TP/PoC/Poor_PoC/")
        poc_type = "poor_poc"
    
    return result_with_verification
```

### **Step 5: Save Complete Results**

**File Structure After Analysis:**

```
/tmp/{project_name}/
├── FP/
│   └── report/
│       └── fp_report_xss.json              # FP - No PoC
├── TP/
│   ├── report/
│   │   └── tp_report_sql_injection.json    # TP Report
│   └── PoC/
│       ├── Real_PoC/
│       │   └── poc_sql_injection.py        # ✅ Verified Real
│       └── Poor_PoC/
│           └── poc_xss.py                  # ❌ Verified Poor
```

### **Step 6: User Views Results**

**Report View - User chỉ XEM kết quả:**

```
📊 False Positive Reports
├─ Report Name: XSS False Positive
├─ Status: FP
├─ Actions: [Preview] [Download]

📊 True Positive Reports  
├─ Report Name: SQL Injection
├─ Status: TP
├─ PoC Status: ✅ Real PoC (Verified)
├─ Actions: [Preview] [Download Report] [Download PoC]
```

---

## 🔌 API Endpoints for Automatic Flow

### **Trigger LLM Analysis**
```http
POST /api/scans/{scan_id}/analyze
Content-Type: application/json
Authorization: Bearer {token}

{
  "analysis_mode": "fine_tune",
  "vulnerabilities": [1, 2, 3]  # Optional: specific IDs
}
```

**Response:**
```json
{
  "scan_id": 1,
  "total_analyzed": 3,
  "results": [
    {
      "vulnerability_id": 1,
      "classification": "true_positive",
      "report_id": 101,
      "poc": {
        "generated": true,
        "verified": true,
        "poc_type": "real_poc",
        "poc_id": 201,
        "is_downloadable": true
      }
    },
    {
      "vulnerability_id": 2,
      "classification": "false_positive",
      "report_id": 102,
      "poc": {
        "generated": false
      }
    }
  ]
}
```

### **Analyze All Vulnerabilities**
```http
POST /api/scans/{scan_id}/analyze-all
Authorization: Bearer {token}
```

Automatically:
- Analyzes ALL SAST results
- Generates reports for all
- Generates + verifies PoCs for all TPs
- Returns complete results

---

## 💾 Database Updates After Automatic Flow

### **Reports Table**
```sql
INSERT INTO reports (
  scan_id,
  vulnerability_id,
  report_type,
  report_path,
  llm_analysis_mode,
  summary,
  details,
  recommendations
) VALUES (
  1,
  123,
  'true_positive',
  '/tmp/Project/TP/report/tp_report.json',
  'fine_tune',
  'SQL Injection confirmed',
  '...',
  '...'
);
```

### **PoCs Table** (Only for TP)
```sql
INSERT INTO pocs (
  vulnerability_id,
  poc_type,              -- 'real_poc' or 'poor_poc'
  poc_name,
  poc_path,              -- Final path after verification
  description,
  is_verified,           -- TRUE (already verified)
  is_downloadable,       -- TRUE
  actual_result          -- Sandbox execution result
) VALUES (
  123,
  'real_poc',
  'poc_sql_injection.py',
  '/tmp/Project/TP/PoC/Real_PoC/poc_sql_injection.py',
  'SQL Injection exploit',
  TRUE,
  TRUE,
  'Exploit successful - gained admin access'
);
```

---

## 🎯 Frontend Integration

### **Scan View - Trigger Analysis**

```javascript
// User clicks "Scan" or "Scan All"
async function analyzeScan(scanId) {
    showLoading("Analyzing vulnerabilities...");
    
    const response = await fetch(`/api/scans/${scanId}/analyze-all`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const results = await response.json();
    
    // Show results summary
    showNotification(
        `Analysis complete! 
         TP: ${results.true_positives} 
         FP: ${results.false_positives}
         PoCs verified: ${results.pocs_verified}`
    );
    
    // Navigate to Report View
    navigateTo(`/projects/${projectId}/reports`);
}
```

### **Report View - Display Results**

```javascript
// Display TP reports with verified PoC status
function displayTPReports(reports) {
    reports.forEach(report => {
        if (report.poc) {
            const pocStatus = report.poc.poc_type === 'real_poc' 
                ? '✅ Real PoC - Verified' 
                : '⚠️ Poor PoC - Failed';
            
            const downloadBtn = report.poc.is_downloadable
                ? `<button onclick="downloadPoC(${report.poc.id})">
                     Download PoC
                   </button>`
                : '';
            
            displayReport({
                ...report,
                pocStatus,
                downloadBtn
            });
        }
    });
}

// Download verified PoC
function downloadPoC(pocId) {
    window.location.href = `/api/pocs/${pocId}/download`;
}
```

---

## 🔧 Code Integration Points

### **Scan API Endpoint**

```python
# app/api/scans.py

@router.post("/{scan_id}/analyze-all")
async def analyze_all_vulnerabilities(
    scan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze all vulnerabilities with automatic PoC verification."""
    
    scan = get_scan(scan_id, current_user, db)
    project = get_project(scan.project_id, db)
    
    # Get SAST results
    sast_results = load_sast_results(project.name)
    
    # LLM analyzes ALL with automatic Sandbox verification
    from app.services import llm_analyzer
    results = llm_analyzer.analyze_all_vulnerabilities(
        sast_results=sast_results,
        project_name=project.name,
        analysis_mode=current_user.llm_analysis_mode
    )
    
    # Save all results to database
    for result in results:
        save_report_and_poc(result, scan_id, db)
    
    return {
        "scan_id": scan_id,
        "total_analyzed": len(results),
        "true_positives": count_tp(results),
        "false_positives": count_fp(results),
        "pocs_verified": count_pocs(results),
        "results": results
    }
```

---

## ⏱️ Timeline

```
User clicks "Scan All"
     ↓
[0s] Backend receives request
     ↓
[0-5s] LLM analyzes vulnerabilities
     ↓
[5-10s] Generate PoCs for TPs
     ↓
[10-30s] 🤖 Sandbox verifies all PoCs automatically
     ↓
[30-35s] Save all results to database
     ↓
[35s] Return complete results to user
     ↓
User sees results in Report View
```

---

## 🔐 Security & Performance

### **Concurrent Processing**
```python
# Process multiple vulnerabilities in parallel
async def analyze_all_vulnerabilities(sast_results, project_name):
    tasks = [
        analyze_vulnerability(result, project_name)
        for result in sast_results
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### **Sandbox Queue**
- Multiple PoCs → Queue for verification
- Process in order or parallel (based on resources)
- Timeout handling for long-running verifications

---

## 📝 Summary

### ✅ **Automatic Flow Benefits:**

1. **Zero Manual Intervention**: User chỉ nhấn "Scan" một lần
2. **Consistent Results**: Tất cả PoCs đều được verify automatically
3. **Better UX**: User không phải wait để verify từng PoC
4. **Faster Workflow**: Parallel processing
5. **Reliable Classification**: Sandbox determines Real/Poor PoC

### 🎯 **User Experience:**

```
User → Click "Scan All" → Wait → View Complete Results
                              ↓
                        (Backend handles everything:
                         LLM + PoC + Sandbox automatically)
```

**User nhận được kết quả ĐÃ verified, ready to download!** 🚀
