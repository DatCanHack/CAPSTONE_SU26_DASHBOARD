# Tài liệu Workflow - Web Vulnerability Scanner

## 1. Tổng quan

**Luồng chính:** Đăng nhập -> Trang chủ -> Quản lý dự án -> Quét mã nguồn -> Xem báo cáo

**Cấu trúc thư mục:**
```
/tmp/{project_name}/
├── source/           # Mã nguồn upload
├── result/           # Kết quả SAST (JSON)
├── FP/report/        # Báo cáo False Positive
└── TP/
    ├── report/       # Báo cáo True Positive
    └── PoC/
        ├── Real_PoC/ # PoC khai thác thành công
        └── Poor_PoC/ # PoC khai thác thất bại
```

---

## 2. Chi tiết các trang

### 2.1. Trang đăng nhập
- Xác thực bằng JWT token

### 2.2. Trang chủ
- **Tạo dự án:** Nhập tên dự án, tags (tùy chọn)
- **Danh sách dự án:** Xem và truy cập các dự án

### 2.3. Trang chi tiết dự án
- **Tóm tắt báo cáo:** Thống kê TP/FP, link đến trang báo cáo
- **Upload và quét:**
  - Upload mã nguồn
  - Chọn loại quét: Standard (Snyk + Semgrep) hoặc Full (Snyk + Semgrep + CodeQL)
  - Bắt đầu quét

### 2.4. Trang kết quả quét
- Hiển thị kết quả SAST (các file JSON trong `/tmp/{project_name}/result/`)
- Phân tích từng lỗ hổng hoặc tất cả bằng LLM
- **Luồng xử lý:**
  ```
  SAST JSON -> LLM Analyzer -> Phân loại TP/FP + Tạo báo cáo + Tạo PoC (chỉ TP) -> Sandbox -> Real/Poor PoC
  ```

### 2.5. Trang báo cáo
- **Báo cáo False Positive:** Danh sách, xem chi tiết, thống kê
- **Báo cáo True Positive:** Danh sách, xem chi tiết, PoC (Real/Poor), tải xuống, thống kê

### 2.6. Trang cá nhân
- **Cài đặt LLM:** Gemini API (nhập API key) hoặc Fine-tune AI
- **Thông tin cá nhân:** Đổi mật khẩu, tên, email, số điện thoại

---

## 3. Tích hợp Module

### 3.1. SAST Scanner
- **Đầu vào:** Mã nguồn từ `/tmp/{project_name}/source/`
- **Đầu ra:** File JSON theo loại lỗ hổng tại `/tmp/{project_name}/result/`
- **Công cụ:** Snyk, Semgrep, CodeQL

### 3.2. LLM Analyzer
- **Đầu vào:** File JSON từ SAST
- **Xử lý:**
  - Chế độ: Gemini API hoặc Fine-tune AI
  - Phân loại TP/FP
  - Tạo báo cáo
  - Tạo PoC (chỉ cho TP)
- **Đầu ra:**
  - FP: `/tmp/{project_name}/FP/report/`
  - TP: `/tmp/{project_name}/TP/report/` và `/tmp/{project_name}/TP/PoC/`

### 3.3. Sandbox
- **Đầu vào:** PoC từ LLM Analyzer
- **Xử lý:** Thực thi PoC, kiểm tra khai thác thành công hay thất bại
- **Đầu ra:**
  - Thành công: `/tmp/{project_name}/TP/PoC/Real_PoC/`
  - Thất bại: `/tmp/{project_name}/TP/PoC/Poor_PoC/`

---

## 4. Cơ sở dữ liệu

### Bảng User
- `llm_analysis_mode`: gemini_api / fine_tune
- `gemini_api_key`: Mã hóa
- `phone_number`

### Bảng Project
- `source_code_path`, `tags`

### Bảng Scan
- `sast_output_path`, `scan_tools`

### Bảng Report
- `report_path`, `report_type`: true_positive / false_positive

### Bảng PoC
- `vulnerability_id`, `poc_type`: real_poc / poor_poc
- `poc_path`, `is_downloadable`

---

## 5. API Endpoints

### Dự án
- `POST /api/projects` - Tạo dự án
- `GET /api/projects` - Danh sách dự án
- `GET /api/projects/{id}` - Chi tiết dự án
- `POST /api/projects/{id}/upload` - Upload mã nguồn

### Quét
- `POST /api/scans` - Bắt đầu quét
- `GET /api/scans/{id}` - Trạng thái quét
- `POST /api/scans/{id}/analyze` - Phân tích LLM (1 lỗ hổng)
- `POST /api/scans/{id}/analyze-all` - Phân tích LLM (tất cả)

### Báo cáo
- `GET /api/reports?scan_id={id}` - Lấy báo cáo theo scan
- `GET /api/reports/{id}/download` - Tải báo cáo

### PoC
- `GET /api/pocs?vulnerability_id={id}` - Lấy PoC
- `GET /api/pocs/{id}/download` - Tải PoC
- `PATCH /api/pocs/{id}` - Cập nhật trạng thái PoC

### Cá nhân
- `PUT /api/auth/me` - Cập nhật thông tin
- `PUT /api/auth/me/llm-settings` - Cài đặt LLM
- `PUT /api/auth/me/password` - Đổi mật khẩu
