# Database Schema - Web Vulnerability Scanner

## 📋 Overview

Database cho Web Vulnerability Scanner với workflow:
```
User → Project → Upload Source Code → SAST Scan → LLM Analysis → Reports & PoCs → Sandbox Testing
```

---

## 🗄️ Tables

### 1. **users** - Người dùng

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | User ID |
| `email` | String(255) | Email (unique) |
| `username` | String(100) | Username (unique) |
| `hashed_password` | String(255) | Password đã hash |
| `full_name` | String(255) | Tên đầy đủ |
| `phone_number` | String(20) | Số điện thoại |
| `is_active` | Boolean | Account active status |
| `is_superuser` | Boolean | Admin privileges |
| **LLM Settings** |
| `llm_analysis_mode` | Enum | `gemini_api` hoặc `fine_tune` |
| `gemini_api_key` | String(500) | Gemini API key (encrypted) |
| `created_at` | DateTime | Ngày tạo |
| `updated_at` | DateTime | Ngày cập nhật |

**Relationships:**
- `projects` → One-to-Many với Project
- `scans` → One-to-Many với Scan

---

### 2. **projects** - Dự án

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Project ID |
| `name` | String(255) | Tên project |
| `description` | Text | Mô tả |
| `tags` | JSON | Array tags: `["web", "api", ...]` |
| `repository_url` | String(500) | Git repository URL |
| `target_url` | String(500) | Target URL (optional) |
| **Source Code** |
| `source_code_path` | String(500) | `C:\tmp\{project_name}\` |
| `source_code_size` | Integer | Size in bytes |
| `source_code_uploaded_at` | DateTime | Thời gian upload |
| `owner_id` | Integer (FK) | → users.id |
| `created_at` | DateTime | Ngày tạo |
| `updated_at` | DateTime | Ngày cập nhật |

**Relationships:**
- `owner` → Many-to-One với User
- `scans` → One-to-Many với Scan

**File Structure:**
```
C:\tmp\{project_name}\
├── source_code\     # Uploaded source code
├── result\          # SAST JSON outputs
├── FP\
│   └── report\     # False Positive reports
└── TP\
    ├── report\     # True Positive reports
    └── PoC\
        ├── Real_PoC\
        └── Poor_PoC\
```

---

### 3. **scans** - Quét lỗ hổng

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Scan ID |
| `project_id` | Integer (FK) | → projects.id |
| `user_id` | Integer (FK) | → users.id |
| `status` | Enum | Scan status |
| `scan_type` | String(100) | `full` or `standard` |
| `scan_tools` | JSON | `["snyk", "semgrep", "codeql"]` |
| **SAST Info** (TODO: Integrate SAST) |
| `sast_output_path` | String(500) | `C:\tmp\{project_name}\result\` |
| `sast_total_issues` | Integer | Tổng số lỗi phát hiện |
| `sast_error_message` | Text | Error message nếu failed |
| **LLM Info** (TODO: Integrate LLM) |
| `llm_analysis_mode` | String(50) | `gemini_api` or `fine_tune` |
| `llm_output_path` | String(500) | Path to LLM reports |
| **Timestamps** |
| `started_at` | DateTime | Bắt đầu scan |
| `sast_completed_at` | DateTime | SAST hoàn thành |
| `llm_completed_at` | DateTime | LLM hoàn thành |
| `completed_at` | DateTime | Hoàn thành tất cả |
| `created_at` | DateTime | Ngày tạo |

**Scan Status Enum:**
- `pending` - Chờ xử lý
- `running_sast` - SAST đang chạy
- `sast_completed` - SAST xong, chờ LLM
- `running_llm` - LLM đang phân tích
- `completed` - Hoàn thành
- `failed` - Thất bại

**Relationships:**
- `project` → Many-to-One với Project
- `user` → Many-to-One với User
- `vulnerabilities` → One-to-Many với Vulnerability
- `reports` → One-to-Many với Report

---

### 4. **vulnerabilities** - Lỗ hổng bảo mật

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Vulnerability ID |
| `scan_id` | Integer (FK) | → scans.id |
| **Basic Info** |
| `title` | String(255) | Tiêu đề lỗ hổng |
| `description` | Text | Mô tả chi tiết |
| `severity` | Enum | `critical`, `high`, `medium`, `low`, `info` |
| `status` | Enum | Trạng thái |
| **SAST Output** |
| `sast_json_path` | String(500) | Path to SAST JSON file |
| `sast_raw_output` | JSON | Raw JSON từ SAST |
| **Details** |
| `cwe_id` | String(50) | Common Weakness Enumeration |
| `cvss_score` | String(10) | CVSS Score |
| `affected_url` | String(500) | URL bị ảnh hưởng |
| `file_path` | String(500) | File chứa lỗi |
| `line_number` | Integer | Dòng code |
| `code_snippet` | Text | Code snippet |
| `recommendation` | Text | Khuyến nghị fix |
| **LLM Analysis** |
| `llm_confidence_score` | String(10) | Confidence từ LLM |
| `is_false_positive` | Boolean | False Positive? |
| `created_at` | DateTime | Ngày tạo |
| `updated_at` | DateTime | Ngày cập nhật |

**Vulnerability Status Enum:**
- `pending_analysis` - Chờ LLM phân tích
- `analyzing` - LLM đang phân tích
- `open` - Lỗ hổng mở
- `false_positive` - LLM xác định FP
- `true_positive` - LLM xác định TP
- `fixed` - Đã fix
- `ignored` - Bỏ qua

**Relationships:**
- `scan` → Many-to-One với Scan
- `reports` → One-to-Many với Report
- `pocs` → One-to-Many với PoC (chỉ cho True Positive)

---

### 5. **reports** - Báo cáo TP/FP

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Report ID |
| `scan_id` | Integer (FK) | → scans.id |
| `vulnerability_id` | Integer (FK) | → vulnerabilities.id |
| **Report Info** |
| `report_type` | Enum | `true_positive` or `false_positive` |
| `report_path` | String(500) | Path to report file |
| **LLM Analysis** |
| `llm_analysis_mode` | String(50) | `gemini_api` or `fine_tune` |
| `llm_reasoning` | Text | LLM's reasoning |
| `llm_confidence` | String(10) | Confidence score |
| `llm_raw_output` | JSON | Complete LLM output |
| **Content** |
| `summary` | Text | Tóm tắt |
| `details` | Text | Chi tiết |
| `recommendations` | Text | Khuyến nghị |
| `created_at` | DateTime | Ngày tạo |
| `updated_at` | DateTime | Ngày cập nhật |

**Report Paths:**
- FP: `C:\tmp\{project_name}\FP\report\{file_name}`
- TP: `C:\tmp\{project_name}\TP\report\{file_name}`

**Relationships:**
- `scan` → Many-to-One với Scan
- `vulnerability` → Many-to-One với Vulnerability

---

### 6. **pocs** - Proof of Concept (CHỈ cho True Positive)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | PoC ID |
| `vulnerability_id` | Integer (FK) | → vulnerabilities.id (True Positive only) |
| **PoC Info** |
| `poc_type` | Enum | `real_poc` or `poor_poc` |
| `poc_name` | String(255) | Tên file PoC |
| `poc_path` | String(500) | Path to PoC file |
| **Sandbox Verification** (TODO: Integrate Sandbox) |
| `sandbox_tested` | Boolean | Đã test trong sandbox? |
| `exploit_successful` | Boolean | Exploit thành công? |
| `sandbox_result` | Text | Kết quả test sandbox |
| `sandbox_tested_at` | DateTime | Thời gian test |
| **Metadata** |
| `file_size` | Integer | Size in bytes |
| `is_downloadable` | Boolean | Cho phép download? |
| `description` | String(500) | Mô tả |
| `created_at` | DateTime | Ngày tạo |
| `updated_at` | DateTime | Ngày cập nhật |

**PoC Workflow:**
1. LLM generates PoC (chỉ cho True Positive)
2. Sandbox Module tests PoC
3. Classification:
   - `exploit_successful = True` → `poc_type = real_poc`
   - `exploit_successful = False` → `poc_type = poor_poc`

**PoC Paths:**
- Real PoC: `C:\tmp\{project_name}\TP\PoC\Real_PoC\{file_name}`
- Poor PoC: `C:\tmp\{project_name}\TP\PoC\Poor_PoC\{file_name}`

**Relationships:**
- `vulnerability` → Many-to-One với Vulnerability (True Positive only)

---

## 🔄 Workflow Flow

```
1. User tạo Project
   ↓
2. Upload Source Code → projects.source_code_path

3. Start Scan (chọn scan_type: full/standard)
   ↓
4. SAST Module (TODO)
   - Input: source_code_path
   - Output: JSON files → scans.sast_output_path
   - Create Vulnerability records với sast_json_path
   ↓
5. LLM Analyst Module (TODO)
   - Input: Vulnerability.sast_raw_output
   - Mode: User's llm_analysis_mode (gemini_api/fine_tune)
   - Process:
     * Classify → True Positive or False Positive
     * Generate Report (TP or FP)
     * Generate PoC (CHỈ cho True Positive)
   - Output:
     * Report records (report_type: TP/FP)
     * PoC records (chỉ cho TP)
   ↓
6. Sandbox Module (TODO) - CHỈ cho PoC
   - Input: PoC files từ LLM
   - Test exploit trong sandbox
   - Update PoC:
     * sandbox_tested = True
     * exploit_successful = True/False
     * poc_type = real_poc/poor_poc
   ↓
7. Report View
   - FP Reports (no PoC)
   - TP Reports + PoC (Real/Poor)
```

---

## 📊 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile (LLM settings)

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Scans
- `POST /api/scans` - Start scan
- `GET /api/scans` - List scans
- `GET /api/scans/{id}` - Get scan
- `DELETE /api/scans/{id}` - Delete scan

### Vulnerabilities
- `GET /api/vulnerabilities` - List vulnerabilities
- `GET /api/vulnerabilities/{id}` - Get vulnerability
- `PATCH /api/vulnerabilities/{id}` - Update vulnerability
- `DELETE /api/vulnerabilities/{id}` - Delete vulnerability

### Reports
- `GET /api/reports` - List reports
- `GET /api/reports/{id}` - Get report
- `DELETE /api/reports/{id}` - Delete report

### PoCs (True Positive only)
- `GET /api/pocs` - List PoCs
- `GET /api/pocs/{id}` - Get PoC
- `GET /api/pocs/{id}/download` - Download PoC file
- `PATCH /api/pocs/{id}` - Update PoC (reclassify)
- `DELETE /api/pocs/{id}` - Delete PoC

---

## 🔧 Integration TODOs

### 1. SAST Module
- [ ] Integrate Snyk, Semgrep, CodeQL
- [ ] Parse output → JSON files
- [ ] Create Vulnerability records
- [ ] Store at `C:\tmp\{project_name}\result\`

### 2. LLM Analyst Module
- [ ] Integrate Gemini API (RAG mode)
- [ ] Integrate Fine-tuned model
- [ ] TP/FP classification
- [ ] Generate Reports
- [ ] Generate PoC (TP only)

### 3. Sandbox Module
- [ ] Test PoC execution
- [ ] Verify exploit success
- [ ] Update PoC classification (Real/Poor)
- [ ] Store sandbox logs

---

## 🔒 Security Notes

- `users.gemini_api_key` phải được encrypt trước khi lưu
- `users.hashed_password` sử dụng bcrypt
- JWT tokens cho authentication
- File paths phải validate để tránh path traversal
- Sandbox phải isolated để test PoC an toàn
