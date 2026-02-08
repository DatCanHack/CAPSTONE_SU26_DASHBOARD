import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface ScanFormProps {
  onScan: (url: string) => void;
  scanning: boolean;
}

export function ScanForm({ onScan, scanning }: ScanFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && !scanning) {
      onScan(url);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Target URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={scanning}
            />
            <button
              type="submit"
              disabled={scanning || !url}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>
        
        {scanning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-900">Scanning in progress...</p>
                <p className="text-sm text-blue-700">Testing for common vulnerabilities and security issues</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
