import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { CheckCircle, Eye, Download, FileText, ChevronRight, AlertTriangle, Loader2, Play, FlaskConical, ArrowLeft, Terminal } from 'lucide-react';

interface Project {
  id: number;
  name: string;
}

interface Report {
  id: number;
  scan_id: number;
  vulnerability_id: number;
  report_type: string;
  report_path: string | null;
  summary: string | null;
  details: string | null;
  recommendations: string | null;
  llm_confidence: string | null;
  created_at: string;
}

interface Vulnerability {
  id: number;
  title: string;
  description: string | null;
  file_path: string | null;
  line_number: number | null;
  code_snippet: string | null;
  cwe_id: string | null;
  status: string;
}

interface PoC {
  id: number;
  vulnerability_id: number;
  poc_type: string;
  poc_name: string | null;
  poc_path: string | null;
  description: string | null;
  sandbox_tested: boolean;
  exploit_successful: boolean | null;
  sandbox_result: string | null;
  is_downloadable: boolean;
  created_at: string;
}

interface ReportPreview {
  id: number;
  report_type: string;
  summary: string | null;
  details: string | null;
  recommendations: string | null;
  llm_confidence: string | null;
  vulnerability?: Vulnerability;
}

export function TruePositiveReport() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tpReports, setTpReports] = useState<Report[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [pocs, setPocs] = useState<PoC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewReport, setPreviewReport] = useState<ReportPreview | null>(null);
  const [verifyingPoc, setVerifyingPoc] = useState<number | null>(null);
  const [sandboxLogPoc, setSandboxLogPoc] = useState<PoC | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectData = await api.getProject(Number(projectId));
      setProject(projectData);

      // Get latest scan
      const scans = await api.getScans(Number(projectId));
      const completedScan = scans.find(s => s.status === 'completed' || s.status === 'sast_completed');
      
      if (completedScan) {
        const [reportsData, vulnsData] = await Promise.all([
          api.getReports(completedScan.id),
          api.getVulnerabilities(completedScan.id)
        ]);
        
        // Filter only TP reports
        const tpOnly = reportsData.filter(r => r.report_type === 'true_positive');
        setTpReports(tpOnly);
        setVulnerabilities(vulnsData);
        
        // Load PoCs for each TP vulnerability
        const tpVulnIds = vulnsData
          .filter(v => v.status === 'true_positive')
          .map(v => v.id);
        
        const allPocs: PoC[] = [];
        for (const vulnId of tpVulnIds) {
          try {
            const vulnPocs = await api.getPoCsByVulnerability(vulnId);
            allPocs.push(...vulnPocs);
          } catch (err) {
            // No PoCs for this vulnerability
          }
        }
        setPocs(allPocs);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (report: Report) => {
    const vuln = vulnerabilities.find(v => v.id === report.vulnerability_id);
    setPreviewReport({
      id: report.id,
      report_type: report.report_type,
      summary: report.summary,
      details: report.details,
      recommendations: report.recommendations,
      llm_confidence: report.llm_confidence,
      vulnerability: vuln
    });
  };

  const handleVerifyPoC = async (pocId: number) => {
    try {
      setVerifyingPoc(pocId);
      // Call verify PoC API - this will be connected to Sandbox Module later
      const result = await api.verifyPoC(pocId);
      console.log('PoC verification result:', result);
      
      // Reload data to get updated PoC status
      await loadData();
    } catch (err) {
      console.error('Failed to verify PoC:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify PoC');
    } finally {
      setVerifyingPoc(null);
    }
  };

  const getPoCsForVulnerability = (vulnId: number) => {
    return pocs.filter(p => p.vulnerability_id === vulnId);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <p className="text-gray-400">{error || 'Project not found'}</p>
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
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">Projects</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/project/${projectId}`} className="text-gray-400 hover:text-white transition-colors">{project.name}</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/project/${projectId}/report`} className="text-gray-400 hover:text-white transition-colors">Reports</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-white">True Positives</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <h1 className="text-2xl font-semibold text-white">True Positive Reports</h1>
            </div>
            <p className="text-gray-400 text-sm">Review vulnerabilities and manage PoC files</p>
          </div>
          <button
            onClick={() => navigate(`/project/${projectId}/report`)}
            className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>
        </div>

        {/* True Positive Reports Table */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
          <div className="bg-[#252525] border-b border-[#333333] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                All True Positives ({tpReports.length})
              </h2>
              <span className="text-sm text-gray-400">
                Path: C:\tmp\{project.name}\TP\
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#252525] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">PoC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {tpReports.map((report) => {
                  const vuln = vulnerabilities.find(v => v.id === report.vulnerability_id);
                  const vulnPocs = vuln ? getPoCsForVulnerability(vuln.id) : [];
                  return (
                    <tr key={report.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-6 py-4 text-sm text-white">
                        <div>
                          <p>{vuln?.title || `Report #${report.id}`}</p>
                          {vuln?.cwe_id && (
                            <span className="text-xs text-gray-500">{vuln.cwe_id}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(report.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {vulnPocs.length > 0 ? (
                          <div className="space-y-2">
                            {vulnPocs.map((poc) => (
                              <div key={poc.id} className="flex items-center gap-2">
                                {/* Show PoC status based on sandbox_tested */}
                                {!poc.sandbox_tested ? (
                                  // Not yet verified - show Pending and Verify button
                                  <>
                                    <span className="px-2.5 py-1 rounded text-xs font-medium border bg-gray-500/10 text-gray-400 border-gray-500/30">
                                      Pending Verification
                                    </span>
                                    <button
                                      onClick={() => handleVerifyPoC(poc.id)}
                                      disabled={verifyingPoc === poc.id}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                    >
                                      {verifyingPoc === poc.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          Verifying...
                                        </>
                                      ) : (
                                        <>
                                          <FlaskConical className="w-3 h-3" />
                                          Verify PoC
                                        </>
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  // Already verified - show Real/Poor PoC result
                                  <>
                                    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${
                                      poc.poc_type === 'real_poc'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                      {poc.poc_type === 'real_poc' ? '✓ Real PoC' : '✗ Poor PoC'}
                                    </span>
                                    <button
                                      onClick={() => setSandboxLogPoc(poc)}
                                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                      title="View Sandbox Log"
                                    >
                                      <Terminal className="w-3 h-3" />
                                      Log
                                    </button>
                                  </>
                                )}
                                {poc.is_downloadable && (
                                  <button
                                    onClick={() => api.downloadPoC(poc.id, poc.poc_name || `poc_${poc.id}.txt`)}
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    title="Download PoC"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No PoC generated</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handlePreview(report)}
                          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tpReports.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="font-medium mb-1">No true positive reports available</p>
                <p className="text-sm">No vulnerabilities detected in this project</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewReport && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-green-400" />
                  <h2 className="font-semibold text-white">True Positive Report Preview</h2>
                </div>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {/* Vulnerability Info */}
                {previewReport.vulnerability && (
                  <div className="bg-[#252525] border border-[#333333] rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-white mb-2">{previewReport.vulnerability.title}</h4>
                    {previewReport.vulnerability.cwe_id && (
                      <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                        {previewReport.vulnerability.cwe_id}
                      </span>
                    )}
                    {previewReport.vulnerability.file_path && (
                      <p className="text-sm font-mono text-gray-400 mt-2">
                        {previewReport.vulnerability.file_path}
                        {previewReport.vulnerability.line_number && `:${previewReport.vulnerability.line_number}`}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="bg-[#252525] border border-[#333333] rounded-lg p-6">
                  <h3 className="font-medium text-white mb-4">LLM Analysis Result</h3>
                  <div className="space-y-4 text-gray-400 text-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white mb-1">True Positive - Vulnerability Confirmed</p>
                        <p>{previewReport.details || 'This vulnerability has been confirmed by LLM analysis.'}</p>
                      </div>
                    </div>
                    
                    {previewReport.llm_confidence && (
                      <div className="bg-[#1a1a1a] border border-[#333333] rounded p-3">
                        <p className="text-xs text-gray-500 mb-1">Confidence Score:</p>
                        <p className="font-mono text-sm text-green-400">{previewReport.llm_confidence}</p>
                      </div>
                    )}
                    
                    {previewReport.summary && (
                      <div>
                        <p className="font-medium text-white mb-2">Summary:</p>
                        <p>{previewReport.summary}</p>
                      </div>
                    )}
                    
                    {previewReport.recommendations && (
                      <div>
                        <p className="font-medium text-white mb-2">Recommendations:</p>
                        <p>{previewReport.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sandbox Log Modal */}
        {sandboxLogPoc && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                <div className="flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-blue-400" />
                  <div>
                    <h2 className="font-semibold text-white">Sandbox Verification Log</h2>
                    <p className="text-xs text-gray-500">{sandboxLogPoc.poc_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSandboxLogPoc(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {/* Result Status */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    sandboxLogPoc.poc_type === 'real_poc'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {sandboxLogPoc.poc_type === 'real_poc' ? '✓ Real PoC - Exploit Successful' : '✗ Poor PoC - Exploit Failed'}
                  </span>
                </div>
                
                {/* Sandbox Output */}
                <div className="bg-[#0d0d0d] border border-[#333333] rounded-lg p-4 font-mono text-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#333333]">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-500 text-xs ml-2">Sandbox Terminal Output</span>
                  </div>
                  <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {sandboxLogPoc.sandbox_result || 'No sandbox output available'}
                  </pre>
                </div>
                
                {/* File Path */}
                <div className="mt-4 text-sm">
                  <span className="text-gray-500">PoC Path: </span>
                  <span className="text-gray-400 font-mono">{sandboxLogPoc.poc_path}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
