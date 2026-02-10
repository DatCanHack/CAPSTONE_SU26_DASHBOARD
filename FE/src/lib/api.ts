// API Service for backend communication
const API_BASE_URL = 'http://localhost:8000';

interface ApiError {
  detail: string | Array<{ msg: string; type: string }>;
}

class APIService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    // Try to get token from zustand auth store
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        // Zustand persist stores data in { state: { ... }, version: 0 } format
        const storedToken = parsed.state?.token || null;
        if (storedToken) {
          this.token = storedToken;
        }
      }
    } catch (e) {
      console.error('Failed to load token from storage', e);
    }
  }

  private getToken(): string | null {
    // If we don't have a token in memory, try loading from localStorage
    if (!this.token) {
      this.loadToken();
    }
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const currentToken = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          this.clearToken();
          // Clear auth storage and redirect to login
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData: ApiError = await response.json();
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(e => e.msg).join(', ');
          }
        } catch (e) {
          // If parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // ============ AUTH ENDPOINTS ============
  async register(username: string, email: string, password: string) {
    return this.request<{
      id: number;
      username: string;
      email: string;
      llm_analysis_mode: string;
      created_at: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async getCurrentUser() {
    return this.request<{
      id: number;
      username: string;
      email: string;
      phone_number: string | null;
      llm_analysis_mode: string;
      gemini_api_key: string | null;
      created_at: string;
    }>('/api/auth/me');
  }

  async updateProfile(data: {
    username?: string;
    phone_number?: string;
    llm_analysis_mode?: string;
    gemini_api_key?: string;
  }) {
    return this.request<{
      id: number;
      username: string;
      email: string;
      phone_number: string | null;
      llm_analysis_mode: string;
      gemini_api_key: string | null;
    }>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ PROJECT ENDPOINTS ============
  async getProjects() {
    return this.request<Array<{
      id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }>>('/api/projects/');
  }

  async getProject(projectId: number) {
    return this.request<{
      id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }>(`/api/projects/${projectId}`);
  }

  async createProject(name: string) {
    return this.request<{
      id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }>('/api/projects/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(projectId: number) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async uploadSourceCode(projectId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const currentToken = this.getToken();
    const headers: HeadersInit = {};
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/upload-source`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Upload failed');
    }

    return response.json();
  }

  async uploadSourceFolder(projectId: number, files: FileList) {
    const formData = new FormData();
    
    // Append all files with their relative paths
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // webkitRelativePath contains the full path including folder name
      formData.append('files', file, file.webkitRelativePath || file.name);
    }

    const currentToken = this.getToken();
    const headers: HeadersInit = {};
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/upload-folder`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Folder upload failed');
    }

    return response.json();
  }

  // ============ SCAN ENDPOINTS ============
  async getScans(projectId: number) {
    return this.request<Array<{
      id: number;
      project_id: number;
      scan_type: string;
      status: string;
      total_issues: number | null;
      critical_count: number | null;
      high_count: number | null;
      medium_count: number | null;
      low_count: number | null;
      results_path: string | null;
      created_at: string;
      completed_at: string | null;
      // Source code info
      source_code_type: string | null;
      source_code_name: string | null;
      source_code_file_count: number | null;
      source_code_size: number | null;
    }>>(`/api/scans/?project_id=${projectId}`);
  }

  async getScan(scanId: number) {
    return this.request<{
      id: number;
      project_id: number;
      scan_type: string;
      status: string;
      total_issues: number | null;
      critical_count: number | null;
      high_count: number | null;
      medium_count: number | null;
      low_count: number | null;
      results_path: string | null;
      created_at: string;
      completed_at: string | null;
      // Source code info
      source_code_type: string | null;
      source_code_name: string | null;
      source_code_file_count: number | null;
      source_code_size: number | null;
    }>(`/api/scans/${scanId}`);
  }

  async createScan(projectId: number, scanType: 'full' | 'standard') {
    return this.request<{
      id: number;
      project_id: number;
      scan_type: string;
      status: string;
      total_issues: number | null;
      created_at: string;
    }>('/api/scans/', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        scan_type: scanType,
      }),
    });
  }

  async analyzeWithLLM(scanId: number) {
    return this.request<{
      scan_id: number;
      message: string;
      status: string;
    }>(`/api/scans/${scanId}/analyze-all`, {
      method: 'POST',
    });
  }

  async analyzeVulnerabilityType(scanId: number, vulnerabilityType: string, forceReanalyze: boolean = false) {
    const params = new URLSearchParams({
      vulnerability_type: vulnerabilityType,
      force_reanalyze: forceReanalyze.toString()
    });
    return this.request<{
      scan_id: number;
      vulnerability_type: string;
      status: string;
      message: string;
      results: {
        vulnerability_type: string;
        total_findings: number;
        true_positives: number;
        false_positives: number;
        reports_generated: Array<{
          type: string;
          path: string;
        }>;
        pocs_generated: number;
      };
    }>(`/api/scans/${scanId}/analyze-vulnerability-type?${params.toString()}`, {
      method: 'POST',
    });
  }

  // ============ REPORT ENDPOINTS ============
  async getReports(scanId: number) {
    return this.request<Array<{
      id: number;
      scan_id: number;
      vulnerability_id: number;
      report_type: string;
      file_path: string;
      created_at: string;
    }>>(`/api/reports/?scan_id=${scanId}`);
  }

  async previewReport(reportId: number) {
    const currentToken = this.getToken();
    const response = await fetch(
      `${API_BASE_URL}/api/reports/${reportId}/preview`,
      {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch report preview');
    }

    return response.text();
  }

  async downloadReport(reportId: number, filename: string) {
    const currentToken = this.getToken();
    const response = await fetch(
      `${API_BASE_URL}/api/reports/${reportId}/download`,
      {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ============ VULNERABILITY ENDPOINTS ============
  async getVulnerabilities(scanId: number) {
    return this.request<Array<{
      id: number;
      scan_id: number;
      title: string;
      severity: string;
      status: string;  // 'pending_analysis' | 'analyzing' | 'true_positive' | 'false_positive' | etc.
      description: string | null;
      sast_json_path: string | null;
      cwe_id: string | null;
      cvss_score: string | null;
      file_path: string | null;
      line_number: number | null;
      code_snippet: string | null;
      recommendation: string | null;
      llm_confidence_score: string | null;
      is_false_positive: boolean;
      created_at: string;
      updated_at: string | null;
    }>>(`/api/vulnerabilities/?scan_id=${scanId}`);
  }

  async getVulnerability(vulnId: number) {
    return this.request<{
      id: number;
      scan_id: number;
      title: string;
      severity: string;
      description: string;
      file_path: string | null;
      line_number: number | null;
      code_snippet: string | null;
      llm_classification: string | null;
      confidence_score: number | null;
      created_at: string;
    }>(`/api/vulnerabilities/${vulnId}`);
  }

  // ============ POC ENDPOINTS ============
  async getPoCsByVulnerability(vulnerabilityId: number) {
    return this.request<Array<{
      id: number;
      vulnerability_id: number;
      poc_type: string;
      poc_name: string | null;
      poc_path: string | null;
      sandbox_tested: boolean;
      exploit_successful: boolean | null;
      sandbox_result: string | null;
      sandbox_tested_at: string | null;
      file_size: number | null;
      is_downloadable: boolean;
      description: string | null;
      created_at: string;
      updated_at: string | null;
    }>>(`/api/pocs/?vulnerability_id=${vulnerabilityId}`);
  }

  async previewPoC(pocId: number) {
    const currentToken = this.getToken();
    const response = await fetch(`${API_BASE_URL}/api/pocs/${pocId}/preview`, {
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
    });

    if (!response.ok) {
      throw new Error('Failed to fetch PoC preview');
    }

    return response.text();
  }

  async downloadPoC(pocId: number, filename: string) {
    const currentToken = this.getToken();
    const response = await fetch(
      `${API_BASE_URL}/api/pocs/${pocId}/download`,
      {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download PoC');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async verifyPoC(pocId: number) {
    return this.request<{
      id: number;
      vulnerability_id: number;
      poc_type: string;
      poc_name: string | null;
      poc_path: string | null;
      sandbox_tested: boolean;
      exploit_successful: boolean | null;
      sandbox_result: string | null;
      sandbox_tested_at: string | null;
      file_size: number | null;
      is_downloadable: boolean;
      description: string | null;
      created_at: string;
      updated_at: string | null;
    }>(`/api/pocs/${pocId}/verify`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const api = new APIService();
