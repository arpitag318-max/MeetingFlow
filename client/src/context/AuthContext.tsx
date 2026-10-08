import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api, getSessionToken, setSessionToken, getModePreference, setModePreference } from '../api/client';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  isGoogleConnected: boolean;
  loginDemo: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  toggleMode: (demo: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(getModePreference()); // Real Mode is default (false)
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  const fetchUser = useCallback(async () => {
    // If Demo Mode is explicitly selected
    if (getModePreference()) {
      setIsDemoMode(true);
      setUser({
        id: 'demo-user-id',
        email: 'demo@meetingflow.io',
        name: 'Demo Evaluator',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsGoogleConnected(false);
      setIsLoading(false);
      return;
    }

    // REAL MODE
    setIsDemoMode(false);

    // 1. Check Supabase session first
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionToken(session.access_token);
        // Sync provider_token to backend if present
        if (session.provider_token) {
          try {
            await api.auth.syncGoogleToken(session.provider_token, session.provider_refresh_token || undefined);
          } catch (syncErr) {
            console.warn('Google token sync notice:', syncErr);
          }
        }
      }
    } catch {
      // Continue to API check
    }

    const currentToken = getSessionToken();
    if (!currentToken) {
      setUser(null);
      setIsGoogleConnected(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.auth.getMe();
      if (res.user) {
        setUser(res.user);
        setIsGoogleConnected(Boolean(res.isGoogleConnected));
      } else {
        setUser(null);
        setSessionToken(null);
        setIsGoogleConnected(false);
      }
    } catch {
      setUser(null);
      setSessionToken(null);
      setIsGoogleConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen to Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setSessionToken(session.access_token);
        setModePreference(false);
        setIsDemoMode(false);

        if (session.provider_token) {
          try {
            await api.auth.syncGoogleToken(session.provider_token, session.provider_refresh_token || undefined);
          } catch (syncErr) {
            console.warn('Google token sync notice on auth state change:', syncErr);
          }
        }

        try {
          const res = await api.auth.getMe();
          if (res.user) {
            setUser(res.user);
            setIsGoogleConnected(Boolean(res.isGoogleConnected));
            setIsLoading(false);
            return;
          }
        } catch {
          // Fallback to basic session info
        }

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatarUrl: session.user.user_metadata?.avatar_url,
          createdAt: session.user.created_at,
          updatedAt: new Date().toISOString()
        });
        setIsLoading(false);
      } else if (!getModePreference()) {
        fetchUser();
      }
    });

    fetchUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signInWithGoogle = async () => {
    // Try backend OAuth first so server receives full calendar/meet scopes and offline refresh token
    try {
      const res = await api.auth.getGoogleUrl(user?.id);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
    } catch {
      // Backend not configured, fall back to Supabase OAuth
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/meetings.space.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      setSessionToken(data.session.access_token);
      setModePreference(false);
      setIsDemoMode(false);
    }
    return {};
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      setSessionToken(data.session.access_token);
      setModePreference(false);
      setIsDemoMode(false);
    }
    return { message: 'Account created successfully!' };
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.loginDemo();
      setSessionToken(res.sessionToken);
      setModePreference(true);
      setIsDemoMode(true);
      setUser(res.user);
      setIsGoogleConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (demo: boolean) => {
    setModePreference(demo);
    setIsDemoMode(demo);
    if (demo) {
      loginDemo();
    } else {
      setSessionToken(null);
      setUser(null);
      fetchUser();
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setSessionToken(null);
    setModePreference(false);
    setUser(null);
    setIsGoogleConnected(false);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemoMode,
        isGoogleConnected,
        loginDemo,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        toggleMode,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

