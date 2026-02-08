import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useStore } from '../lib/store';
import { Play, Loader2, FileJson, CheckCircle, ChevronRight, AlertTriangle, Brain } from 'lucide-react';

export function ScanView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, getScanResultsByProject, updateScanResult, addReport } = useStore();
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const project = projects.find((p) => p.id === projectId);
  const scanResults = getScanResultsByProject(projectId!);

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <p className="text-gray-400">Project not found</p>
        </div>
      </div>
    );
  }

  const handleScan = async (scanId: string) => {
    setAnalyzing(scanId);
    updateScanResult(scanId, { status: 'scanning' });

    await new Promise(resolve => setTimeout(resolve, 2000));

    updateScanResult(scanId, { 
      status: 'completed',
      scannedAt: new Date(),
    });

    const scan = scanResults.find(s => s.id === scanId);
    if (scan) {
      // Create FP and TP reports for the vulnerability type
      addReport({
        projectId: project.id,
        fileName: `FP_${scan.vulnerabilityType.replace(/ /g, '_')}_report.html`,
        type: 'FP',
        reportPath: `C:\\\\tmp\\\\${project.name}\\\\FP\\\\report\\\\FP_${scan.vulnerabilityType.replace(/ /g, '_')}_report.html`,
      });

      addReport({
        projectId: project.id,
        fileName: `TP_${scan.vulnerabilityType.replace(/ /g, '_')}_report.html`,
        type: 'TP',
        reportPath: `C:\\\\tmp\\\\${project.name}\\\\TP\\\\report\\\\TP_${scan.vulnerabilityType.replace(/ /g, '_')}_report.html`,
      });
    }

    setAnalyzing(null);
  };

  const handleScanAll = async () => {
    const pendingScans = scanResults.filter(s => s.status === 'pending');
    for (const scan of pendingScans) {
      await handleScan(scan.id);
    }
  };

  const allCompleted = scanResults.every(s => s.status === 'completed');
  const hasPending = scanResults.some(s => s.status === 'pending');

  const vulnerabilityColors: Record<string, string> = {
    'SQL Injection': 'bg-red-500/10 text-red-400 border-red-500/30',
    'XSS': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    'Command Injection': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">Projects</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/project/${projectId}`} className="text-gray-400 hover:text-white transition-colors">{project.name}</Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-white">Scan Results</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">LLM Analysis</h1>
            <p className="text-gray-400 text-sm">Analyze JSON scan results using AI to identify FP/TP</p>
          </div>
          <div className="flex items-center gap-3">
            {allCompleted && (
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
                onClick={handleScanAll}
                disabled={!!analyzing}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Brain className="w-4 h-4" />
                Analyze All with LLM
              </button>
            )}
          </div>
        </div>

        {/* Info Banner */}
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

        {scanResults.length === 0 ? (
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
                {scanResults.map((scan) => (
                  <tr key={scan.id} className="hover:bg-[#252525] transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{scan.fileName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${vulnerabilityColors[scan.vulnerabilityType] || 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                        {scan.vulnerabilityType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {scan.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/30">
                          Pending
                        </span>
                      )}
                      {scan.status === 'scanning' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analyzing...
                        </span>
                      )}
                      {scan.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                          <CheckCircle className="w-3 h-3" />
                          Analyzed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono max-w-xs truncate">
                      {scan.resultPath}
                    </td>
                    <td className="px-6 py-4">
                      {scan.status === 'pending' && (
                        <button
                          onClick={() => handleScan(scan.id)}
                          disabled={!!analyzing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded text-sm text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 disabled:bg-gray-700/10 disabled:border-gray-600/30 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                          <Brain className="w-4 h-4" />
                          Analyze
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}