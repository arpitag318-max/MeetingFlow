import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import {
  User,
  Bell,
  Sparkles,
  Layers,
  Key,
  LogOut,
  Settings2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { JiraOAuthModal } from '../components/jira/JiraOAuthModal';
import { JiraConfigModal } from '../components/jira/JiraConfigModal';

export const SettingsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemoMode } = useAuth();
  const { success, error } = useToast();

  const [reminderOffset, setReminderOffset] = useState('10');
  const [autoProcess, setAutoProcess] = useState(true);

  // Jira State
  const [jiraStatus, setJiraStatus] = useState<any | null>(null);
  const [isConnectingJira, setIsConnectingJira] = useState(false);
  const [isDisconnectingJira, setIsDisconnectingJira] = useState(false);
  const [isJiraOAuthModalOpen, setIsJiraOAuthModalOpen] = useState(false);
  const [isJiraConfigModalOpen, setIsJiraConfigModalOpen] = useState(false);

  const loadJiraStatus = async () => {
    try {
      const res = await api.jira.getStatus();
      setJiraStatus(res);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadJiraStatus();
  }, []);

  // Check URL params from OAuth callback
  useEffect(() => {
    const jiraParam = searchParams.get('jira');
    const errorParam = searchParams.get('error');

    if (jiraParam === 'connected') {
      success('Jira Connected', 'Your Atlassian Jira Cloud account has been connected successfully.');
      searchParams.delete('jira');
      setSearchParams(searchParams, { replace: true });
      loadJiraStatus();
    } else if (errorParam) {
      error('Authentication Error', decodeURIComponent(errorParam));
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleConnectJira = async () => {
    if (!jiraStatus?.isOAuthConfigured) {
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
    if (!window.confirm('Disconnect your Atlassian Jira Cloud account?')) return;
    setIsDisconnectingJira(true);
    try {
      await api.jira.disconnect();
      success('Jira Disconnected', 'Your Jira account has been unlinked.');
      await loadJiraStatus();
    } catch (err: any) {
      error('Disconnect Failed', err.message);
    } finally {
      setIsDisconnectingJira(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    success('Settings Saved', 'Your workspace preferences were updated.');
  };

  const jiraConnected = Boolean(jiraStatus?.isConnected);
  const jiraConfig = jiraStatus?.config;

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title="Settings"
        subtitle="Manage your profile, Atlassian Jira Cloud, and workspace defaults"
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-6">
        {/* User Profile Card */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-primary tracking-tight">USER PROFILE</h3>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name || 'Rahul Sharma'}
              className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-sm"
            />
            <div>
              <h2 className="text-base font-bold text-primary">{user?.name || 'Rahul Sharma'}</h2>
              <p className="text-xs text-secondary">{user?.email || 'rahul.sharma@meetingflow.io'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="forest" size="sm">Workspace Admin</Badge>
                {isDemoMode && <Badge variant="amber" size="sm">Demo Mode</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* ATLASSIAN JIRA CLOUD SECTION */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0052CC]/10 border border-[#0052CC]/25 flex items-center justify-center text-[#0052CC]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary tracking-tight">Atlassian Jira Cloud</h3>
                <p className="text-xs text-secondary">
                  OAuth 2.0 (3LO) • Live meeting action item execution and bi-directional status sync
                </p>
              </div>
            </div>

            <Badge variant={jiraConnected ? 'forest' : 'default'} size="md" className="font-semibold">
              <span className={`w-2 h-2 rounded-full ${jiraConnected ? 'bg-accent-forest' : 'bg-secondary'}`} />
              {jiraConnected ? 'CONNECTED' : 'NOT CONNECTED'}
            </Badge>
          </div>

          {jiraConnected ? (
            /* Connected View */
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-background border border-border/80">
                  <span className="text-[11px] text-secondary font-medium">Jira Cloud Site</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-bold text-primary truncate">
                      {jiraStatus?.siteName || 'Atlassian Cloud'}
                    </span>
                    {jiraStatus?.siteUrl && (
                      <a
                        href={jiraStatus.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:text-primary shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-secondary truncate mt-0.5 font-mono">
                    {jiraStatus?.siteUrl}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-background border border-border/80">
                  <span className="text-[11px] text-secondary font-medium">Connected Account</span>
                  <p className="text-xs font-bold text-primary truncate mt-0.5">
                    {jiraStatus?.accountName || 'Authorized User'}
                  </p>
                  <p className="text-[10px] text-secondary truncate mt-0.5">
                    {jiraStatus?.accountEmail || 'OAuth Token Authorized'}
                  </p>
                </div>

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

                <div className="p-3.5 rounded-xl bg-background border border-border/80">
                  <span className="text-[11px] text-secondary font-medium">Sync Status</span>
                  <p className="text-xs font-bold text-accent-forest flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Live Synced
                  </p>
                  <p className="text-[10px] text-secondary truncate mt-0.5">
                    {jiraStatus?.lastSyncAt
                      ? `Last checked: ${new Date(jiraStatus.lastSyncAt).toLocaleTimeString()}`
                      : 'Auto-refreshes periodically'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-secondary">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent-forest shrink-0" />
                  OAuth 2.0 3LO token safely encrypted with AES-256-GCM.
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsJiraConfigModalOpen(true)}
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
            /* Disconnected View */
            <div className="space-y-4 pt-1">
              {/* Missing Server OAuth Configuration Banner */}
              {!jiraStatus?.isOAuthConfigured && (
                <div className="p-3.5 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-start gap-2.5 text-xs text-primary">
                  <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[#946300]">Server Missing Jira OAuth Configuration</p>
                    <p className="text-secondary mt-0.5">
                      Atlassian Client ID and Client Secret are not configured in the server environment. Click below to securely provide them without manual file editing.
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
                  Zero secret exposure. Tokens securely encrypted at rest.
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
                    {jiraStatus?.isOAuthConfigured ? 'Reconfigure OAuth' : 'Configure OAuth'}
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
                    Connect Jira
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Demo Mode & Environment Configuration Card */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-violet" />
              <h3 className="text-sm font-bold text-primary tracking-tight">DEMO MODE ACTIVE</h3>
            </div>
            <Badge variant="amber" size="sm">Active</Badge>
          </div>

          <p className="text-xs text-secondary leading-relaxed">
            The platform is operating with full seeded database capabilities. Google Calendar, Google Meet transcript timeline parsing, Gemini analysis, and Jira task creation are completely interactive.
          </p>

          <div className="p-3 rounded-xl bg-background border border-border/80 text-xs text-secondary flex items-center justify-between">
            <span>To connect live production Google or Jira APIs, configure OAuth credentials through the secure UI modals above.</span>
          </div>
        </div>

        {/* Meeting & Reminder Preferences Form */}
        <form onSubmit={handleSavePreferences} className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-5">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-primary tracking-tight">CALENDAR & AI PREFERENCES</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">
                Default Calendar Reminder Alert
              </label>
              <select
                value={reminderOffset}
                onChange={(e) => setReminderOffset(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="5">5 minutes before</option>
                <option value="10">10 minutes before (Default)</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="autoProcess"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="autoProcess" className="text-xs font-medium text-primary select-none">
                Automatically verify Google Meet conference transcripts when meeting ends
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" size="sm" variant="primary">
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* Jira OAuth Modal */}
      <JiraOAuthModal
        isOpen={isJiraOAuthModalOpen}
        onClose={() => {
          setIsJiraOAuthModalOpen(false);
          loadJiraStatus();
        }}
        onConfigured={(authUrl) => {
          window.location.href = authUrl;
        }}
        initialRedirectUri={jiraStatus?.redirectUri || 'http://localhost:5000/api/jira/oauth/callback'}
      />

      {/* Jira Config Modal */}
      <JiraConfigModal
        isOpen={isJiraConfigModalOpen}
        onClose={() => {
          setIsJiraConfigModalOpen(false);
          loadJiraStatus();
        }}
        onConfigSaved={loadJiraStatus}
        initialConfig={jiraConfig}
      />
    </div>
  );
};
