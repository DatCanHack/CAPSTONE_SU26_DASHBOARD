import { ScanResult } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';

interface DashboardProps {
  scanHistory: ScanResult[];
}

export function Dashboard({ scanHistory }: DashboardProps) {
  const totalScans = scanHistory.length;
  const totalVulnerabilities = scanHistory.reduce((acc, scan) => acc + scan.vulnerabilities.length, 0);
  const avgVulnerabilitiesPerScan = totalScans > 0 ? (totalVulnerabilities / totalScans).toFixed(1) : 0;

  const severityCounts = scanHistory.reduce((acc, scan) => {
    scan.vulnerabilities.forEach(vuln => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Critical', value: severityCounts.critical || 0, color: '#dc2626' },
    { name: 'High', value: severityCounts.high || 0, color: '#ea580c' },
    { name: 'Medium', value: severityCounts.medium || 0, color: '#ca8a04' },
    { name: 'Low', value: severityCounts.low || 0, color: '#2563eb' },
  ].filter(item => item.value > 0);

  const recentScans = scanHistory.slice(0, 5).map(scan => ({
    url: new URL(scan.url).hostname,
    vulnerabilities: scan.vulnerabilities.length,
    critical: scan.vulnerabilities.filter(v => v.severity === 'critical').length,
    high: scan.vulnerabilities.filter(v => v.severity === 'high').length,
    medium: scan.vulnerabilities.filter(v => v.severity === 'medium').length,
    low: scan.vulnerabilities.filter(v => v.severity === 'low').length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Scans</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{totalScans}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">Total Vulnerabilities</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{totalVulnerabilities}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Avg. per Scan</span>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{avgVulnerabilitiesPerScan}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Scans</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recentScans}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="url" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" stackId="a" fill="#dc2626" />
              <Bar dataKey="high" stackId="a" fill="#ea580c" />
              <Bar dataKey="medium" stackId="a" fill="#ca8a04" />
              <Bar dataKey="low" stackId="a" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Vulnerability Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
