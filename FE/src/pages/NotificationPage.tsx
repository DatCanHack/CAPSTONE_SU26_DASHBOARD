import { useNavigate } from 'react-router';
import { Bell, Inbox, ArrowLeft } from 'lucide-react';

export function NotificationPage() {
  const navigate = useNavigate();
  
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Notifications</h1>
              <p className="text-sm text-gray-500">Stay updated with your security scans</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#252525] border border-[#333333] flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Notifications Yet</h2>
            <p className="text-gray-500 max-w-md">
              You're all caught up! Notifications about your scans, reports, and team activities will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
