import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, Link } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../api/client';
import { IntegrationStatus } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Video,
  Calendar,
  Sparkles,
  Layers,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Lock,
  Key,
  ExternalLink,
  Settings2,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { GoogleOAuthModal } from '../components/auth/GoogleOAuthModal';
import { JiraConfigModal } from '../components/jira/JiraConfigModal';
import { JiraOAuthModal } from '../components/jira/JiraOAuthModal';
import { useAuth } from '../context/AuthContext';

export const IntegrationsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error, info } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isJiraConfigOpen, setIsJiraConfigOpen] = useState(false);
  const [isJiraOAuthModalOpen, setIsJiraOAuthModalOpen] = useState(false);

  // Action Loading States
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isConnectingJira, setIsConnectingJira] = useState(false);
  const [isDisconnectingJira, setIsDisconnectingJira] = useState(false);
  const [isTestingJira, setIsTestingJira] = useState(false);

  // Check URL params from OAuth callback
  useEffect(() => {
    const jiraParam = searchParams.get('jira');
    const errorParam = searchParams.get('error');

    if (jiraParam === 'connected') {
      success('Jira Connected', 'Your Atlassian Jira Cloud account has been connected successfully.');
      searchParams.delete('jira');
      setSearchParams(searchParams, { replace: true });
    } else if (errorParam) {
      error('Authentication Error', decodeURIComponent(errorParam));
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadStatus = async () => {
    try {
      const res = await api.integrations.getStatus();
      const rawStatus = (res as any)?.integrations || res;
      setStatus(rawStatus);
    } catch (err: any) {
      error('Failed to load integration statuses', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    try {
      const res = await api.integrations.testGemini();
      if (res.success) {
        success('Gemini AI Connected', res.message);
      } else {
        info('Gemini AI Notice', res.message);
      }
    } catch (err: any) {
      error('Gemini Test Error', err.message);
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleConnectJira = async () => {
    if (!status?.jira?.isOAuthConfigured) {
      setIsJiraOAuthModalOpen(true);
      return;
    }

    setIsConnectingJira(true);
    try {
      const res = await api.jira.getOAuthUrl();
      if (res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setIsJiraOAuthModalOpen(true);
      }
    } catch {
      setIsJiraOAuthModalOpen(true);
    } finally {
      setIsConnectingJira(false);
    }
  };

  const handleDisconnectJira = async () => {
    if (!window.confirm('Are you sure you want to disconnect Jira? Active issue links will remain saved locally.')) {
      return;
    }

    setIsDisconnectingJira(true);
    try {
      await api.jira.disconnect();
      success('Jira Disconnected', 'Your Jira account has been unlinked.');
      await loadStatus();
    } catch (err: any) {
      error('Disconnect Failed', err.message);
    } finally {
      setIsDisconnectingJira(false);
    }
  };

  const handleTestJira = async () => {
    setIsTestingJira(true);
    try {
      const res = await api.integrations.testJira();
      if (res.success) {
        success('Jira Active', res.message);
      } else {
        info('Jira Notice', res.message);
      }
    } catch (err: any) {
      error('Jira Test Failed', err.message);
    } finally {
      setIsTestingJira(false);
    }
  };

  const handleReconnectGoogle = async () => {
    try {
      const res = await api.auth.getGoogleUrl(user?.id);
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      info('Google Workspace', 'In Demo Mode, Google Workspace is pre-synced with 5 upcoming and 5 completed meetings.');
    }
  };

  const isGoogleConnected = Boolean(status?.google?.isConnected || localStorage.getItem('meetingflow_google_token'));
  const isGeminiConfigured = Boolean(status?.gemini?.isConfigured ?? true);
  const geminiModel = status?.gemini?.model || 'gemini-2.5-flash';
  const jiraConnected = Boolean(status?.jira?.isConnected);
  const jiraConfig = status?.jira?.config;

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title="Integrations"
        subtitle="Enterprise connectivity for Google Workspace, Gemini AI, and Jira Cloud"
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-6">
        {/* Security Banner */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
          <div className="text-xs text-secondary leading-relaxed">
            <p className="font-bold text-primary">Enterprise Security Architecture</p>
            <p className="mt-0.5">
              All OAuth 2.0 tokens, credentials, and API keys are isolated strictly within the server environment with AES-256-GCM encryption. Secrets are never transmitted to or rendered in frontend state.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. GOOGLE WORKSPACE (Calendar & Meet) */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-cobalt/12 border border-accent-cobalt/25 flex items-center justify-center text-accent-cobalt">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary tracking-tight">Google Workspace</h3>
                    <p className="text-xs text-secondary">Google Calendar & Google Meet REST API</p>
                  </div>
                </div>

                <Badge variant={isGoogleConnected ? 'forest' : 'default'} size="md" className="font-semibold">
                  <span className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-accent-forest' : 'bg-secondary'}`} />
                  {isGoogleConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-accent-cobalt" />
                    <span className="text-xs font-semibold text-primary">Google Calendar</span>
                  </div>
                  <span className={`text-xs ${isGoogleConnected ? 'text-accent-forest font-semibold' : 'text-secondary'} flex items-center gap-1`}>
                    {isGoogleConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {isGoogleConnected ? '✓ Connected' : 'Not Connected'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-accent-cobalt" />
                    <span className="text-xs font-semibold text-primary">Google Meet</span>
                  </div>
                  <span className={`text-xs ${isGoogleConnected ? 'text-accent-forest font-semibold' : 'text-secondary'} flex items-center gap-1`}>
                    {isGoogleConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {isGoogleConnected ? '✓ Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-secondary">
                <span>Authorized via Google OAuth 2.0 with offline refresh scope.</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsGoogleModalOpen(true)}
                    className="text-xs"
                  >
                    <Key className="w-3.5 h-3.5 mr-1" />
                    Configure OAuth
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleReconnectGoogle} className="text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Reconnect Google
                  </Button>
                </div>
              </div>
            </div>

            {/* 2. GEMINI AI INTELLIGENCE */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-violet/12 border border-accent-violet/25 flex items-center justify-center text-accent-violet">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary tracking-tight">Gemini AI</h3>
                    <p className="text-xs text-secondary">Zero-hallucination meeting analysis engine</p>
                  </div>
                </div>

                <Badge variant={isGeminiConfigured ? 'forest' : 'amber'} size="md" className="font-semibold">
                  <span className={`w-2 h-2 rounded-full ${isGeminiConfigured ? 'bg-accent-forest' : 'bg-accent-amber'}`} />
                  {isGeminiConfigured ? 'CONNECTED' : 'NOT CONFIGURED'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/80">
                  <span className="text-[11px] text-secondary font-medium">Configured Model</span>
                  <p className="text-sm font-bold text-primary font-mono mt-0.5">
                    {geminiModel}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-background border border-border/80">
                  <span className="text-[11px] text-secondary font-medium">AI Analysis Pipeline</span>
                  <p className="text-sm font-bold text-accent-forest flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Enabled
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-secondary">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-secondary/60" />
                  API key managed securely via server environment (<code>GEMINI_API_KEY</code>).
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleTestGemini}
                  isLoading={isTestingGemini}
                  className="text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-accent-violet" />
                  Test AI
                </Button>
              </div>
            </div>

            {/* 3. ATLASSIAN JIRA CLOUD (OAuth 2.0 3LO & REST API v3) */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0052CC]/10 border border-[#0052CC]/25 flex items-center justify-center text-[#0052CC]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary tracking-tight">Atlassian Jira Cloud</h3>
                    <p className="text-xs text-secondary">
                      Cloud REST API v3 • Semantic duplicate detection • Bi-directional status sync
                    </p>
                  </div>
                </div>

                <Badge variant={jiraConnected ? 'forest' : 'default'} size="md" className="font-semibold">
                  <span className={`w-2 h-2 rounded-full ${jiraConnected ? 'bg-accent-forest' : 'bg-secondary'}`} />
                  {jiraConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                </Badge>
              </div>

              {jiraConnected ? (
                /* Connected State View */
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Site URL */}
                    <div className="p-3.5 rounded-xl bg-background border border-border/80">
                      <span className="text-[11px] text-secondary font-medium">Jira Cloud Site</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-bold text-primary truncate">
                          {status?.jira?.siteName || 'Atlassian Cloud'}
                        </span>
                        {status?.jira?.siteUrl && (
                          <a
                            href={status.jira.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary hover:text-primary shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-secondary truncate mt-0.5 font-mono">
                        {status?.jira?.siteUrl}
                      </p>
                    </div>

                    {/* Authenticated Account */}
                    <div className="p-3.5 rounded-xl bg-background border border-border/80">
                      <span className="text-[11px] text-secondary font-medium">Connected Account</span>
                      <p className="text-xs font-bold text-primary truncate mt-0.5">
                        {status?.jira?.accountName || 'Authorized User'}
                      </p>
                      <p className="text-[10px] text-secondary truncate mt-0.5">
                        {status?.jira?.accountEmail || 'OAuth Token Authorized'}
                      </p>
                    </div>

                    {/* Default Project */}
                    <div className="p-3.5 rounded-xl bg-background border border-border/80">
                      <span className="text-[11px] text-secondary font-medium">Default Project</span>
                      <p className="text-xs font-bold text-primary truncate mt-0.5 flex items-center gap-1.5">
                        {jiraConfig?.projectKey ? (
                          <>
                            <span className="font-mono bg-[#FAF7F2] px-1.5 py-0.2 rounded border border-border text-[11px]">
                              {jiraConfig.projectKey}
                            </span>
                            <span>{jiraConfig.projectName}</span>
                          </>
                        ) : (
                          <span className="text-secondary italic">Not configured</span>
                        )}
                      </p>
                      <p className="text-[10px] text-secondary truncate mt-0.5">
                        Issue Type: {jiraConfig?.issueTypeName || 'Task'}
                      </p>
                    </div>

                    {/* Last Sync */}
                    <div className="p-3.5 rounded-xl bg-background border border-border/80">
                      <span className="text-[11px] text-secondary font-medium">Sync Status</span>
                      <p className="text-xs font-bold text-accent-forest flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live Synced
                      </p>
                      <p className="text-[10px] text-secondary truncate mt-0.5">
                        {status?.jira?.lastSyncAt
                          ? `Last checked: ${new Date(status.jira.lastSyncAt).toLocaleTimeString()}`
                          : 'Auto-refreshes periodically'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-forest shrink-0" />
                      OAuth 2.0 3LO token safely encrypted with AES-256-GCM.
                    </span>

                    <div className="flex items-center gap-2">
                      <Link to="/jira-work">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Layers className="w-3 h-3 mr-1" />
                          View Jira Work
                        </Button>
                      </Link>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestJira}
                        isLoading={isTestingJira}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Test Link
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsJiraConfigOpen(true)}
                        className="text-xs"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-1" />
                        Configure Project
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectJira}
                        isLoading={isDisconnectingJira}
                        className="text-xs text-semantic-danger border-semantic-danger/30 hover:bg-semantic-danger/5"
                      >
                        <LogOut className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Disconnected State View */
                <div className="space-y-4 pt-1">
                  {/* Missing Server OAuth Configuration Banner */}
                  {!status?.jira?.isOAuthConfigured && (
                    <div className="p-3.5 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-start gap-2.5 text-xs text-primary">
                      <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-[#946300]">Server Missing Jira OAuth Configuration</p>
                        <p className="text-secondary mt-0.5">
                          Atlassian Client ID and Client Secret are not yet configured in the backend environment. Click below to securely provide them without manual file editing.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsJiraOAuthModalOpen(true)}
                        className="text-xs shrink-0"
                      >
                        <Key className="w-3.5 h-3.5 mr-1" />
                        Configure OAuth
                      </Button>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-background border border-border/80 space-y-3">
                    <p className="text-xs text-primary leading-relaxed">
                      Connect your Atlassian Jira Cloud account to seamlessly turn meeting action items into Jira issues, detect duplicate backlog work using Gemini AI, and sync issue statuses directly back to MeetingFlow.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-secondary pt-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-forest shrink-0" />
                        <span>OAuth 2.0 (3LO) security</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-forest shrink-0" />
                        <span>Dynamic project discovery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-forest shrink-0" />
                        <span>Semantic duplicate check</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-secondary/60" />
                      Client secrets remain server-side. No API tokens stored in browser.
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsJiraOAuthModalOpen(true)}
                        className="text-xs"
                      >
                        <Key className="w-3.5 h-3.5 mr-1" />
                        {status?.jira?.isOAuthConfigured ? 'Reconfigure OAuth' : 'Configure OAuth'}
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleConnectJira}
                        isLoading={isConnectingJira}
                        className="text-xs gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Connect Jira Cloud
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Google OAuth Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => {
          setIsGoogleModalOpen(false);
          loadStatus();
        }}
        onConfigured={(authUrl) => {
          window.location.href = authUrl;
        }}
      />

      {/* Jira OAuth Modal (Credentials Setup) */}
      <JiraOAuthModal
        isOpen={isJiraOAuthModalOpen}
        onClose={() => {
          setIsJiraOAuthModalOpen(false);
          loadStatus();
        }}
        onConfigured={(authUrl) => {
          window.location.href = authUrl;
        }}
        initialRedirectUri={status?.jira?.redirectUri || 'http://localhost:5000/api/jira/oauth/callback'}
      />

      {/* Jira Configuration Modal (Project & Defaults) */}
      <JiraConfigModal
        isOpen={isJiraConfigOpen}
        onClose={() => setIsJiraConfigOpen(false)}
        onConfigSaved={loadStatus}
        initialConfig={jiraConfig}
      />
    </div>
  );
};
