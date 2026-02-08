import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { api } from '../lib/api';
import { 
  ChevronRight, FileJson, CheckCircle, Loader2, Brain, 
  Shield, Clock, RefreshCw, ArrowLeft
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  created_at: string;
}

interface Scan {
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
}

interface ScanResultFile {
  id: string;
  fileName: string;
  vulnerabilityType: 'SQL Injection' | 'XSS' | 'Command Injection';
  status: 'pending' | 'scanning' | 'completed';
  resultPath: string;
  scannedAt?: Date;
}

export function ScanResultPage() {
  const { projectId, scanId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [scanResultFiles, setScanResultFiles] = useState<ScanResultFile[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId, scanId]);

  const isCompleted = (status: string) => {
    return status === 'COMPLETED' || status === 'sast_completed' || status === 'llm_completed';
  };

  const isRunning = (status: string) => {
    return status === 'PENDING' || status === 'RUNNING' || status === 'sast_running' || status === 'llm_running';
  };

  useEffect(() => {
    if (scan && isRunning(scan.status)) {
      const interval = setInterval(() => {
        loadScan();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [scan?.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadProject(), loadScan()]);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async () => {
    const data = await api.getProject(Number(projectId));
    setProject(data);
  };

  const loadScan = async () => {
    const data = await api.getScan(Number(scanId));
    setScan(data);
    
    if (isCompleted(data.status)) {
      generateScanResultFiles(data);
    }
  };

  const generateScanResultFiles = async (scanData: Scan) => {
    const basePath = `C:\\tmp\\${project?.name || 'project'}\\scan_results`;
    
    // Load vulnerabilities from database to check which types have been analyzed
    let analyzedTypes: Set<string> = new Set();
    try {
      const vulnerabilities = await api.getVulnerabilities(scanData.id);
      // Check which vulnerability types have been analyzed (have TP or FP status)
      for (const vuln of vulnerabilities) {
        // Status from BE: 'true_positive', 'false_positive', 'pending_analysis', etc.
        if (vuln.status === 'true_positive' || vuln.status === 'false_positive') {
          if (vuln.title?.includes('SQL Injection')) analyzedTypes.add('SQL Injection');
          if (vuln.title?.includes('XSS')) analyzedTypes.add('XSS');
          if (vuln.title?.includes('Command Injection')) analyzedTypes.add('Command Injection');
        }
      }
    } catch (err) {
      console.log('No existing vulnerabilities found');
    }
    
    const files: ScanResultFile[] = [
      {
        id: `${scanData.id}-sqli`,
        fileName: 'SQL_Injection_results.json',
        vulnerabilityType: 'SQL Injection',
        status: analyzedTypes.has('SQL Injection') ? 'completed' : 'pending',
        resultPath: `${basePath}\\SQL_Injection_results.json`,
      },
      {
        id: `${scanData.id}-xss`,
        fileName: 'XSS_results.json',
        vulnerabilityType: 'XSS',
        status: analyzedTypes.has('XSS') ? 'completed' : 'pending',
        resultPath: `${basePath}\\XSS_results.json`,
      },
      {
        id: `${scanData.id}-cmdi`,
        fileName: 'Command_Injection_results.json',
        vulnerabilityType: 'Command Injection',
        status: analyzedTypes.has('Command Injection') ? 'completed' : 'pending',
        resultPath: `${basePath}\\Command_Injection_results.json`,
      },
    ];

    setScanResultFiles(files);
  };

  const handleAnalyze = async (fileId: string) => {
    setAnalyzing(fileId);
    
    setScanResultFiles(files => 
      files.map(f => f.id === fileId ? { ...f, status: 'scanning' as const } : f)
    );

    try {
      // Map file ID to vulnerability type for API
      const vulnerabilityTypeMap: Record<string, string> = {
        [`${scan?.id}-sqli`]: 'sql_injection',
        [`${scan?.id}-xss`]: 'xss',
        [`${scan?.id}-cmdi`]: 'command_injection',
      };
      
      const vulnType = vulnerabilityTypeMap[fileId];
      
      if (vulnType && scan) {
        // Call actual LLM API endpoint
        const response = await api.analyzeVulnerabilityType(scan.id, vulnType);
        console.log('LLM Analysis result:', response);
      }

      setScanResultFiles(files => 
        files.map(f => f.id === fileId ? { ...f, status: 'completed' as const, scannedAt: new Date() } : f)
      );
    } catch (err) {
      console.error('LLM Analysis failed:', err);
      // Revert to pending status on error
      setScanResultFiles(files => 
        files.map(f => f.id === fileId ? { ...f, status: 'pending' as const } : f)
      );
      setError(err instanceof Error ? err.message : 'LLM analysis failed');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleAnalyzeAll = async () => {
    const pendingFiles = scanResultFiles.filter(f => f.status === 'pending');
    for (const file of pendingFiles) {
      await handleAnalyze(file.id);
    }
  };

  const getStatusColor = (status: string) => {
    if (isCompleted(status)) return 'text-green-400 bg-green-500/10';
    if (isRunning(status)) return 'text-yellow-400 bg-yellow-500/10';
    if (status === 'FAILED' || status === 'sast_failed') return 'text-red-400 bg-red-500/10';
    return 'text-gray-400 bg-gray-500/10';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'sast_completed') return 'SAST Completed';
    if (status === 'llm_completed') return 'Analysis Complete';
    if (status === 'sast_running') return 'SAST Running';
    if (status === 'llm_running') return 'LLM Analyzing';
    return status;
  };

  const vulnerabilityColors: Record<string, string> = {
    'SQL Injection': 'bg-red-500/10 text-red-400 border-red-500/30',
    'XSS': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    'Command Injection': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  const allCompleted = scanResultFiles.every(f => f.status === 'completed');
  const hasPending = scanResultFiles.some(f => f.status === 'pending');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !scan) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <p className="text-gray-400">{error || 'Scan not found'}</p>
          <Link to="/projects" className="mt-4 text-blue-400 hover:text-blue-300 text-sm block">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/projects" className="text-gray-400 hover:text-white transition-colors">Projects</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/project/${projectId}`} className="text-gray-400 hover:text-white transition-colors">{project.name}</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-white">Scan Results</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">LLM Analysis</h1>
            <p className="text-gray-400 text-sm">Analyze JSON scan results using AI to identify FP/TP</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </button>
            {allCompleted && scanResultFiles.length > 0 && (
              <button
                onClick={() => navigate(`/project/${projectId}/report`)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                View Reports
              </button>
            )}
            {hasPending && (
              <button
                onClick={handleAnalyzeAll}
                disabled={!!analyzing}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Brain className="w-4 h-4" />
                Analyze All with LLM
              </button>
            )}
          </div>
        </div>

        {/* Scan Status Card */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  {scan.scan_type === 'full' ? 'Full Scan' : 'Standard Scan'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(scan.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(scan.status)}`}>
              {isRunning(scan.status) && (
                <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
              )}
              {getStatusLabel(scan.status)}
            </span>
          </div>

          {isRunning(scan.status) && (
            <div className="mt-4 bg-[#252525] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                  <p className="text-sm text-white">Scan in progress...</p>
                  <p className="text-xs text-gray-500">SAST tools are analyzing your code. This may take a few minutes.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        {isCompleted(scan.status) && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">AI-Powered Analysis</p>
                <p className="text-sm text-gray-400">
                  Click "Analyze" on each JSON file to use LLM for identifying False Positives and True Positives. 
                  The AI will generate detailed FP/TP reports for each vulnerability type.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Results Table */}
        {isCompleted(scan.status) && (
          scanResultFiles.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
              <FileJson className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No scan results available</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#252525] border-b border-[#333333]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vulnerability Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Result Path</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {scanResultFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileJson className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-white">{file.fileName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${vulnerabilityColors[file.vulnerabilityType]}`}>
                          {file.vulnerabilityType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {file.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/30">
                            Pending
                          </span>
                        )}
                        {file.status === 'scanning' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </span>
                        )}
                        {file.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                            <CheckCircle className="w-3 h-3" />
                            Analyzed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono max-w-xs truncate">
                        {file.resultPath}
                      </td>
                      <td className="px-6 py-4">
                        {file.status === 'pending' && (
                          <button
                            onClick={() => handleAnalyze(file.id)}
                            disabled={!!analyzing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded text-sm text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 disabled:bg-gray-700/10 disabled:border-gray-600/30 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                          >
                            <Brain className="w-4 h-4" />
                            Analyze
                          </button>
                        )}
                        {file.status === 'completed' && (
                          <span className="text-xs text-green-400">✓ Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
