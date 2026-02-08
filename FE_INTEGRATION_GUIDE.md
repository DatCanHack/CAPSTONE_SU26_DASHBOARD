# Frontend-Backend Integration Guide

## ✅ Completed Steps

### 1. API Service Created
**File**: `FE/src/lib/api.ts`

Complete API service with all backend endpoints:
- ✅ Authentication (login, register, get user, update profile)
- ✅ Projects (CRUD, upload source code)
- ✅ Scans (create, get status, trigger LLM analysis)
- ✅ Reports (list, preview, download)
- ✅ Vulnerabilities (list, get details)
- ✅ PoCs (list, preview, download, verify)

**Features**:
- JWT token management
- Error handling
- File upload/download
- Singleton instance export

### 2. Authentication Updated
**File**: `FE/src/lib/auth.ts`

- ✅ Replaced mock auth with real API calls
- ✅ JWT token storage in Zustand persist
- ✅ Proper user profile structure matching backend
- ✅ Real login/logout functionality

### 3. Pages Updated
**Files**: 
- `FE/src/pages/LoginPage.tsx` - ✅ Real authentication
- `FE/src/pages/ProfilePage.tsx` - ✅ Real profile updates
- `FE/src/components/Layout.tsx` - ✅ User structure updated

**User Fields Now**:
```typescript
{
  id: number;
  email: string;
  username: string;
  phone_number: string | null;
  llm_analysis_mode: string; // "gemini_api" | "fine_tune"
  gemini_api_key: string | null;
}
```

## 🔄 Next Steps - Update Remaining Pages

### Step 1: Update HomePage (Projects List)
**File**: `FE/src/pages/HomePage.tsx`

Replace Zustand store with API calls:

```typescript
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      try {
        await api.createProject(projectName.trim());
        setProjectName('');
        setShowModal(false);
        loadProjects(); // Reload projects
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await api.deleteProject(projectId);
      loadProjects(); // Reload projects
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Rest of component...
}
```

**Note**: Backend doesn't have tags field, so remove tag functionality or store it locally.

### Step 2: Update ProjectView (Upload & Scan)
**File**: `FE/src/pages/ProjectView.tsx`

```typescript
import { api } from '../lib/api';

export function ProjectView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    loadProject();
    loadScans();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const data = await api.getProject(Number(projectId));
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const loadScans = async () => {
    try {
      const data = await api.getScans(Number(projectId));
      setScans(data);
    } catch (error) {
      console.error('Failed to load scans:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleScan = async () => {
    if (!selectedFile || !projectId) return;

    setUploading(true);
    try {
      // Step 1: Upload source code
      await api.uploadSourceCode(Number(projectId), selectedFile);
      
      // Step 2: Create scan (this auto-starts SAST in background)
      const scan = await api.createScan(Number(projectId), scanType);
      
      // Step 3: Navigate to scan view
      navigate(`/project/${projectId}/scan/${scan.id}`);
    } catch (error) {
      console.error('Failed to start scan:', error);
      alert('Failed to start scan: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
}
```

### Step 3: Update ScanView (Results & LLM Analysis)
**File**: `FE/src/pages/ScanView.tsx`

This page needs major updates to work with the new workflow:

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api';

export function ScanView() {
  const { projectId, scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadScanStatus();
    const interval = setInterval(loadScanStatus, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [scanId]);

  const loadScanStatus = async () => {
    try {
      const scanData = await api.getScan(Number(scanId));
      setScan(scanData);
      
      // If SAST completed, load vulnerabilities
      if (scanData.status === 'SAST_COMPLETED' || scanData.status === 'COMPLETED') {
        const vulns = await api.getVulnerabilities(Number(scanId));
        setVulnerabilities(vulns);
      }
    } catch (error) {
      console.error('Failed to load scan:', error);
    }
  };

  const handleAnalyzeWithLLM = async () => {
    try {
      setPolling(true);
      await api.analyzeWithLLM(Number(scanId));
      
      // Poll for completion
      const interval = setInterval(async () => {
        const scanData = await api.getScan(Number(scanId));
        if (scanData.status === 'COMPLETED' || scanData.status === 'FAILED') {
          clearInterval(interval);
          setPolling(false);
          loadScanStatus();
        }
      }, 10000); // Poll every 10s for LLM
    } catch (error) {
      console.error('Failed to analyze:', error);
      setPolling(false);
    }
  };

  // Render UI based on scan.status:
  // - PENDING / RUNNING_SAST: Show loading spinner
  // - SAST_COMPLETED: Show vulnerabilities + "Analyze with LLM" button
  // - RUNNING_LLM: Show loading spinner
  // - COMPLETED: Show "View Reports" button
}
```

### Step 4: Update ReportView (FP/TP Reports)
**File**: `FE/src/pages/ReportView.tsx`

```typescript
export function ReportView() {
  const { projectId, scanId } = useParams();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    loadReports();
  }, [scanId]);

  const loadReports = async () => {
    try {
      const data = await api.getReports(Number(scanId));
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const handlePreviewReport = async (reportId: number) => {
    try {
      const html = await api.previewReport(reportId);
      setPreviewHtml(html);
    } catch (error) {
      console.error('Failed to preview report:', error);
    }
  };

  const handleDownloadReport = async (reportId: number, fileName: string) => {
    try {
      await api.downloadReport(reportId, fileName);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };
}
```

### Step 5: Update Routes
**File**: `FE/src/routes.ts`

Update route to accept scanId:

```typescript
{
  path: 'project/:projectId/scan/:scanId',
  element: <ProtectedRoute><ScanView /></ProtectedRoute>,
},
```

## 🧪 Testing Steps

### 1. Start Backend
```bash
cd /Users/lequangdat/Documents/CAPSTONE_SU26/BE
source venv/bin/activate
uvicorn app.main:app --reload
```

Backend runs on: http://localhost:8000

### 2. Start Frontend
```bash
cd /Users/lequangdat/Documents/CAPSTONE_SU26/FE
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

### 3. Test Authentication
1. Register a new user or use existing test user:
   - Email: `test@example.com`
   - Password: `password123`
2. Login should work and store JWT token
3. Check Profile page - should show real user data

### 4. Test Project Workflow
1. Create a new project
2. Upload source code (.zip file)
3. Create scan - should auto-start SAST
4. Wait for SAST to complete (check status polling)
5. Click "Analyze with LLM"
6. Wait for LLM analysis
7. View reports (FP/TP)
8. View PoCs for each vulnerability

## 📝 Current State Summary

### ✅ Working (Backend Ready)
- User registration & login
- JWT authentication
- Profile management
- Project CRUD
- Source code upload
- SAST scanning (placeholder)
- LLM analysis (placeholder)
- Report generation
- PoC generation & verification
- File preview/download

### 🔄 Needs Frontend Updates
- HomePage: Connect to API for projects list
- ProjectView: Upload & scan workflow
- ScanView: Status polling & LLM trigger
- ReportView: Display reports from API
- All status displays (PENDING → RUNNING_SAST → SAST_COMPLETED → RUNNING_LLM → COMPLETED)

### ❌ Not Implemented Yet
- Password change endpoint (backend)
- Real SAST tools integration (Snyk, Semgrep, CodeQL)
- Real LLM analysis (Gemini API or fine-tuned model)
- Real Sandbox PoC verification

## 🎯 Recommended Implementation Order

1. **First** - Update HomePage (projects list) ✅ Easiest
2. **Second** - Update ProjectView (upload only) ✅ Medium
3. **Third** - Connect scan creation ✅ Medium
4. **Fourth** - Update ScanView with status polling ⚠️ Complex
5. **Fifth** - Update ReportView ✅ Medium
6. **Last** - Add PoC preview/download ✅ Easy

## 🐛 Common Issues & Solutions

### Issue: CORS errors
**Solution**: Backend already has CORS configured for http://localhost:3000

### Issue: 401 Unauthorized
**Solution**: Check if token is being sent. Clear localStorage and login again.

### Issue: File upload fails
**Solution**: Ensure file is .zip, .tar.gz, or .tar.xz format

### Issue: Scan stays in PENDING
**Solution**: Check backend logs. SAST module is placeholder - it should complete immediately

## 📚 API Reference

See `FRONTEND_INTEGRATION.md` in BE folder for complete API documentation with examples.

## 🔗 Important URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- API Redoc: http://localhost:8000/redoc

## 🎨 UI Notes

The UI is already fully implemented with shadcn/ui components. You only need to:
1. Replace mock data with API calls
2. Add loading states
3. Add error handling
4. Update status displays to match backend status enum

All styling and components are ready to use!
