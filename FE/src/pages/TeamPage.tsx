import { Users, Wrench, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export function TeamPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0d0d0d]">
      <div className="max-w-md mx-auto px-6 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center">
              <Users className="w-12 h-12 text-blue-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Team Management
        </h1>
        
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 mb-6">
          <Clock className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-orange-400 font-medium">Under Development</span>
        </div>

        {/* Description */}
        <p className="text-gray-400 mb-4">
          We're working hard to bring you an amazing team collaboration experience.
        </p>
        
        <p className="text-sm text-gray-500 mb-8">
          Soon you'll be able to invite team members, manage roles, and collaborate on security testing projects together.
        </p>

        {/* Features Coming */}
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 mb-8 text-left">
          <h3 className="text-sm font-semibold text-white mb-3">Coming Soon:</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <span>Invite and manage team members</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <span>Role-based access control</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <span>Collaborative project workspace</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <span>Activity tracking and notifications</span>
            </li>
          </ul>
        </div>

        {/* Back Button */}
        <Link
          to="/home"
          className="inline-flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-6 py-2.5 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
