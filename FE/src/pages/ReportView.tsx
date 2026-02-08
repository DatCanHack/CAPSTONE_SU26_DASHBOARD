import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FileText, CheckCircle, XCircle, ChevronRight, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

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
  created_at: string;
}

interface Vulnerability {
  id: number;
  title: string;
  status: string;
}

export function ReportView() {
  const { projectId, scanId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId, scanId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectData = await api.getProject(Number(projectId));
      setProject(projectData);

      // Get scan ID from URL or find latest scan
      let targetScanId = scanId ? Number(scanId) : null;
      if (!targetScanId) {
        const scans = await api.getScans(Number(projectId));
        const completedScan = scans.find(s => s.status === 'completed' || s.status === 'sast_completed');
        if (completedScan) {
          targetScanId = completedScan.id;
        }
      }

      if (targetScanId) {
        const [reportsData, vulnsData] = await Promise.all([
          api.getReports(targetScanId),
          api.getVulnerabilities(targetScanId)
        ]);
        setReports(reportsData);
        setVulnerabilities(vulnsData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get vulnerability types that have been analyzed
  const completedVulnTypes = [...new Set(
    vulnerabilities
      .filter(v => v.status === 'true_positive' || v.status === 'false_positive')
      .map(v => {
        if (v.title.includes('SQL Injection')) return 'SQL Injection';
        if (v.title.includes('XSS')) return 'XSS';
        if (v.title.includes('Command Injection')) return 'Command Injection';
        return null;
      })
      .filter(Boolean)
  )] as string[];

  const fpReports = reports.filter(r => r.report_type === 'false_positive');
  const tpReports = reports.filter(r => r.report_type === 'true_positive');

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

  const totalReports = reports.length;
  const fpPercentage = totalReports > 0 ? ((fpReports.length / totalReports) * 100).toFixed(1) : 0;
  const tpPercentage = totalReports > 0 ? ((tpReports.length / totalReports) * 100).toFixed(1) : 0;

  const chartData = [
    { name: 'False Positive', value: fpReports.length, color: '#ef4444' },
    { name: 'True Positive', value: tpReports.length, color: '#22c55e' },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">Projects</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/project/${projectId}`} className="text-gray-400 hover:text-white transition-colors">{project.name}</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-white">Reports</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Analysis Reports</h1>
            <p className="text-gray-400 text-sm">Review vulnerabilities and false positives</p>
          </div>
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </button>
        </div>

        {/* Scanned Vulnerability Types Info */}
        {completedVulnTypes.length > 0 && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium mb-1">Scanned Vulnerability Types</p>
                <p className="text-sm text-gray-400 mb-2">
                  Reports are available for the following vulnerability types:
                </p>
                <div className="flex flex-wrap gap-2">
                  {completedVulnTypes.map((type) => {
                    const colors: Record<string, string> = {
                      'SQL Injection': 'bg-red-500/20 text-red-300 border-red-500/40',
                      'XSS': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                      'Command Injection': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                    };
                    return (
                      <span
                        key={type}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[type]}`}
                      >
                        {type}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Report Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333333', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <Link 
                to={`/project/${projectId}/report/fp`}
                className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="font-medium text-white">False Positives</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{fpReports.length}</div>
                    <div className="text-sm text-gray-400">{fpPercentage}%</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors" />
                </div>
              </Link>
              <Link 
                to={`/project/${projectId}/report/tp`}
                className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="font-medium text-white">True Positives</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{tpReports.length}</div>
                    <div className="text-sm text-gray-400">{tpPercentage}%</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">Select a Report Type</p>
              <p className="text-gray-400 text-sm">Click on False Positives or True Positives above to view detailed reports and manage PoC files.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}