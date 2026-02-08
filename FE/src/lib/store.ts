import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  tags: string[];
  createdAt: Date;
  hasScanned: boolean;
  sourcePath: string;
}

export interface ScanResult {
  id: string;
  projectId: string;
  fileName: string;
  vulnerabilityType: 'SQL Injection' | 'XSS' | 'Command Injection';
  status: 'pending' | 'scanning' | 'completed';
  resultPath: string;
  scannedAt?: Date;
}

export interface Report {
  id: string;
  projectId: string;
  fileName: string;
  type: 'FP' | 'TP';
  reportPath: string;
  createdAt: Date;
}

export interface PoC {
  id: string;
  reportId: string;
  fileName: string;
  quality: 'Real' | 'Poor';
  pocPath: string;
}

interface LLMSettings {
  provider: 'Gemini' | 'FineTune';
  geminiApiKey?: string;
}

interface AppState {
  projects: Project[];
  scanResults: ScanResult[];
  reports: Report[];
  pocs: PoC[];
  llmSettings: LLMSettings;
  
  createProject: (name: string, tags: string[]) => Project;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  
  addScanResult: (result: Omit<ScanResult, 'id'>) => void;
  updateScanResult: (id: string, updates: Partial<ScanResult>) => void;
  getScanResultsByProject: (projectId: string) => ScanResult[];
  
  addReport: (report: Omit<Report, 'id' | 'createdAt'>) => void;
  getReportsByProject: (projectId: string) => Report[];
  
  addPoC: (poc: Omit<PoC, 'id'>) => void;
  updatePoC: (id: string, updates: Partial<PoC>) => void;
  getPoCsByReport: (reportId: string) => PoC[];
  
  updateLLMSettings: (settings: Partial<LLMSettings>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      scanResults: [],
      reports: [],
      pocs: [],
      llmSettings: {
        provider: 'Gemini',
      },
      
      createProject: (name, tags) => {
        const project: Project = {
          id: Date.now().toString(),
          name,
          tags,
          createdAt: new Date(),
          hasScanned: false,
          sourcePath: `C:\\tmp\\${name}\\source_code\\`,
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          scanResults: state.scanResults.filter((s) => s.projectId !== id),
          reports: state.reports.filter((r) => r.projectId !== id),
        }));
      },
      
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },
      
      addScanResult: (result) => {
        const scanResult: ScanResult = {
          ...result,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({ scanResults: [...state.scanResults, scanResult] }));
      },
      
      updateScanResult: (id, updates) => {
        set((state) => ({
          scanResults: state.scanResults.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },
      
      getScanResultsByProject: (projectId) => {
        return get().scanResults.filter((s) => s.projectId === projectId);
      },
      
      addReport: (report) => {
        const newReport: Report = {
          ...report,
          id: Date.now().toString(),
          createdAt: new Date(),
        };
        set((state) => ({ reports: [...state.reports, newReport] }));
      },
      
      getReportsByProject: (projectId) => {
        return get().reports.filter((r) => r.projectId === projectId);
      },
      
      addPoC: (poc) => {
        const newPoC: PoC = {
          ...poc,
          id: Date.now().toString(),
        };
        set((state) => ({ pocs: [...state.pocs, newPoC] }));
      },
      
      updatePoC: (id, updates) => {
        set((state) => ({
          pocs: state.pocs.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },
      
      getPoCsByReport: (reportId) => {
        return get().pocs.filter((p) => p.reportId === reportId);
      },
      
      updateLLMSettings: (settings) => {
        set((state) => ({
          llmSettings: { ...state.llmSettings, ...settings },
        }));
      },
    }),
    {
      name: 'app-storage',
    }
  )
);