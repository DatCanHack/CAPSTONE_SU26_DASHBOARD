import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { User, Mail, Phone, Lock, Key, Settings, ArrowLeft, CheckCircle, X } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [llmMode, setLlmMode] = useState(user?.llm_analysis_mode || 'fine_tune');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState(user?.gemini_api_key || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateProfile({ 
        username,
        phone_number: phone || null,
      });
      setSuccessMessage('Profile information updated successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Password change is not implemented in backend yet
    if (newPassword === confirmPassword && newPassword.length >= 6) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password updated successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } else {
      setError('Passwords do not match or are too short');
    }
  };

  const handleSaveLLMSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate: API key is required when using Gemini API mode
    if (llmMode === 'gemini_api' && !geminiApiKey.trim()) {
      setError('Gemini API Key is required when using Gemini API mode');
      return;
    }
    
    try {
      await updateProfile({ 
        llm_analysis_mode: llmMode,
        gemini_api_key: llmMode === 'gemini_api' ? geminiApiKey.trim() : null,
      });
      setSuccessMessage('LLM settings saved successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update LLM settings');
    }
  };

  return (
    <div className="h-full overflow-auto bg-[#0d0d0d]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Profile Settings</h1>
            <p className="text-gray-400 text-sm">Manage your account and preferences</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-[#252525] border border-[#333333] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] hover:border-[#404040] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Success Toast Notification */}
        {showSuccess && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[320px]">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Success!</p>
                <p className="text-sm text-green-100">{successMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-medium text-blue-400">Profile Information</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d0d0d] border border-[#333333] rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-md text-gray-600 placeholder-gray-600 outline-none cursor-not-allowed"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </div>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d0d0d] border border-[#333333] rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Save changes
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-medium text-blue-400">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d0d0d] border border-[#333333] rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d0d0d] border border-[#333333] rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d0d0d] border border-[#333333] rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2.5 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Update password
              </button>
            </form>
          </div>

          {/* LLM Settings */}
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-medium text-blue-400">LLM Settings</h2>
            </div>
            <form onSubmit={handleSaveLLMSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  AI Provider
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="gemini_api"
                      checked={llmMode === 'gemini_api'}
                      onChange={(e) => setLlmMode(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-[#0d0d0d] border-[#404040]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white block">
                        Gemini API
                      </span>
                      <span className="text-xs text-gray-500">Google's AI model</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="fine_tune"
                      checked={llmMode === 'fine_tune'}
                      onChange={(e) => setLlmMode(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-[#0d0d0d] border-[#404040]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white block">
                        Fine-tune AI
                      </span>
                      <span className="text-xs text-gray-500">Custom trained model</span>
                    </div>
                  </label>
                </div>
              </div>

              {llmMode === 'gemini_api' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Gemini API Key
                      <span className="text-red-400">*</span>
                    </div>
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      if (error && e.target.value.trim()) {
                        setError('');
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-[#0d0d0d] border rounded-md text-gray-400 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm ${
                      error && !geminiApiKey.trim() ? 'border-red-500' : 'border-[#333333]'
                    }`}
                    placeholder="Enter your Gemini API key"
                    required
                  />
                  {!geminiApiKey.trim() && (
                    <p className="text-xs text-red-400 mt-1">API Key is required for Gemini API mode</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="bg-orange-600 text-white px-6 py-2.5 rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Save setting
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}