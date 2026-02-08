# Web Vulnerability Scanner - Backend API

Backend API cho ứng dụng Web Vulnerability Scanner được xây dựng bằng FastAPI và MySQL.

## 🚀 Tech Stack

- **Framework**: FastAPI
- **Database**: MySQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcrypt
- **Migration**: Alembic

## 📋 Prerequisites

- Python 3.9+
- MySQL 8.0+
- pip hoặc pipenv

## 🛠️ Installation

### 1. Tạo Virtual Environment

```bash
cd BE
python -m venv venv

# MacOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Cấu hình Database

Tạo database MySQL:

```sql
CREATE DATABASE vulnerability_scanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Cấu hình Environment Variables

Copy file `.env.example` thành `.env` và cập nhật thông tin:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vulnerability_scanner

# Security
SECRET_KEY=your-secret-key-here-change-this
```

### 5. Chạy Migrations (Optional - SQLAlchemy tự tạo tables)

```bash
# Initialize Alembic (nếu cần migrations)
alembic init alembic

# Hoặc để SQLAlchemy tự động tạo tables khi chạy app
```

### 6. Chạy Server

```bash
# Development mode
uvicorn app.main:app --reload

# Hoặc
python -m app.main
```

Server sẽ chạy tại: `http://localhost:8000`

## 📚 API Documentation

Sau khi chạy server, truy cập:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Projects
- `POST /api/projects` - Tạo project mới
- `GET /api/projects` - Lấy danh sách projects
- `GET /api/projects/{id}` - Lấy chi tiết project
- `PUT /api/projects/{id}` - Cập nhật project
- `DELETE /api/projects/{id}` - Xóa project

### Scans
- `POST /api/scans` - Tạo scan mới
- `GET /api/scans` - Lấy danh sách scans
- `GET /api/scans/{id}` - Lấy chi tiết scan
- `DELETE /api/scans/{id}` - Xóa scan

### Vulnerabilities
- `GET /api/vulnerabilities` - Lấy danh sách vulnerabilities
- `GET /api/vulnerabilities/{id}` - Lấy chi tiết vulnerability
- `PATCH /api/vulnerabilities/{id}` - Cập nhật vulnerability
- `DELETE /api/vulnerabilities/{id}` - Xóa vulnerability

## 📁 Project Structure

```
BE/
├── app/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── models/              # SQLAlchemy models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── scan.py
│   │   └── vulnerability.py
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API routes
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── scans.py
│   │   └── vulnerabilities.py
│   ├── core/                # Core functionality
│   │   └── security.py
│   └── utils/               # Utilities
├── alembic/                 # Database migrations
├── requirements.txt
├── .env.example
└── README.md
```

## 🔒 Security

- Passwords được hash bằng bcrypt
- JWT tokens cho authentication
- CORS được cấu hình cho FE origin
- Database credentials nên được lưu trong `.env` (không commit vào Git)

## 🧪 Testing

```bash
pytest
```

## 📝 Notes

- Database tables sẽ được tự động tạo khi chạy app lần đầu
- Để production, nhớ thay đổi `SECRET_KEY` và disable `DEBUG`
- Cấu hình CORS origins phù hợp với FE của bạn

## 🤝 Integration với Frontend

Frontend đang chạy ở `http://localhost:5173` (Vite), API endpoint sẽ là:

```javascript
const API_URL = "http://localhost:8000/api";
```

## 📧 Contact

Dự án CAPSTONE_SU26
