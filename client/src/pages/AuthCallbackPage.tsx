import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setSessionToken, setModePreference } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';

import { supabase } from '../lib/supabase';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { success, error } = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const sessionToken = searchParams.get('sessionToken') || searchParams.get('token');
    const authError = searchParams.get('error');

    const handleCallback = async () => {
      if (authError) {
        setErrorMsg(`Authentication error: ${authError}`);
        error('Authentication Failed', authError);
        setTimeout(() => navigate('/login'), 2500);
        return;
      }

      // 1. If backend Google OAuth provided sessionToken, prioritize it!
      if (sessionToken) {
        setSessionToken(sessionToken);
        setModePreference(false); // Enter Real Mode
        try {
          await refreshUser();
          success('Google Workspace Connected', 'Successfully signed in and synchronized Google Calendar!');
          navigate('/dashboard');
        } catch (err: any) {
          setErrorMsg(err.message);
          error('Authentication Failed', err.message);
          setTimeout(() => navigate('/login'), 3000);
        }
        return;
      }

      // 2. Check if Supabase session is established from URL hash/code
      try {
        const { data: { session }, error: supaErr } = await supabase.auth.getSession();
        if (session?.user && !supaErr) {
          // If provider_token is present from Supabase Google OAuth, sync to backend!
          if (session.provider_token) {
            try {
              await api.auth.syncGoogleToken(session.provider_token, session.provider_refresh_token || undefined);
            } catch (tokenSyncErr) {
              console.warn('Could not sync provider token to backend:', tokenSyncErr);
            }
          }

          setSessionToken(session.access_token);
          setModePreference(false); // Enter Real Mode
          await refreshUser();
          success('Connected to MeetingFlow', `Welcome back, ${session.user.user_metadata?.full_name || session.user.email}!`);
          navigate('/dashboard');
          return;
        }
      } catch (err: any) {
        console.warn('Supabase getSession notice in callback:', err);
      }

      if (code) {
        try {
          const res = await api.auth.handleGoogleCallback(code);
          setSessionToken(res.sessionToken);
          setModePreference(false); // Enter Real Mode
          await refreshUser();
          success('Google Workspace Connected', `Welcome back, ${res.user.name}!`);
          navigate('/dashboard');
          return;
        } catch (err: any) {
          setErrorMsg(err.message);
          error('Authentication Failed', err.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      navigate('/login');
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser, success, error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-surface rounded-2xl border border-border p-8 shadow-card max-w-sm w-full">
        {errorMsg ? (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-semantic-error/10 text-semantic-error flex items-center justify-center mx-auto">
              !
            </div>
            <h3 className="text-sm font-bold text-primary">Authentication Failed</h3>
            <p className="text-xs text-secondary leading-relaxed">{errorMsg}</p>
            <p className="text-[11px] text-secondary/60">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-primary">Connecting Google Workspace...</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Exchanging secure OAuth tokens and synchronizing calendar events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
