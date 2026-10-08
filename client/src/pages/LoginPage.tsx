import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight, Shield, Layers, Video } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, isLoading, loginDemo, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Auto-redirect the moment a logged-in user or active session is detected
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isLoading, navigate]);

  const handleDemoLogin = async () => {
    try {
      await loginDemo();
    } finally {
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setEmailMsg(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Supabase redirects the browser to Google
    } catch (err: any) {
      setIsGoogleLoading(false);
      setEmailMsg({ type: 'error', text: err.message || 'Failed to initiate Google sign-in.' });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!email || !password) {
      setEmailMsg({ type: 'error', text: 'Please fill in both email and password.' });
      return;
    }
    if (password.length < 6) {
      setEmailMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setEmailLoading(true);
    try {
      if (authMode === 'signin') {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setEmailMsg({ type: 'error', text: res.error });
        } else {
          navigate('/dashboard');
        }
      } else {
        const res = await signUpWithEmail(email, password);
        if (res.error) {
          setEmailMsg({ type: 'error', text: res.error });
        } else {
          setEmailMsg({
            type: 'success',
            text: res.message || 'Account created! Check your email or sign in below.'
          });
          setAuthMode('signin');
        }
      }
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Authentication error.' });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-6 sm:p-12">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EAE4DC] flex items-center justify-center shadow-sm overflow-hidden p-1">
            <img src="/meetingflow-icon-square.png" alt="MeetingFlow" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl text-[#181D1A] tracking-tight">
            Meeting<span className="text-[#E85555]">Flow</span>
          </span>
        </div>

        <button
          onClick={handleDemoLogin}
          className="text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
        >
          Explore Demo Mode
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Hero Card */}
      <div className="max-w-xl mx-auto w-full my-8 bg-surface rounded-3xl border border-border p-8 sm:p-12 shadow-card text-center">
        {/* Subtle AI Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-forest/15 border border-accent-forest/30 text-xs font-semibold text-[#236346] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-accent-forest" />
          <span>AI Meeting → Action Management</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-4">
          Turn every meeting into organized work.
        </h1>

        <p className="text-sm text-secondary leading-relaxed max-w-md mx-auto mb-6">
          Automatically extract factual summaries, timestamped decisions, and user-assigned tasks from Google Meet into Jira and Google Calendar with Gemini.
        </p>

        {/* Status Messages */}
        {emailMsg && (
          <div
            className={`max-w-xs mx-auto mb-4 p-3 rounded-xl text-xs text-left ${
              emailMsg.type === 'error'
                ? 'bg-semantic-error/10 text-semantic-error border border-semantic-error/20'
                : 'bg-semantic-success/10 text-semantic-success border border-semantic-success/20'
            }`}
          >
            {emailMsg.text}
          </div>
        )}

        {/* CTA Buttons & Form */}
        <div className="space-y-4 max-w-xs mx-auto">
          {/* Supabase Google Auth Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            variant="secondary"
            size="lg"
            className="w-full gap-3 bg-white hover:bg-background border-border text-primary font-semibold shadow-sm"
          >
            {isGoogleLoading ? (
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-border w-full" />
            <span className="bg-surface px-2 text-[11px] text-secondary uppercase font-semibold absolute">
              or
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-2.5 text-left">
            <div>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={emailLoading}
              variant="primary"
              size="md"
              className="w-full text-xs font-semibold justify-center"
            >
              {emailLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In with Email' : 'Create Account'}
            </Button>

            <div className="flex justify-between items-center text-[11px] text-secondary pt-1 px-1">
              <span>{authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}</span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setEmailMsg(null);
                }}
                className="font-semibold text-primary hover:underline"
              >
                {authMode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Demo Button */}
          <div className="pt-2 border-t border-border/50">
            <Button
              onClick={handleDemoLogin}
              variant="ghost"
              size="md"
              className="w-full text-xs text-secondary hover:text-primary justify-center font-medium"
            >
              Explore Demo Mode without Login
            </Button>
          </div>
        </div>

        {/* Feature Icons Grid */}
        <div className="grid grid-cols-3 gap-3 mt-10 pt-8 border-t border-border/60 text-left">
          <div className="p-3 rounded-xl bg-background border border-border/70">
            <Video className="w-4 h-4 text-[#3B728C] mb-1.5" />
            <p className="text-xs font-bold text-primary">Google Meet</p>
            <p className="text-[10px] text-secondary mt-0.5">Automated transcript sync</p>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border/70">
            <Shield className="w-4 h-4 text-semantic-success mb-1.5" />
            <p className="text-xs font-bold text-primary">Zero Hallucination</p>
            <p className="text-[10px] text-secondary mt-0.5">Strict factual extraction</p>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border/70">
            <Layers className="w-4 h-4 text-[#755C91] mb-1.5" />
            <p className="text-xs font-bold text-primary">Jira & Calendar</p>
            <p className="text-[10px] text-secondary mt-0.5">One-click issue export</p>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-secondary/60">
        <p>© 2026 MeetingFlow Inc. Premium Editorial Productivity SaaS.</p>
      </div>
    </div>
  );
};
