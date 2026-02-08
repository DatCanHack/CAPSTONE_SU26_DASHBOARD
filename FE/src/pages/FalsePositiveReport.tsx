import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { XCircle, Eye, FileText, ChevronRight, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

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
  status: string;
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

export function FalsePositiveReport() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [fpReports, setFpReports] = useState<Report[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewReport, setPreviewReport] = useState<ReportPreview | null>(null);

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
        
        // Filter only FP reports
        const fpOnly = reportsData.filter(r => r.report_type === 'false_positive');
        setFpReports(fpOnly);
        setVulnerabilities(vulnsData);
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
          <span className="text-white">False Positives</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-8 h-8 text-red-400" />
              <h1 className="text-2xl font-semibold text-white">False Positive Reports</h1>
            </div>
            <p className="text-gray-400 text-sm">Review and manage false positive detections</p>
          </div>
          <button
            onClick={() => navigate(`/project/${projectId}/report`)}
            className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>
        </div>

        {/* False Positive Reports Table */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
          <div className="bg-[#252525] border-b border-[#333333] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                All False Positives ({fpReports.length})
              </h2>
              <span className="text-sm text-gray-400">
                Path: C:\tmp\{project.name}\FP\
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#252525] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Report Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {fpReports.map((report) => {
                  const vuln = vulnerabilities.find(v => v.id === report.vulnerability_id);
                  return (
                    <tr key={report.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-6 py-4 text-sm text-white">
                        {vuln?.title || `Report #${report.id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(report.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono max-w-xs truncate">
                        {report.report_path || 'N/A'}
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
            {fpReports.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="font-medium mb-1">No false positive reports available</p>
                <p className="text-sm">All detected issues are true positives</p>
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
                  <FileText className="w-6 h-6 text-red-400" />
                  <h2 className="font-semibold text-white">False Positive Report Preview</h2>
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
                    {previewReport.vulnerability.file_path && (
                      <p className="text-sm font-mono text-gray-400">
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
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white mb-1">False Positive Detection</p>
                        <p>{previewReport.details || 'This issue was flagged by the security scanner but has been verified as a false positive.'}</p>
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
      </div>
    </div>
  );
}