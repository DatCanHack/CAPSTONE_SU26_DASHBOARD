# Frontend - Backend Integration Guide

## 📋 Overview

Complete guide để nối Frontend với Backend cho Web Vulnerability Scanner.

**Base URL:** `http://localhost:8000`
**API Prefix:** `/api`

---

## 🔐 Authentication

### JWT Token Authentication

Backend sử dụng JWT tokens cho authentication. Token có thời hạn ~30 days.

#### **Login Flow:**

```javascript
// 1. User login
const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        'username': 'user@example.com',
        'password': 'password123'
    })
});

const { access_token } = await loginResponse.json();
// Save token
localStorage.setItem('token', access_token);
```

#### **Using Token in Requests:**

```javascript
// Include token in all authenticated requests
const response = await fetch('http://localhost:8000/api/projects', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});
```

---

## 📚 Complete API Reference

### **1. Authentication APIs**

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "full_name": "Full Name",
  "is_active": true,
  "llm_analysis_mode": "fine_tune",
  "created_at": "2026-02-08T13:00:00"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=password123
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "New Name",
  "llm_analysis_mode": "gemini_api"
}
```

---

### **2. Project APIs**

#### Create Project
```http
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "repository_url": "https://github.com/user/repo"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "My Project",
  "description": "Project description",
  "repository_url": "https://github.com/user/repo",
  "owner_id": 1,
  "created_at": "2026-02-08T13:00:00"
}
```

#### Upload Source Code
```http
POST /api/projects/{project_id}/upload-source
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [source_code.zip]
```

**JavaScript Example:**
```javascript
async function uploadSourceCode(projectId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`http://localhost:8000/api/projects/${projectId}/upload-source`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    return await response.json();
}
```

#### List Projects
```http
GET /api/projects
Authorization: Bearer {token}
```

#### Get Project Details
```http
GET /api/projects/{project_id}
Authorization: Bearer {token}
```

#### Update Project
```http
PUT /api/projects/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /api/projects/{project_id}
Authorization: Bearer {token}
```

---

### **3. Scan APIs**

#### Create & Start Scan
```http
POST /api/scans
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": 1,
  "scan_type": "full"  // or "standard"
}
```

**Response:**
```json
{
  "id": 1,
  "project_id": 1,
  "status": "pending",
  "scan_type": "full",
  "created_at": "2026-02-08T13:00:00"
}
```

**Status Flow:**
- `pending` → SAST chưa chạy
- `running_sast` → SAST đang scan
- `sast_completed` → SAST xong, sẵn sàng LLM analysis
- `running_llm` → LLM đang analyze
- `completed` → Hoàn thành tất cả
- `failed` → Lỗi

#### Get Scan Status
```http
GET /api/scans/{scan_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "status": "sast_completed",
  "scan_type": "full",
  "scan_tools": ["snyk", "semgrep", "codeql"],
  "sast_total_issues": 15,
  "started_at": "2026-02-08T13:00:00",
  "sast_completed_at": "2026-02-08T13:05:00"
}
```

#### Trigger LLM Analysis
```http
POST /api/scans/{scan_id}/analyze-all
Authorization: Bearer {token}
```

**Response:**
```json
{
  "scan_id": 1,
  "status": "completed",
  "total_analyzed": 15,
  "true_positives": 8,
  "false_positives": 7,
  "pocs_verified": 8
}
```

#### List Scans
```http
GET /api/scans?project_id={project_id}
Authorization: Bearer {token}
```

#### Delete Scan
```http
DELETE /api/scans/{scan_id}
Authorization: Bearer {token}
```

---

### **4. Report APIs**

#### List Reports by Scan
```http
GET /api/reports?scan_id={scan_id}
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "scan_id": 1,
    "vulnerability_id": 1,
    "report_type": "true_positive",
    "summary": "SQL Injection",
    "llm_confidence": "HIGH",
    "created_at": "2026-02-08T13:10:00"
  }
]
```

#### Get Report Details
```http
GET /api/reports/{report_id}
Authorization: Bearer {token}
```

#### Preview Report
```http
GET /api/reports/{report_id}/preview
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "report_type": "true_positive",
  "summary": "SQL Injection Confirmed",
  "details": "...",
  "recommendations": "...",
  "file_path": "/tmp/Project/TP/report/report.json",
  "has_file": true,
  "file_content": { ... }
}
```

#### Download Report
```http
GET /api/reports/{report_id}/download
Authorization: Bearer {token}
```

---

### **5. PoC APIs**

#### List PoCs by Vulnerability
```http
GET /api/pocs?vulnerability_id={vuln_id}
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "vulnerability_id": 1,
    "poc_type": "real_poc",
    "poc_name": "exploit.py",
    "is_verified": true,
    "is_downloadable": true,
    "description": "SQL Injection exploit",
    "created_at": "2026-02-08T13:10:00"
  }
]
```

#### Get PoC Details
```http
GET /api/pocs/{poc_id}
Authorization: Bearer {token}
```

#### Preview PoC
```http
GET /api/pocs/{poc_id}/preview
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "poc_type": "real_poc",
  "poc_name": "exploit.py",
  "file_path": "/tmp/Project/TP/PoC/Real_PoC/exploit.py",
  "has_file": true,
  "file_content": "#!/usr/bin/env python3\n..."
}
```

#### Download PoC
```http
GET /api/pocs/{poc_id}/download
Authorization: Bearer {token}
```

---

### **6. Vulnerability APIs**

#### List Vulnerabilities by Scan
```http
GET /api/vulnerabilities?scan_id={scan_id}
Authorization: Bearer {token}
```

#### Get Vulnerability Details
```http
GET /api/vulnerabilities/{vuln_id}
Authorization: Bearer {token}
```

#### Update Vulnerability Status
```http
PATCH /api/vulnerabilities/{vuln_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "fixed"
}
```

---

## 🎯 Frontend Integration Examples

### **React/Next.js Example**

#### **1. API Service Setup**

```javascript
// services/api.js
const API_BASE_URL = 'http://localhost:8000';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }
    
    getToken() {
        return localStorage.getItem('token');
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
        };
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Request failed');
        }
        
        return response.json();
    }
    
    // Auth
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        return this.request('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });
    }
    
    async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }
    
    async getCurrentUser() {
        return this.request('/api/auth/me');
    }
    
    // Projects
    async createProject(projectData) {
        return this.request('/api/projects', {
            method: 'POST',
            body: JSON.stringify(projectData),
        });
    }
    
    async uploadSourceCode(projectId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return this.request(`/api/projects/${projectId}/upload-source`, {
            method: 'POST',
            headers: {}, // Let browser set Content-Type for FormData
            body: formData,
        });
    }
    
    async getProjects() {
        return this.request('/api/projects');
    }
    
    async getProject(projectId) {
        return this.request(`/api/projects/${projectId}`);
    }
    
    // Scans
    async createScan(scanData) {
        return this.request('/api/scans', {
            method: 'POST',
            body: JSON.stringify(scanData),
        });
    }
    
    async getScan(scanId) {
        return this.request(`/api/scans/${scanId}`);
    }
    
    async analyzeScan(scanId) {
        return this.request(`/api/scans/${scanId}/analyze-all`, {
            method: 'POST',
        });
    }
    
    // Reports
    async getReports(scanId) {
        return this.request(`/api/reports?scan_id=${scanId}`);
    }
    
    async previewReport(reportId) {
        return this.request(`/api/reports/${reportId}/preview`);
    }
    
    downloadReport(reportId) {
        const token = this.getToken();
        window.location.href = `${this.baseURL}/api/reports/${reportId}/download?token=${token}`;
    }
    
    // PoCs
    async getPoCs(vulnerabilityId) {
        return this.request(`/api/pocs?vulnerability_id=${vulnerabilityId}`);
    }
    
    async previewPoC(pocId) {
        return this.request(`/api/pocs/${pocId}/preview`);
    }
    
    downloadPoC(pocId) {
        const token = this.getToken();
        window.location.href = `${this.baseURL}/api/pocs/${pocId}/download?token=${token}`;
    }
}

export const api = new APIService();
```

#### **2. React Hook Example**

```javascript
// hooks/useProjects.js
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        loadProjects();
    }, []);
    
    async function loadProjects() {
        try {
            setLoading(true);
            const data = await api.getProjects();
            setProjects(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function createProject(projectData) {
        const newProject = await api.createProject(projectData);
        setProjects([...projects, newProject]);
        return newProject;
    }
    
    return { projects, loading, error, createProject, refresh: loadProjects };
}
```

#### **3. Component Example**

```javascript
// components/ProjectList.jsx
import React from 'react';
import { useProjects } from '../hooks/useProjects';

export function ProjectList() {
    const { projects, loading, error, createProject } = useProjects();
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    
    return (
        <div>
            <h2>Projects</h2>
            {projects.map(project => (
                <div key={project.id}>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                </div>
            ))}
        </div>
    );
}
```

---

## 🔄 Complete Workflow Example

```javascript
// Complete workflow from project creation to viewing results

async function completeWorkflow() {
    // 1. Login
    const { access_token } = await api.login('user@example.com', 'password');
    localStorage.setItem('token', access_token);
    
    // 2. Create Project
    const project = await api.createProject({
        name: 'My Project',
        description: 'Test project',
        repository_url: 'https://github.com/user/repo'
    });
    
    // 3. Upload Source Code
    const file = document.getElementById('fileInput').files[0];
    await api.uploadSourceCode(project.id, file);
    
    // 4. Start Scan
    const scan = await api.createScan({
        project_id: project.id,
        scan_type: 'full'
    });
    
    // 5. Poll Scan Status
    let scanStatus;
    do {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
        scanStatus = await api.getScan(scan.id);
    } while (scanStatus.status === 'pending' || scanStatus.status === 'running_sast');
    
    // 6. Trigger LLM Analysis
    if (scanStatus.status === 'sast_completed') {
        const analysisResult = await api.analyzeScan(scan.id);
        console.log(`Analyzed: ${analysisResult.total_analyzed} vulnerabilities`);
    }
    
    // 7. Poll until LLM completes
    do {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
        scanStatus = await api.getScan(scan.id);
    } while (scanStatus.status === 'running_llm');
    
    // 8. Get Reports
    if (scanStatus.status === 'completed') {
        const reports = await api.getReports(scan.id);
        
        // Display TP reports
        const tpReports = reports.filter(r => r.report_type === 'true_positive');
        console.log(`True Positives: ${tpReports.length}`);
        
        // Get PoCs for first TP
        if (tpReports.length > 0) {
            const pocs = await api.getPoCs(tpReports[0].vulnerability_id);
            console.log(`PoCs found: ${pocs.length}`);
        }
    }
}
```

---

## ⚠️ Error Handling

```javascript
// Standard error handling
async function handleAPICall() {
    try {
        const result = await api.getProjects();
        return result;
    } catch (error) {
        if (error.message.includes('401')) {
            // Unauthorized - redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        } else if (error.message.includes('404')) {
            // Not found
            console.error('Resource not found');
        } else {
            // Other errors
            console.error('API Error:', error.message);
        }
    }
}
```

---

## 🚀 Quick Start Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] CORS configured (already done in `main.py`)
- [ ] Create API service in frontend
- [ ] Implement authentication flow
- [ ] Test API connection with `/health` endpoint
- [ ] Implement project creation
- [ ] Implement file upload
- [ ] Implement scan workflow
- [ ] Implement report viewing
- [ ] Test complete workflow

---

## 📝 API Testing

### Test with cURL:
```bash
# Test health
curl http://localhost:8000/health

# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=test123"
```

### Test with Postman:
- Import collection from `/docs` endpoint
- Set Bearer Token in Authorization
- Test all endpoints

**Backend sẵn sàng để connect với Frontend!** 🚀
