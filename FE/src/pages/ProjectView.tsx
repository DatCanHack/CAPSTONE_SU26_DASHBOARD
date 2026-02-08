import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { api } from "../lib/api";
import {
  Upload,
  FileCode,
  ArrowRight,
  ArrowLeft,
  FileText,
  ChevronRight,
  XCircle,
  CheckCircle,
  Fingerprint,
  History,
  Clock,
  RefreshCw,
  Loader2,
  Play,
} from "lucide-react";

type ScanType = "full" | "standard";
type UploadTab = "file" | "folder";

interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Scan {
  id: number;
  project_id: number;
  scan_type: string;
  status: string;
  total_issues: number | null;
  created_at: string;
  completed_at: string | null;
}

export function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<ScanType>("full");
  const [uploading, setUploading] = useState(false);
  const [uploadTab, setUploadTab] = useState<UploadTab>("file");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [error, setError] = useState("");
  const [showUploadSection, setShowUploadSection] = useState(false);

  useEffect(() => {
    loadProject();
    loadScans();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await api.getProject(Number(projectId));
      setProject(data);
    } catch (error) {
      console.error("Failed to load project:", error);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const loadScans = async () => {
    try {
      const data = await api.getScans(Number(projectId));
      setScans(data);
    } catch (error) {
      console.error("Failed to load scans:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-12 text-center">
          <p className="text-gray-400">Project not found</p>
          <Link
            to="/projects"
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setIsScanning(true);
    setUploading(true);
    setScanProgress(0);
    setError("");

    try {
      // Step 1: Upload source code (20%)
      setScanProgress(20);
      await api.uploadSourceCode(Number(projectId), selectedFile);

      // Step 2: Preparing (40%)
      setScanProgress(40);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Create scan (auto-starts SAST in background) (70%)
      setScanProgress(70);
      const scan = await api.createScan(Number(projectId), scanType);

      // Step 4: Complete (100%)
      setScanProgress(100);
      setScanCompleted(true);

      // Wait to show completion message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate to scan detail page
      navigate(`/project/${projectId}/scan/${scan.id}`);
    } catch (error) {
      console.error("Failed to create scan:", error);
      setError(error instanceof Error ? error.message : "Failed to start scan");
      setIsScanning(false);
      setUploading(false);
      setScanProgress(0);
      setScanCompleted(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Loading Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-[#0d0d0d]/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="max-w-md w-full px-6">
            {scanCompleted ? (
              // Success Message
              <div className="bg-[#1a1a1a] border border-green-500/50 rounded-lg p-8">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                </div>

                {/* Success Title */}
                <h2 className="text-xl font-semibold text-white text-center mb-2">
                  Scan Complete!
                </h2>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Your source code has been prepared and is ready for analysis
                </p>

                {/* Success Details */}
                <div className="bg-[#252525] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Scan Type:</span>
                    <span className="text-white font-medium">
                      {scanType === "full" ? "Full Scan" : "Quick Scan"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Tools:</span>
                    <span className="text-white font-medium">
                      {scanType === "full"
                        ? "3 tools (Snyk, Semgrep, CodeQL)"
                        : "2 tools (Snyk, Semgrep)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">File:</span>
                    <span className="text-white font-medium">
                      {selectedFile?.name || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Redirect Message */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                    Redirecting to Scan View...
                  </div>
                </div>
              </div>
            ) : (
              // Loading Progress
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-[#333333] border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-white text-center mb-2">
                  Preparing Vulnerability Scan
                </h2>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Please wait while we initialize the scanning process...
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>

                {/* Status Messages */}
                <div className="space-y-2 text-sm">
                  <div
                    className={`flex items-center gap-2 ${scanProgress >= 20 ? "text-green-400" : "text-gray-500"}`}
                  >
                    {scanProgress >= 20 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    )}
                    <span>Uploading source code files</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${scanProgress >= 40 ? "text-green-400" : "text-gray-500"}`}
                  >
                    {scanProgress >= 40 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    )}
                    <span>Preparing analysis environment</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${scanProgress >= 70 ? "text-green-400" : "text-gray-500"}`}
                  >
                    {scanProgress >= 70 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    )}
                    <span>Initializing security scanners</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${scanProgress >= 90 ? "text-green-400" : "text-gray-500"}`}
                  >
                    {scanProgress >= 90 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    )}
                    <span>Finalizing configuration</span>
                  </div>
                </div>

                {/* Scan Type Info */}
                <div className="mt-6 pt-6 border-t border-[#333333]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Scan Type:</span>
                    <span className="text-white font-medium">
                      {scanType === "full"
                        ? "Full Scan (Snyk, Semgrep, CodeQL)"
                        : "Quick Scan (Snyk, Semgrep)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-gray-500">File:</span>
                    <span className="text-white font-medium">
                      {selectedFile?.name || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <Link
              to="/projects"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Projects
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <span className="text-white">{project.name}</span>
          </div>

          {/* Case 1: Has scans - Show Scan History with Create New Scan button */}
          {scans.length > 0 && !showUploadSection && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <History className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">Scan History</h2>
                      <p className="text-sm text-gray-500">
                        Previous security scans
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate('/projects')}
                      className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Projects
                    </button>
                    <button
                      onClick={() => setShowUploadSection(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Create New Scan
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="bg-[#252525] border border-[#333333] rounded-lg p-4 hover:border-[#404040] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              scan.status === "completed" || scan.status === "sast_completed"
                                ? "bg-green-400"
                                : scan.status === "failed"
                                  ? "bg-red-400"
                                  : "bg-yellow-400"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {scan.scan_type === "full"
                                  ? "Full Scan"
                                  : "Standard Scan"}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  scan.status === "completed" || scan.status === "sast_completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : scan.status === "failed"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-yellow-500/20 text-yellow-400"
                                }`}
                              >
                                {scan.status === "sast_completed" ? "SAST Completed" : scan.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(scan.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Show different button based on scan status */}
                        {(scan.status === "completed" || scan.status === "llm_completed") ? (
                          <Link
                            to={`/project/${projectId}/report`}
                            className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1"
                          >
                            View Report
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        ) : scan.status === "sast_completed" ? (
                          <Link
                            to={`/project/${projectId}/scan/${scan.id}`}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                          >
                            <Play className="w-4 h-4" />
                            Continue Analysis
                          </Link>
                        ) : scan.status === "failed" || scan.status === "sast_failed" ? (
                          <span className="text-red-400 text-sm">Failed</span>
                        ) : (
                          <span className="text-yellow-400 text-sm flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Running...
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#333333]">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Total Issues
                          </div>
                          <div className="text-sm font-medium text-white">
                            {scan.total_issues || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Completed
                          </div>
                          <div className="text-sm font-medium text-white">
                            {scan.completed_at
                              ? new Date(scan.completed_at).toLocaleString()
                              : "In Progress"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Case 2: No scans OR showUploadSection is true - Show Upload Section */}
          {(scans.length === 0 || showUploadSection) && (
          <div className="max-w-5xl mx-auto">
            {/* Back button when coming from scan history */}
            {showUploadSection && scans.length > 0 && (
              <button
                onClick={() => setShowUploadSection(false)}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Scan History
              </button>
            )}
            {/* VirusTotal Style Upload */}
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#333333]">
                <Upload className="w-5 h-5 text-green-400" />
                <div>
                  <h2 className="font-semibold text-white">
                    Upload Source Code
                  </h2>
                  <p className="text-xs text-gray-500">
                    Scan source code files for security vulnerabilities
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#333333]">
                <button
                  onClick={() => setUploadTab("file")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
                    uploadTab === "file"
                      ? "text-blue-400 bg-[#252525]"
                      : "text-gray-400 hover:text-white hover:bg-[#1f1f1f]"
                  }`}
                >
                  FILE
                  {uploadTab === "file" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setUploadTab("folder")}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
                    uploadTab === "folder"
                      ? "text-blue-400 bg-[#252525]"
                      : "text-gray-400 hover:text-white hover:bg-[#1f1f1f]"
                  }`}
                >
                  FOLDER
                  {uploadTab === "folder" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              </div>

              {/* Upload Area */}
              <div className="p-12">
                {uploadTab === "file" ? (
                  <div className="text-center">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center mb-6">
                      <div className="relative">
                        <FileCode
                          className="w-24 h-24 text-gray-600"
                          strokeWidth={1}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Fingerprint className="w-12 h-12 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    {/* Choose File Button */}
                    <div className="mb-6">
                      <label className="inline-block">
                        <input
                          type="file"
                          accept=".java"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <span className="px-8 py-2.5 bg-transparent border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer text-sm font-medium inline-block">
                          Choose file
                        </span>
                      </label>
                      {selectedFile ? (
                        <p className="text-sm text-gray-400 mt-3">
                          {selectedFile.name} (
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-3">
                          No file selected (.JAVA)
                        </p>
                      )}
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-gray-500 max-w-2xl mx-auto">
                      By uploading files, you are agreeing to our{" "}
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                        Privacy Notice
                      </span>
                      . Please do not submit any personal information; we are
                      not responsible for the contents of your submission.
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center mb-6">
                      <div className="relative">
                        <FileCode
                          className="w-24 h-24 text-gray-600"
                          strokeWidth={1}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Fingerprint className="w-12 h-12 text-blue-400" />
                        </div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-3">
                        Folder upload not yet supported. Please zip your folder
                        and upload the ZIP file instead.
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 max-w-2xl mx-auto">
                      Upload entire source code folder for comprehensive
                      vulnerability scanning.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="mt-6 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  Selected File
                </h3>
                <div className="flex items-center gap-3 mb-4 bg-[#252525] rounded px-4 py-3">
                  <FileCode className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Scan Type Selection */}
                <div className="border-t border-[#333333] pt-6 mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select Scan Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-[#333333] hover:border-blue-500/50 hover:bg-[#252525] transition-all">
                      <input
                        type="radio"
                        name="scanType"
                        value="full"
                        checked={scanType === "full"}
                        onChange={(e) =>
                          setScanType(e.target.value as ScanType)
                        }
                        className="mt-0.5 text-blue-600 focus:ring-blue-500 bg-[#252525] border-[#404040]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white block mb-1">
                          Full Scan
                        </span>
                        <span className="text-xs text-gray-500">
                          Comprehensive analysis using Snyk, Semgrep, and CodeQL
                        </span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-[#333333] hover:border-blue-500/50 hover:bg-[#252525] transition-all">
                      <input
                        type="radio"
                        name="scanType"
                        value="standard"
                        checked={scanType === "standard"}
                        onChange={(e) =>
                          setScanType(e.target.value as ScanType)
                        }
                        className="mt-0.5 text-blue-600 focus:ring-blue-500 bg-[#252525] border-[#404040]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white block mb-1">
                          Standard Scan
                        </span>
                        <span className="text-xs text-gray-500">
                          Fast analysis using Snyk and Semgrep
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Start Scan Button */}
                  <button
                    onClick={handleScan}
                    disabled={!selectedFile || uploading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Start Vulnerability Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
