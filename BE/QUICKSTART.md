# 🚀 Quick Start Guide

## ✅ Prerequisites Checklist

- [x] MySQL installed and running
- [x] Database `vulnerability_scanner` created
- [x] `.env` file configured
- [ ] Python virtual environment
- [ ] Dependencies installed
- [ ] Backend running

---

## 📦 Step 1: Create Virtual Environment

```bash
cd /Users/lequangdat/Documents/CAPSTONE_SU26/BE

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Verify
which python
# Should show: /Users/lequangdat/Documents/CAPSTONE_SU26/BE/venv/bin/python
```

---

## 📥 Step 2: Install Dependencies

```bash
# Make sure venv is activated (you should see (venv) in prompt)
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt

# Verify installation
pip list | grep -E "(fastapi|sqlalchemy|pymysql|uvicorn)"
```

**Expected output:**
```
fastapi              0.115.0
sqlalchemy           2.0.35
pymysql              1.1.1
uvicorn              0.32.0
```

---

## 🔌 Step 3: Test Database Connection

```bash
# Test connection before starting app
python test_db_connection.py
```

**Expected output:**
```
============================================================
Testing MySQL Connection
============================================================

Database Config:
  Host: localhost
  Port: 3306
  User: root
  Database: vulnerability_scanner
  Connection URL: mysql+pymysql://root:@localhost:3306/vulnerability_scanner

🔌 Attempting to connect...
✅ Connection successful!
✅ Connected to database: vulnerability_scanner
✅ MySQL version: 8.0.xx
============================================================
✅ All tests passed! Database is ready.
============================================================
```

---

## 🚀 Step 4: Start the Backend

```bash
# Start with auto-reload (for development)
uvicorn app.main:app --reload

# Or with custom host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
INFO:     Will watch for changes in these directories: ['/Users/lequangdat/Documents/CAPSTONE_SU26/BE']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Tables will be created automatically by SQLAlchemy on first run!**

---

## ✅ Step 5: Verify Everything Works

### 1. Test Health Endpoint

```bash
# In a new terminal
curl http://localhost:8000/health
```

**Expected:** `{"status":"healthy"}`

### 2. Access API Documentation

Open browser: **http://localhost:8000/docs**

You should see Swagger UI with all endpoints.

### 3. Verify Database Tables

```bash
mysql -u root -e "USE vulnerability_scanner; SHOW TABLES;"
```

**Expected tables:**
```
+----------------------------------+
| Tables_in_vulnerability_scanner  |
+----------------------------------+
| pocs                             |
| projects                         |
| reports                          |
| scans                            |
| users                            |
| vulnerabilities                  |
+----------------------------------+
```

---

## 🧪 Step 6: Test API Endpoints

### Register a User

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

### Login

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

**Copy the `access_token` from response.**

### Get Current User

```bash
curl -X GET "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 🎯 Next Steps

1. ✅ Backend is running
2. ✅ Database is connected
3. ✅ API is working
4. ⏭️ Start developing or integrating modules:
   - SAST Module (Snyk, Semgrep, CodeQL)
   - LLM Analyst Module (Gemini API / Fine-tune)
   - Sandbox Module (PoC testing)

---

## 🛑 Common Issues

### Port 8000 Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### MySQL Connection Error

```bash
# Check MySQL is running
brew services list | grep mysql

# Restart MySQL
brew services restart mysql
```

### ImportError or ModuleNotFoundError

```bash
# Make sure venv is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

### Tables Not Created

```bash
# Restart the app - SQLAlchemy will create them
# Or manually trigger:
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

---

## 📝 Development Workflow

```bash
# 1. Activate venv
source venv/bin/activate

# 2. Start backend
uvicorn app.main:app --reload

# 3. Make changes to code (auto-reloads)

# 4. Test in browser at http://localhost:8000/docs

# 5. When done
# Press CTRL+C to stop
# deactivate to exit venv
```

---

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Workflow**: See `WORKFLOW.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **MySQL Setup**: See `SETUP_MYSQL.md`

---

## 🎉 You're All Set!

Backend is ready for development. Happy coding! 🚀
