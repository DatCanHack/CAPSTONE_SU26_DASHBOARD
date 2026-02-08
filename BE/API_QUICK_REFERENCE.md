# API Quick Reference - Frontend Team

## 🚀 Getting Started

**Backend URL:** `http://localhost:8000`
**API Docs:** `http://localhost:8000/docs` (Swagger UI)

---

## 🔑 Authentication

```javascript
// Login & get token
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=user@email.com&password=pass123'
});
const { access_token } = await response.json();

// Use token in headers
headers: { 'Authorization': `Bearer ${access_token}` }
```

---

## 📋 Main Workflow

### 1️⃣ Create Project
```javascript
POST /api/projects
{
  "name": "Project Name",
  "description": "Description"
}
```

### 2️⃣ Upload Source Code
```javascript
POST /api/projects/{id}/upload-source
Content-Type: multipart/form-data
Body: FormData with 'file' field
```

### 3️⃣ Start Scan (Auto runs SAST)
```javascript
POST /api/scans
{
  "project_id": 1,
  "scan_type": "full"  // or "standard"
}
```

### 4️⃣ Check Status (Poll every 5s)
```javascript
GET /api/scans/{id}
// Status: pending → running_sast → sast_completed
```

### 5️⃣ Trigger LLM Analysis
```javascript
POST /api/scans/{id}/analyze-all
// Auto: LLM → PoC → Sandbox → Results
```

### 6️⃣ Poll Status (Poll every 10s)
```javascript
GET /api/scans/{id}
// Status: running_llm → completed
```

### 7️⃣ Get Results
```javascript
GET /api/reports?scan_id={id}
GET /api/pocs?vulnerability_id={id}
```

---

## 📊 Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login & get token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| | |
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/{id}` | Get project |
| POST | `/api/projects/{id}/upload-source` | Upload code |
| | |
| POST | `/api/scans` | Start scan |
| GET | `/api/scans/{id}` | Get scan status |
| POST | `/api/scans/{id}/analyze-all` | Run LLM |
| | |
| GET | `/api/reports?scan_id={id}` | List reports |
| GET | `/api/reports/{id}/preview` | Preview report |
| GET | `/api/reports/{id}/download` | Download report |
| | |
| GET | `/api/pocs?vulnerability_id={id}` | List PoCs |
| GET | `/api/pocs/{id}/preview` | Preview PoC |
| GET | `/api/pocs/{id}/download` | Download PoC |

---

## 🎯 Scan Status Values

- `pending` - Scan created, SAST not started
- `running_sast` - SAST tools scanning
- `sast_completed` - SAST done, ready for LLM
- `running_llm` - LLM analyzing + PoC verification
- `completed` - All done
- `failed` - Error occurred

---

## 📁 Response Examples

### Scan Response
```json
{
  "id": 1,
  "status": "completed",
  "sast_total_issues": 15,
  "scan_tools": ["snyk", "semgrep", "codeql"]
}
```

### Report Response
```json
{
  "id": 1,
  "report_type": "true_positive",
  "summary": "SQL Injection",
  "llm_confidence": "HIGH"
}
```

### PoC Response
```json
{
  "id": 1,
  "poc_type": "real_poc",
  "poc_name": "exploit.py",
  "is_verified": true,
  "is_downloadable": true
}
```

---

## ⚠️ Error Responses

```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/expired token)
- `404` - Not Found
- `500` - Server Error

---

## 🔄 Polling Pattern

```javascript
// Poll scan status
async function waitForScanComplete(scanId) {
  let status;
  do {
    await new Promise(r => setTimeout(r, 5000)); // Wait 5s
    const scan = await api.getScan(scanId);
    status = scan.status;
    
    // Update UI with status
    updateUI(status);
    
  } while (status === 'running_sast' || status === 'running_llm');
  
  return status === 'completed';
}
```

---

## 📝 Complete Example

```javascript
// 1. Login
const { access_token } = await api.login('user@email.com', 'pass');

// 2. Create Project
const project = await api.createProject({
  name: 'My Project',
  description: 'Test'
});

// 3. Upload Source
const file = fileInput.files[0];
await api.uploadSourceCode(project.id, file);

// 4. Start Scan
const scan = await api.createScan({
  project_id: project.id,
  scan_type: 'full'
});

// 5. Wait for SAST
let scanData;
do {
  await sleep(5000);
  scanData = await api.getScan(scan.id);
} while (scanData.status !== 'sast_completed');

// 6. Trigger LLM
await api.analyzeScan(scan.id);

// 7. Wait for completion
do {
  await sleep(10000);
  scanData = await api.getScan(scan.id);
} while (scanData.status === 'running_llm');

// 8. Get results
const reports = await api.getReports(scan.id);
const tpReports = reports.filter(r => r.report_type === 'true_positive');

// 9. Get PoCs
for (const report of tpReports) {
  const pocs = await api.getPoCs(report.vulnerability_id);
  console.log(`PoCs for ${report.summary}:`, pocs.length);
}
```

---

## 🎨 UI States to Handle

**Project View:**
- Creating project
- Uploading source code
- Upload complete ✓

**Scan View:**
- Starting scan
- SAST running... (show progress)
- SAST complete → Show "Analyze" button
- LLM analyzing... (show progress)
- Analysis complete → Navigate to Reports

**Report View:**
- Show FP reports list
- Show TP reports list with PoC badges
- Preview button → Modal/Page with content
- Download button → Download file

**PoC Display:**
- Show status: ✅ Real PoC / ⚠️ Poor PoC
- Preview button → Show code
- Download button → Download file

---

## 🔧 Debugging

**Check API Status:**
```bash
curl http://localhost:8000/health
```

**View API Docs:**
Open `http://localhost:8000/docs` in browser

**Test Authentication:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=test123"
```

---

## 📞 Need Help?

1. Check API docs: `http://localhost:8000/docs`
2. Check detailed guide: `FRONTEND_INTEGRATION.md`
3. Check workflow: `AUTOMATIC_WORKFLOW.md`
4. Test endpoints with Postman/Thunder Client

**Backend is ready! Happy coding! 🚀**
