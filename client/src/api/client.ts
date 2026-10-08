import {
  Meeting,
  UserTask,
  AnalyticsSummary,
  IntegrationStatus,
  User,
  TranscriptEntry,
  ProcessingJob
} from '../types';

import {
  demoUser,
  demoUpcomingMeetings,
  demoCompletedMeetings,
  demoTasks,
  demoAnalytics,
  demoIntegrationStatus,
} from './demoStore';

const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export function getSessionToken(): string | null {
  return localStorage.getItem('meetingflow_session_token');
}

export function setSessionToken(token: string | null) {
  if (token) {
    localStorage.setItem('meetingflow_session_token', token);
  } else {
    localStorage.removeItem('meetingflow_session_token');
  }
}

export function getModePreference(): boolean {
  return localStorage.getItem('meetingflow_mode') === 'demo';
}

export function setModePreference(isDemo: boolean) {
  localStorage.setItem('meetingflow_mode', isDemo ? 'demo' : 'real');
}

function getMockFallback<T>(url: string): T | null {
  const allMeetings = [...demoUpcomingMeetings, ...demoCompletedMeetings];

  if (url === '/auth/demo') {
    return { success: true, user: demoUser, sessionToken: 'demo-session-token', isDemoMode: true } as unknown as T;
  }
  if (url === '/auth/me') {
    return { success: true, user: demoUser, isDemoMode: true, isGoogleConnected: true } as unknown as T;
  }
  if (url === '/meetings/upcoming') {
    return { success: true, meetings: demoUpcomingMeetings, count: demoUpcomingMeetings.length, isRealMode: false, isGoogleConnected: true } as unknown as T;
  }
  if (url.startsWith('/meetings') && !url.includes('/transcript') && !url.includes('/processing-status') && !url.includes('/process') && !url.includes('/simulate')) {
    const parts = url.split('/');
    if (parts.length > 2 && parts[2]) {
      const found = allMeetings.find(m => m.id === parts[2]) || demoCompletedMeetings[0];
      return { success: true, meeting: found } as unknown as T;
    }
    return { success: true, meetings: allMeetings, total: allMeetings.length, isRealMode: false } as unknown as T;
  }
  if (url.includes('/transcript')) {
    return { success: true, transcripts: demoCompletedMeetings[0].transcripts || [] } as unknown as T;
  }
  if (url.includes('/processing-status')) {
    return { success: true, processingJob: { id: 'job-1', meetingId: 'meet-1', status: 'COMPLETED', stage: 'Complete', progress: 100, retryCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } as unknown as T;
  }
  if (url.includes('/process') || url === '/meetings/simulate') {
    return { success: true, message: 'Simulated meeting ready', meeting: demoCompletedMeetings[0] } as unknown as T;
  }
  if (url.startsWith('/tasks')) {
    return {
      success: true,
      tasks: demoTasks,
      groups: {
        dueToday: demoTasks,
        overdue: [],
        upcoming: [],
        completed: [],
      },
      counts: {
        total: demoTasks.length,
        dueToday: demoTasks.length,
        overdue: 0,
        upcoming: 0,
        completed: 0,
      },
      isRealMode: false,
    } as unknown as T;
  }
  if (url === '/analytics/summary') {
    return { success: true, analytics: demoAnalytics, isRealMode: false } as unknown as T;
  }
  if (url === '/integrations/status') {
    return { success: true, integrations: demoIntegrationStatus } as unknown as T;
  }
  if (url === '/jira/status') {
    return { success: true, ...demoIntegrationStatus.jira } as unknown as T;
  }
  if (url === '/jira/linked-work') {
    return { success: true, items: [] } as unknown as T;
  }
  return null;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const isDemo = getModePreference();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'x-user-id': token } : {}),
    'x-demo-mode': isDemo ? 'true' : 'false',
    ...(options?.headers as Record<string, string>),
  };

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      if (contentType.includes('text/html')) {
        const fallback = getMockFallback<T>(url);
        if (fallback) return fallback;
        throw new Error(`API endpoint not found. Backend server is not running at ${BASE_URL}.`);
      }
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.message) errorMsg = errData.message;
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    if (isDemo || url.startsWith('/meetings') || url.startsWith('/tasks') || url.startsWith('/analytics') || url.startsWith('/auth')) {
      const fallback = getMockFallback<T>(url);
      if (fallback) return fallback;
    }
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    loginDemo: () => fetchJson<{ success: boolean; user: User; sessionToken: string; isDemoMode: boolean }>('/auth/demo', { method: 'POST' }),
    getMe: () => fetchJson<{ success: boolean; user: User; isDemoMode: boolean; isGoogleConnected: boolean }>('/auth/me'),
    getGoogleUrl: (userId?: string) =>
      fetchJson<{ success: boolean; url: string }>(`/auth/google/url${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
    saveGoogleConfig: (data: { clientId: string; clientSecret: string; redirectUri?: string }) =>
      fetchJson<{ success: boolean; message: string; authUrl?: string }>('/auth/google/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    syncGoogleToken: (providerToken: string, providerRefreshToken?: string) =>
      fetchJson<{ success: boolean; message: string; isGoogleConnected: boolean }>('/auth/google/sync-token', {
        method: 'POST',
        body: JSON.stringify({ providerToken, providerRefreshToken }),
      }),
    handleGoogleCallback: (code: string) =>
      fetchJson<{ success: boolean; user: User; sessionToken: string; isDemoMode: boolean; message: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
  },

  // Meetings
  meetings: {
    getUpcoming: () =>
      fetchJson<{
        success: boolean;
        meetings: Meeting[];
        count: number;
        isRealMode: boolean;
        isGoogleConnected?: boolean;
        message?: string;
        warning?: string;
        error?: string;
      }>('/meetings/upcoming'),
    getAll: (params?: { status?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.search) query.append('search', params.search);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchJson<{ success: boolean; meetings: Meeting[]; total: number; isRealMode: boolean }>(`/meetings${qs}`);
    },
    getById: (id: string) => fetchJson<{ success: boolean; meeting: Meeting }>(`/meetings/${id}`),
    getTranscript: (id: string) => fetchJson<{ success: boolean; transcripts: TranscriptEntry[] }>(`/meetings/${id}/transcript`),
    getProcessingStatus: (id: string) => fetchJson<{ success: boolean; processingJob: ProcessingJob }>(`/meetings/${id}/processing-status`),
    process: (id: string, isDemoMode = false) =>
      fetchJson<{ success: boolean; message: string; meeting: Meeting }>(`/meetings/${id}/process`, {
        method: 'POST',
        body: JSON.stringify({ isDemoMode }),
      }),
    simulate: () => fetchJson<{ success: boolean; meeting: Meeting }>('/meetings/simulate', { method: 'POST' }),
  },

  // Tasks
  tasks: {
    getAll: (params?: { status?: string; priority?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.priority) query.append('priority', params.priority);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return fetchJson<{
        success: boolean;
        tasks: UserTask[];
        groups: {
          dueToday: UserTask[];
          overdue: UserTask[];
          upcoming: UserTask[];
          completed: UserTask[];
        };
        counts: {
          total: number;
          dueToday: number;
          overdue: number;
          upcoming: number;
          completed: number;
        };
        isRealMode: boolean;
      }>(`/tasks${qs}`);
    },
    update: (id: string, updates: Partial<UserTask>) =>
      fetchJson<{ success: boolean; task: UserTask }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    complete: (id: string) =>
      fetchJson<{ success: boolean; message: string; task: UserTask }>(`/tasks/${id}/complete`, {
        method: 'POST',
      }),
    setReminder: (id: string, reminderAt: string) =>
      fetchJson<{ success: boolean; message: string; task: UserTask; eventId?: string }>('/tasks/' + id + '/reminder', {
        method: 'POST',
        body: JSON.stringify({ reminderAt }),
      }),
  },

  // Jira Cloud Integration
  jira: {
    getOAuthUrl: () => fetchJson<{ success: boolean; authUrl: string }>('/jira/oauth/url'),
    saveOAuthConfig: (payload: { clientId: string; clientSecret: string; redirectUri?: string }) =>
      fetchJson<{ success: boolean; message: string; authUrl?: string }>('/jira/oauth/config', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getStatus: () =>
      fetchJson<{
        success: boolean;
        isConnected: boolean;
        isConfigured: boolean;
        isOAuthConfigured?: boolean;
        siteName?: string;
        siteUrl?: string;
        cloudId?: string;
        accountEmail?: string;
        accountName?: string;
        avatarUrl?: string;
        lastSyncAt?: string;
        config?: any;
        redirectUri?: string;
        authUrl?: string;
      }>('/jira/status'),
    disconnect: () => fetchJson<{ success: boolean; message: string }>('/jira/disconnect', { method: 'POST' }),
    getSites: () => fetchJson<{ success: boolean; sites: Array<{ id: string; name: string; url: string; avatarUrl?: string }> }>('/jira/sites'),
    selectSite: (cloudId: string) =>
      fetchJson<{ success: boolean; connection: any }>('/jira/sites/select', {
        method: 'POST',
        body: JSON.stringify({ cloudId }),
      }),
    getProjects: () =>
      fetchJson<{ success: boolean; projects: Array<{ id: string; key: string; name: string; projectTypeKey: string; avatarUrl?: string }> }>(
        '/jira/projects'
      ),
    getIssueTypes: (projectId: string) =>
      fetchJson<{ success: boolean; issueTypes: Array<{ id: string; name: string; description?: string; subtask: boolean; iconUrl?: string }> }>(
        `/jira/issue-types?projectId=${encodeURIComponent(projectId)}`
      ),
    getUsers: (projectKey: string) =>
      fetchJson<{ success: boolean; users: Array<{ accountId: string; displayName: string; emailAddress?: string; avatarUrl?: string }> }>(
        `/jira/users?projectKey=${encodeURIComponent(projectKey)}`
      ),
    saveConfig: (config: any) =>
      fetchJson<{ success: boolean; message: string; config: any }>('/jira/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    searchIssues: (query: string, projectKey?: string) =>
      fetchJson<{
        success: boolean;
        issues: Array<{
          id: string;
          key: string;
          summary: string;
          status: string;
          statusCategory: string;
          priority?: string;
          assignee?: string;
          dueDate?: string;
          url: string;
        }>;
      }>(`/jira/search?query=${encodeURIComponent(query)}${projectKey ? `&projectKey=${encodeURIComponent(projectKey)}` : ''}`),
    matchIssue: (taskTitle: string, projectKey?: string) =>
      fetchJson<{
        success: boolean;
        matchType: 'EXISTING_ISSUE_MATCH' | 'CREATE_NEW_ISSUE';
        matchedIssue?: any;
        candidateIssues: any[];
        confidence: number;
        reason: string;
      }>('/jira/issues/match', {
        method: 'POST',
        body: JSON.stringify({ taskTitle, projectKey }),
      }),
    createIssue: (payload: {
      actionItemId?: string;
      meetingId?: string;
      meetingTitle?: string;
      meetingDate?: string;
      summary: string;
      description?: string;
      ownerName?: string;
      dueDate?: string | null;
      priority?: string;
      projectKey?: string;
      projectId?: string;
      issueTypeId?: string;
      assigneeAccountId?: string;
      labels?: string[];
    }) =>
      fetchJson<{ success: boolean; message: string; issueId: string; issueKey: string; issueUrl: string; status: string }>(
        '/jira/issues',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    createBulk: (items: any[]) =>
      fetchJson<{ success: boolean; createdCount: number; issues: any[] }>('/jira/issues/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    linkIssue: (payload: { actionItemId: string; issueKey: string; meetingId?: string; meetingTitle?: string }) =>
      fetchJson<{ success: boolean; message: string; link: any }>('/jira/issues/link', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    unlinkIssue: (actionItemId: string, meetingId: string) =>
      fetchJson<{ success: boolean; message: string }>(
        `/jira/issues/link/${encodeURIComponent(actionItemId)}?meetingId=${encodeURIComponent(meetingId)}`,
        { method: 'DELETE' }
      ),
    getIssue: (issueKey: string) => fetchJson<{ success: boolean; issue: any }>(`/jira/issues/${encodeURIComponent(issueKey)}`),
    syncIssue: (issueKey: string) =>
      fetchJson<{ success: boolean; link: any }>(`/jira/issues/${encodeURIComponent(issueKey)}/sync`, { method: 'POST' }),
    getLinkedWork: () =>
      fetchJson<{
        success: boolean;
        issues: any[];
        metrics: { totalLinked: number; openCount: number; inProgressCount: number; doneCount: number };
      }>('/jira/work'),
  },

  // Calendar
  calendar: {
    getDiagnostics: () => fetchJson<any>('/calendar/diagnostics'),
    getEvents: () => fetchJson<{ success: boolean; events: any[]; isRealMode: boolean; isGoogleConnected?: boolean }>('/calendar/events'),
    createReminder: (payload: { taskTitle: string; reminderAt: string; meetingTitle?: string; taskId?: string }) =>
      fetchJson<{ success: boolean; message: string; eventId?: string; eventUrl?: string }>('/calendar/reminders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Analytics
  analytics: {
    getSummary: () => fetchJson<{ success: boolean; analytics: AnalyticsSummary; isRealMode: boolean }>('/analytics'),
  },

  // Integrations
  integrations: {
    getStatus: () => fetchJson<{ success: boolean } & IntegrationStatus>('/integrations/status'),
    testGemini: () => fetchJson<{ success: boolean; model: string; message: string }>('/integrations/test-gemini', { method: 'POST' }),
    testJira: () => fetchJson<{ success: boolean; message: string; projects?: string[] }>('/integrations/test-jira', { method: 'POST' }),
    updateJira: (config: { baseUrl: string; email: string; apiToken: string; projectKey?: string }) =>
      fetchJson<{ success: boolean; message: string }>('/integrations/jira/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
  },
};
