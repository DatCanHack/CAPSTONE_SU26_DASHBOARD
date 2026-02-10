import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { Shield, Mail, Lock, AlertCircle } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] w-full max-w-md p-8">
        {/* Brand Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <Shield className="w-12 h-12 text-blue-500" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Super SAST
            </h1>
            <p className="text-xs text-gray-400 tracking-wide">
              Power Automated Security Testing System
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">Welcome back</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Sign in to your account to continue
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 bg-[#252525] border border-[#333333] rounded-lg p-4">
          <p className="text-xs text-gray-500 text-center mb-2">
            Default Account:
          </p>
          <div className="space-y-1">
            <p className="text-sm text-gray-300 text-center font-mono">
              Email: <span className="text-blue-400">fptno1@fpt.edu.vn</span>
            </p>
            <p className="text-sm text-gray-300 text-center font-mono">
              Password: <span className="text-blue-400">fpt123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
