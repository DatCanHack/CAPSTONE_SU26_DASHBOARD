# Super SAST - Hybrid Automated Security Testing Platform

A Hybrid Automated Security Testing Platform that combines traditional SAST tools with LLM-powered analysis to reduce false positives and generate actionable security reports.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Super SAST                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite)                           │
│  - Dashboard & Project Management                                │
│  - Scan Results Visualization                                    │
│  - TP/FP Report Viewer                                          │
│  - PoC Management                                                │
├─────────────────────────────────────────────────────────────────┤
│  Backend (FastAPI + Python)                                      │
│  - REST API                                                      │
│  - Authentication (JWT)                                          │
│  - SAST Scanner Integration (Snyk, Semgrep, CodeQL)             │
│  - LLM Analyzer Module                                           │
│  - Sandbox Module (PoC Verification)                            │
├─────────────────────────────────────────────────────────────────┤
│  Database (MySQL)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

- **Multi-tool SAST Scanning**: Integration with Snyk, Semgrep, and CodeQL
- **LLM-Powered Analysis**: Reduce false positives using AI analysis
- **PoC Generation**: Automatic Proof of Concept generation for true positives
- **Sandbox Verification**: Verify PoC exploitability in isolated environment
- **Interactive Reports**: Detailed TP/FP reports with recommendations
- **User Management**: JWT-based authentication and authorization

## 📁 Project Structure

```
CAPSTONE_SU26/
├── BE/                     # Backend (FastAPI)
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── core/          # Core configurations
│   ├── requirements.txt
│   └── main.py
├── FE/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities & API client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI
- **Database**: SQLAlchemy + SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT (python-jose)
- **SAST Tools**: Snyk, Semgrep, CodeQL

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Routing**: React Router v7

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd BE

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd FE

# Install dependencies
npm install

# Run development server
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📝 API Documentation

Once the backend is running, access the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔧 Configuration

### Backend Environment Variables (.env)

```env
DATABASE_URL=sqlite:///./sast.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend Environment Variables (.env)

```env
VITE_API_URL=http://localhost:8000
```

## 📄 License

This project is for educational purposes as part of the Capstone Project.

---

**Note**: This project includes mock implementations for SAST tools, LLM analyzer, and Sandbox module. See `INTEGRATION_GUIDE.md` for details on integrating real modules.
