import { ScanResult } from '../App';
import { VulnerabilityCard } from './VulnerabilityCard';
import { AlertTriangle, CheckCircle, Clock, Globe } from 'lucide-react';

interface ScanResultsProps {
  result: ScanResult;
}

export function ScanResults({ result }: ScanResultsProps) {
  const criticalCount = result.vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = result.vulnerabilities.filter(v => v.severity === 'high').length;
  const mediumCount = result.vulnerabilities.filter(v => v.severity === 'medium').length;
  const lowCount = result.vulnerabilities.filter(v => v.severity === 'low').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Scan Results</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {result.url}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {result.scanDuration}s
              </div>
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {result.timestamp.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total Checks</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{result.totalChecks}</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">Critical</span>
            </div>
            <div className="text-2xl font-semibold text-red-900">{criticalCount}</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">High</span>
            </div>
            <div className="text-2xl font-semibold text-orange-900">{highCount}</div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-600">Medium</span>
            </div>
            <div className="text-2xl font-semibold text-yellow-900">{mediumCount}</div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600">Low</span>
            </div>
            <div className="text-2xl font-semibold text-blue-900">{lowCount}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Vulnerabilities Detected</h3>
        {result.vulnerabilities.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-green-900 font-medium">No vulnerabilities detected</p>
            <p className="text-sm text-green-700">Your website passed all security checks</p>
          </div>
        ) : (
          result.vulnerabilities.map(vulnerability => (
            <VulnerabilityCard key={vulnerability.id} vulnerability={vulnerability} />
          ))
        )}
      </div>
    </div>
  );
}
