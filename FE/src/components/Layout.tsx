import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';
import { Shield, Home, User, LogOut, Search, FileText, ScanSearch, Settings, Folder, Users, Bell } from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarItems = [
    { icon: Home, path: '/home', tooltip: 'Home' },
    { icon: Folder, path: '/projects', tooltip: 'Projects' },
    { icon: Users, path: '/team', tooltip: 'Team' },
  ];

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/' || location.pathname === '/home';
    if (path === '/projects') return location.pathname === '/projects' || location.pathname.startsWith('/project');
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex">
      {/* Sidebar */}
      <div className="w-14 bg-[#1a1a1a] border-r border-[#333333] flex flex-col items-center py-4 fixed h-full z-50">
        {/* Logo */}
        <Link 
          to="/" 
          className="group mb-6 p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all relative"
          title="Super SAST"
        >
          <Shield className="w-5 h-5 text-white" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-[#252525] border border-[#333333] rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Super SAST</span>
          </div>
        </Link>

        {/* Navigation Icons */}
        <div className="flex-1 flex flex-col gap-2 w-full px-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.tooltip}
              to={item.path}
              className={`group relative p-2.5 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-[#252525] hover:text-white'
              }`}
              title={item.tooltip}
            >
              <item.icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#252525] border border-[#333333] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {item.tooltip}
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col gap-2 w-full px-2">
          <Link
            to="/notifications"
            className={`group relative p-2.5 rounded-lg transition-colors ${
              location.pathname === '/notifications'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-[#252525] hover:text-white'
            }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#252525] border border-[#333333] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Notifications
            </div>
          </Link>
          <Link
            to="/profile"
            className={`group relative p-2.5 rounded-lg transition-colors ${
              location.pathname === '/profile'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-[#252525] hover:text-white'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#252525] border border-[#333333] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Settings
            </div>
          </Link>
          <Link
            to="/profile"
            className="group relative p-1.5 rounded-lg hover:bg-[#252525] transition-colors"
            title={user?.username || user?.email}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-semibold">
              {(user?.username || user?.email)?.[0].toUpperCase()}
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#252525] border border-[#333333] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              {user?.username || user?.email}
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-14 flex flex-col">
        {/* Top Header */}
        <header className="bg-[#1a1a1a] border-b border-[#333333] sticky top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Super SAST
                  </h1>
                </div>
                <div className="h-4 w-px bg-[#333333]" />
                <span className="text-xs text-gray-500">Advanced Security Analysis</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-9 pr-4 py-1.5 bg-[#252525] border border-[#333333] rounded-md text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none w-64"
                  />
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-gray-300 hover:bg-[#252525] hover:text-white transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}