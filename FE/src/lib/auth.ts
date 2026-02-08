// Auth context for managing authentication state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

interface User {
  id: number;
  email: string;
  username: string;
  phone_number: string | null;
  llm_analysis_mode: string;
  gemini_api_key: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: {
    username?: string;
    phone_number?: string;
    llm_analysis_mode?: string;
    gemini_api_key?: string;
  }) => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        try {
          const response = await api.login(email, password);
          const token = response.access_token;
          
          // Set token in API service so subsequent requests work
          api.setToken(token);
          
          // Fetch user details
          const user = await api.getCurrentUser();
          
          set({ 
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              phone_number: user.phone_number,
              llm_analysis_mode: user.llm_analysis_mode,
              gemini_api_key: user.gemini_api_key,
            }, 
            token,
            isAuthenticated: true 
          });
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Login failed' 
          };
        }
      },
      logout: () => {
        api.clearToken();
        set({ user: null, token: null, isAuthenticated: false });
        // Clear persisted storage AFTER set() to prevent re-persist
        // Use setTimeout to ensure it runs after zustand persist completes
        setTimeout(() => {
          localStorage.removeItem('auth-storage');
        }, 0);
      },
      updateProfile: async (updates) => {
        try {
          const updatedUser = await api.updateProfile(updates);
          set((state) => ({
            user: state.user ? {
              ...state.user,
              username: updatedUser.username,
              phone_number: updatedUser.phone_number,
              llm_analysis_mode: updatedUser.llm_analysis_mode,
              gemini_api_key: updatedUser.gemini_api_key,
            } : null,
          }));
        } catch (error) {
          console.error('Failed to update profile:', error);
          throw error;
        }
      },
      fetchUser: async () => {
        try {
          const user = await api.getCurrentUser();
          set({
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              phone_number: user.phone_number,
              llm_analysis_mode: user.llm_analysis_mode,
              gemini_api_key: user.gemini_api_key,
            },
            isAuthenticated: true,
          });
        } catch (error) {
          // If fetch fails, clear auth state
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Initialize API with token from persisted storage
// Use onRehydrateStorage to sync token after zustand hydrates from localStorage
useAuth.persist.onFinishHydration((state) => {
  if (state?.token) {
    api.setToken(state.token);
  }
});

// Also try to set token immediately if already available
const initialState = useAuth.getState();
if (initialState.token) {
  api.setToken(initialState.token);
}
