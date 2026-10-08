import axios from 'axios';
import { config } from '../config/index.js';
import { persistentDb } from '../db/index.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { geminiService } from './gemini.service.js';
import {
  JiraConnection,
  JiraConfiguration,
  JiraIssueLink,
  JiraIntegrationStatus,
  Priority
} from '../types/index.js';

export interface CreateJiraIssueOptions {
  actionItemId?: string;
  meetingId?: string;
  meetingTitle?: string;
  meetingDate?: string;
  summary: string;
  description?: string;
  ownerName?: string;
  dueDate?: string | null;
  priority?: Priority;
  projectKey?: string;
  projectId?: string;
  issueTypeId?: string;
  assigneeAccountId?: string;
  labels?: string[];
  linkType?: 'created' | 'matched' | 'manually_linked';
}

export class JiraService {
  /**
   * Check if Jira is connected for this user
   */
  public isConnected(userId: string): boolean {
    const conn = persistentDb.getJiraConnection(userId) || persistentDb.getAnyJiraConnection();
    return Boolean(conn && conn.cloudId && conn.accessTokenEncrypted);
  }

  /**
   * Get full integration status
   */
  public async getIntegrationStatus(userId: string): Promise<JiraIntegrationStatus> {
    const conn = persistentDb.getJiraConnection(userId) || persistentDb.getAnyJiraConnection();
    const conf = persistentDb.getJiraConfiguration(userId);

    const isOAuthConfigured = config.jira.isOAuthConfigured;
    const redirectUri = config.jira.redirectUri;

    let authUrl: string | undefined = undefined;
    try {
      if (isOAuthConfigured) {
        authUrl = this.getOAuthUrl(userId);
      }
    } catch {
      // If client ID/secret not configured
    }

    if (!conn) {
      return {
        isConnected: false,
        isConfigured: false,
        isOAuthConfigured,
        authUrl,
        redirectUri,
        baseUrl: config.jira.baseUrl || undefined,
        defaultProject: config.jira.defaultProject || undefined
      };
    }

    return {
      isConnected: true,
      isConfigured: Boolean(conf?.projectKey && conf?.issueTypeId),
      isOAuthConfigured,
      authUrl,
      redirectUri,
      siteName: conn.siteName,
      siteUrl: conn.siteUrl,
      cloudId: conn.cloudId,
      accountEmail: conn.accountEmail,
      accountName: conn.accountName,
      avatarUrl: conn.avatarUrl,
      lastSyncAt: conn.updatedAt,
      config: conf
    };
  }

  /**
   * Generate Atlassian OAuth 2.0 (3LO) authorization URL
   */
  public getOAuthUrl(userId?: string): string {
    const clientId = config.jira.clientId;
    if (!clientId) {
      throw new Error(
        'Atlassian Jira Client ID is not configured. Please set JIRA_CLIENT_ID (or ATLASSIAN_CLIENT_ID) in server .env.'
      );
    }

    const redirectUri = config.jira.redirectUri;
    const scopes = config.jira.scopes.join(' ');
    const statePayload = JSON.stringify({
      userId: userId || 'default-user',
      nonce: Math.random().toString(36).substring(2, 10),
      time: Date.now()
    });
    const state = Buffer.from(statePayload).toString('base64');

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code',
      prompt: 'consent'
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchangeCodeForTokens(
    code: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scope: string }> {
    const clientId = config.jira.clientId;
    const clientSecret = config.jira.clientSecret;
    const redirectUri = config.jira.redirectUri;

    if (!clientId || !clientSecret) {
      throw new Error('Jira OAuth credentials (JIRA_CLIENT_ID, JIRA_CLIENT_SECRET) are missing in server environment.');
    }

    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in || 3600,
        scope: response.data.scope || ''
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
      console.error('[JiraService] OAuth token exchange failed:', errMsg);
      throw new Error(`Atlassian OAuth exchange failed: ${errMsg}`);
    }
  }

  /**
   * Refresh OAuth token
   */
  public async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const clientId = config.jira.clientId;
    const clientSecret = config.jira.clientSecret;

    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in || 3600
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
      console.error('[JiraService] Token refresh failed:', errMsg);
      throw new Error(`Atlassian token refresh failed: ${errMsg}`);
    }
  }

  /**
   * Retrieve accessible resources (Jira Cloud sites)
   */
  public async getAccessibleResources(
    accessToken: string
  ): Promise<Array<{ id: string; name: string; url: string; avatarUrl?: string; scopes: string[] }>> {
    try {
      const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (err: any) {
      console.error('[JiraService] Failed to fetch accessible resources:', err.message);
      throw new Error(`Unable to fetch Jira sites: ${err.message}`);
    }
  }

  /**
   * Retrieve authenticated Atlassian profile
   */
  public async getAtlassianProfile(
    accessToken: string
  ): Promise<{ account_id: string; email?: string; name: string; picture?: string }> {
    try {
      const response = await axios.get('https://api.atlassian.com/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (err: any) {
      console.warn('[JiraService] Failed to fetch Atlassian /me profile:', err.message);
      return { account_id: 'unknown', name: 'Jira User' };
    }
  }

  /**
   * Complete OAuth connection by saving tokens and selected site
   */
  public async completeOAuthConnection(
    userId: string,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
    targetCloudId?: string
  ): Promise<JiraConnection> {
    const resources = await this.getAccessibleResources(tokens.accessToken);
    if (resources.length === 0) {
      throw new Error('No accessible Jira Cloud sites found for this Atlassian account.');
    }

    const selectedSite = targetCloudId
      ? resources.find(r => r.id === targetCloudId) || resources[0]
      : resources[0];

    const profile = await this.getAtlassianProfile(tokens.accessToken);
    const expiresAt = new Date(Date.now() + (tokens.expiresIn - 60) * 1000).toISOString();

    const connection: JiraConnection = {
      id: `jira-conn-${userId}`,
      userId,
      cloudId: selectedSite.id,
      siteUrl: selectedSite.url,
      siteName: selectedSite.name,
      accountId: profile.account_id,
      accountEmail: profile.email,
      accountName: profile.name,
      avatarUrl: profile.picture || selectedSite.avatarUrl,
      accessTokenEncrypted: encryptToken(tokens.accessToken),
      refreshTokenEncrypted: encryptToken(tokens.refreshToken),
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    persistentDb.saveJiraConnection(connection);

    // Auto-discover default project and issue types
    try {
      await this.autoDiscoverAndConfigure(userId, connection);
    } catch (autoErr: any) {
      console.warn('[JiraService] Auto-configuration notice:', autoErr.message);
    }

    return connection;
  }

  /**
   * Retrieve a validated, auto-refreshed access token for Jira Cloud API requests
   */
  public async getValidClientContext(
    userId: string
  ): Promise<{ accessToken: string; cloudId: string; siteUrl: string }> {
    const conn = persistentDb.getJiraConnection(userId) || persistentDb.getAnyJiraConnection();
    if (!conn) {
      throw new Error('Jira is not connected. Please connect Jira in Settings → Integrations.');
    }

    let accessToken = decryptToken(conn.accessTokenEncrypted);
    const refreshToken = decryptToken(conn.refreshTokenEncrypted);

    // Check expiration (refresh if expires in less than 2 minutes)
    const expiresMs = new Date(conn.expiresAt).getTime();
    const needsRefresh = !accessToken || Date.now() >= expiresMs - 120000;

    if (needsRefresh && refreshToken) {
      console.log(`[JiraService] Refreshing Jira OAuth token for user ${userId}...`);
      try {
        const refreshed = await this.refreshTokens(refreshToken);
        accessToken = refreshed.accessToken;
        conn.accessTokenEncrypted = encryptToken(refreshed.accessToken);
        conn.refreshTokenEncrypted = encryptToken(refreshed.refreshToken);
        conn.expiresAt = new Date(Date.now() + (refreshed.expiresIn - 60) * 1000).toISOString();
        conn.updatedAt = new Date().toISOString();
        persistentDb.saveJiraConnection(conn);
      } catch (refreshErr: any) {
        throw new Error(`Jira connection expired. Please reconnect Jira: ${refreshErr.message}`);
      }
    }

    if (!accessToken) {
      throw new Error('Unable to decrypt Jira access token. Please reconnect Jira.');
    }

    return {
      accessToken,
      cloudId: conn.cloudId,
      siteUrl: conn.siteUrl
    };
  }

  /**
   * Helper to make authenticated requests to Jira Cloud API v3
   */
  private async jiraGet<T = any>(userId: string, path: string): Promise<T> {
    const { accessToken, cloudId } = await this.getValidClientContext(userId);
    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`;

    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        },
        timeout: 15000
      });
      return res.data;
    } catch (err: any) {
      this.handleJiraApiError(err);
    }
  }

  private async jiraPost<T = any>(userId: string, path: string, body: any): Promise<T> {
    const { accessToken, cloudId } = await this.getValidClientContext(userId);
    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`;

    try {
      const res = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        timeout: 15000
      });
      return res.data;
    } catch (err: any) {
      this.handleJiraApiError(err);
    }
  }

  private handleJiraApiError(err: any): never {
    const status = err.response?.status;
    const data = err.response?.data;
    const errors = data?.errors ? JSON.stringify(data.errors) : '';
    const messages = data?.errorMessages ? data.errorMessages.join(' ') : '';
    const detail = errors || messages || err.message;

    if (status === 401) {
      throw new Error('Jira connection expired or unauthorized. Please reconnect Jira in Settings → Integrations.');
    }
    if (status === 403) {
      throw new Error(`Insufficient permissions in Jira: ${detail}`);
    }
    if (status === 404) {
      throw new Error(`Jira resource not found: ${detail}`);
    }
    throw new Error(`Jira API error (${status || 'network'}): ${detail}`);
  }

  /**
   * Auto-discover first project and set initial configuration
   */
  private async autoDiscoverAndConfigure(userId: string, conn: JiraConnection) {
    const existing = persistentDb.getJiraConfiguration(userId);
    if (existing?.projectKey) return;

    const projects = await this.getProjects(userId);
    if (projects.length === 0) return;

    const firstProject = projects[0];
    const issueTypes = await this.getIssueTypes(userId, firstProject.id);
    const standardIssueType =
      issueTypes.find(it => !it.subtask && (it.name.toLowerCase() === 'task' || it.name.toLowerCase() === 'story')) ||
      issueTypes.find(it => !it.subtask) ||
      issueTypes[0];

    if (firstProject && standardIssueType) {
      const config: JiraConfiguration = {
        userId,
        cloudId: conn.cloudId,
        projectId: firstProject.id,
        projectKey: firstProject.key,
        projectName: firstProject.name,
        projectAvatarUrl: firstProject.avatarUrl,
        issueTypeId: standardIssueType.id,
        issueTypeName: standardIssueType.name,
        issueTypeIconUrl: standardIssueType.iconUrl,
        defaultPriority: 'Medium',
        defaultLabel: 'meeting-action-item',
        updatedAt: new Date().toISOString()
      };
      persistentDb.saveJiraConfiguration(config);
    }
  }

  /**
   * Get real projects from connected Jira Cloud account
   */
  public async getProjects(
    userId: string
  ): Promise<Array<{ id: string; key: string; name: string; projectTypeKey: string; avatarUrl?: string }>> {
    const data = await this.jiraGet<any[]>(userId, '/project');
    return (data || []).map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey || 'software',
      avatarUrl: p.avatarUrls?.['32x32'] || p.avatarUrls?.['48x48'] || undefined
    }));
  }

  /**
   * Get real issue types for a specific project
   */
  public async getIssueTypes(
    userId: string,
    projectId: string
  ): Promise<Array<{ id: string; name: string; description?: string; subtask: boolean; iconUrl?: string }>> {
    try {
      // Query project specific issue types
      const projectData = await this.jiraGet<any>(userId, `/project/${projectId}`);
      const issueTypes = projectData.issueTypes || [];
      return issueTypes.map((it: any) => ({
        id: it.id,
        name: it.name,
        description: it.description || undefined,
        subtask: Boolean(it.subtask),
        iconUrl: it.iconUrl || undefined
      }));
    } catch {
      // Fallback to global issue types
      const globalTypes = await this.jiraGet<any[]>(userId, '/issuetype');
      return (globalTypes || []).map((it: any) => ({
        id: it.id,
        name: it.name,
        description: it.description || undefined,
        subtask: Boolean(it.subtask),
        iconUrl: it.iconUrl || undefined
      }));
    }
  }

  /**
   * Get assignable users for a project
   */
  public async getAssignableUsers(
    userId: string,
    projectKey: string
  ): Promise<Array<{ accountId: string; displayName: string; emailAddress?: string; avatarUrl?: string }>> {
    try {
      const data = await this.jiraGet<any[]>(
        userId,
        `/user/assignable/search?project=${encodeURIComponent(projectKey)}&maxResults=50`
      );
      return (data || []).map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        emailAddress: u.emailAddress || undefined,
        avatarUrl: u.avatarUrls?.['32x32'] || u.avatarUrls?.['48x48'] || undefined
      }));
    } catch (err: any) {
      console.warn(`[JiraService] Failed to load assignable users for ${projectKey}:`, err.message);
      return [];
    }
  }

  /**
   * Search real Jira issues using text query or JQL
   */
  public async searchIssues(
    userId: string,
    query: string,
    projectKey?: string
  ): Promise<
    Array<{
      id: string;
      key: string;
      summary: string;
      status: string;
      statusCategory: string;
      priority?: string;
      assignee?: string;
      dueDate?: string;
      url: string;
    }>
  > {
    const { siteUrl } = await this.getValidClientContext(userId);
    const cleanQuery = query.trim();

    // Check if searching for a specific issue key like "PROJ-123"
    const isExactKey = /^[A-Z0-9]+-\d+$/i.test(cleanQuery);
    let jql = '';

    if (isExactKey) {
      jql = `key = "${cleanQuery.toUpperCase()}"`;
    } else {
      const sanitized = cleanQuery.replace(/["\\]/g, ' ').trim();
      const textClause = sanitized ? `(summary ~ "${sanitized}*" OR text ~ "${sanitized}*")` : '';
      const projectClause = projectKey ? `project = "${projectKey}"` : '';

      if (textClause && projectClause) {
        jql = `${projectClause} AND ${textClause} ORDER BY updated DESC`;
      } else if (textClause) {
        jql = `${textClause} ORDER BY updated DESC`;
      } else if (projectClause) {
        jql = `${projectClause} ORDER BY updated DESC`;
      } else {
        jql = 'ORDER BY updated DESC';
      }
    }

    try {
      const data = await this.jiraGet<any>(
        userId,
        `/search?jql=${encodeURIComponent(jql)}&fields=summary,status,priority,assignee,duedate&maxResults=10`
      );

      const issues = data.issues || [];
      return issues.map((i: any) => ({
        id: i.id,
        key: i.key,
        summary: i.fields?.summary || 'Untitled Issue',
        status: i.fields?.status?.name || 'Open',
        statusCategory: i.fields?.status?.statusCategory?.name || 'To Do',
        priority: i.fields?.priority?.name || undefined,
        assignee: i.fields?.assignee?.displayName || undefined,
        dueDate: i.fields?.duedate || undefined,
        url: `${siteUrl}/browse/${i.key}`
      }));
    } catch (err: any) {
      console.warn('[JiraService] Search issues error:', err.message);
      return [];
    }
  }

  /**
   * Search existing Jira issues and evaluate with Gemini to prevent duplicates
   */
  public async matchExistingIssue(
    userId: string,
    actionItemTitle: string,
    projectKey?: string
  ): Promise<{
    matchType: 'EXISTING_ISSUE_MATCH' | 'CREATE_NEW_ISSUE';
    matchedIssue?: any;
    candidateIssues: any[];
    confidence: number;
    reason: string;
  }> {
    // 1. Search Jira with key action item terms
    const keywords = actionItemTitle
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4)
      .join(' ');

    const candidateIssues = await this.searchIssues(userId, keywords || actionItemTitle, projectKey);

    if (candidateIssues.length === 0) {
      return {
        matchType: 'CREATE_NEW_ISSUE',
        candidateIssues: [],
        confidence: 1.0,
        reason: 'No similar Jira issues exist in project.'
      };
    }

    // 2. Exact or substring match shortcut
    const titleLower = actionItemTitle.toLowerCase().trim();
    const exactMatch = candidateIssues.find(i => i.summary.toLowerCase().trim() === titleLower);
    if (exactMatch) {
      return {
        matchType: 'EXISTING_ISSUE_MATCH',
        matchedIssue: exactMatch,
        candidateIssues,
        confidence: 0.98,
        reason: `Exact match found in Jira issue ${exactMatch.key} ("${exactMatch.summary}").`
      };
    }

    // 3. AI Semantic equivalence check
    try {
      const matchEvaluation = await this.evaluateIssueSimilarityWithAI(actionItemTitle, candidateIssues);
      return {
        matchType: matchEvaluation.isMatch ? 'EXISTING_ISSUE_MATCH' : 'CREATE_NEW_ISSUE',
        matchedIssue: matchEvaluation.matchedIssue,
        candidateIssues,
        confidence: matchEvaluation.confidence,
        reason: matchEvaluation.reason
      };
    } catch (aiErr: any) {
      console.warn('[JiraService] AI semantic match failed, presenting candidates:', aiErr.message);
      return {
        matchType: 'CREATE_NEW_ISSUE',
        candidateIssues,
        confidence: 0.5,
        reason: 'Similar keywords found; please confirm whether to link or create.'
      };
    }
  }

  /**
   * Evaluate semantic similarity between action item and Jira issues using Gemini
   */
  private async evaluateIssueSimilarityWithAI(
    actionItemTitle: string,
    candidates: any[]
  ): Promise<{ isMatch: boolean; matchedIssue?: any; confidence: number; reason: string }> {
    const candidatesList = candidates
      .slice(0, 5)
      .map((c, idx) => `[${idx}] Key: ${c.key}, Summary: "${c.summary}", Status: ${c.status}`)
      .join('\n');

    const prompt = `You are MeetingFlow AI, an enterprise task matcher.
Determine whether the following meeting action item is semantically equivalent to an existing Jira issue:

ACTION ITEM: "${actionItemTitle}"

EXISTING JIRA CANDIDATES:
${candidatesList}

RULES:
1. ONLY declare a match if a candidate issue directly represents the SAME deliverable or technical work item.
2. If the existing issue is merely related but represents a different task, return isMatch: false.
3. Return strictly valid JSON adhering to:
{
  "isMatch": boolean,
  "matchedIndex": number or null,
  "confidence": number between 0.0 and 1.0,
  "reason": "Brief explanation"
}
`;

    // Execute via Gemini model
    const client = (geminiService as any).getClient();
    const model = client.getGenerativeModel({
      model: geminiService.getModelName(),
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
    });

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const parsed = JSON.parse(text);

    if (parsed.isMatch && parsed.matchedIndex !== null && candidates[parsed.matchedIndex]) {
      return {
        isMatch: true,
        matchedIssue: candidates[parsed.matchedIndex],
        confidence: parsed.confidence || 0.85,
        reason: parsed.reason || 'Semantic match confirmed.'
      };
    }

    return {
      isMatch: false,
      confidence: parsed.confidence || 0.8,
      reason: parsed.reason || 'No existing Jira issue covers this specific action item.'
    };
  }

  /**
   * Create a real Jira issue with duplicate protection and meeting context
   */
  public async createIssue(
    userId: string,
    options: CreateJiraIssueOptions
  ): Promise<{ issueId: string; issueKey: string; issueUrl: string; status: string }> {
    // 1. DUPLICATE CHECK / IDEMPOTENCY
    if (options.actionItemId) {
      const existingLink = persistentDb.getJiraIssueLinkForActionItem(options.actionItemId);
      if (existingLink) {
        console.log(`[JiraService] Action item ${options.actionItemId} already linked to ${existingLink.jiraIssueKey}`);
        return {
          issueId: existingLink.jiraIssueId,
          issueKey: existingLink.jiraIssueKey,
          issueUrl: existingLink.jiraUrl,
          status: existingLink.status || 'To Do'
        };
      }
    }

    const { siteUrl } = await this.getValidClientContext(userId);
    const config = persistentDb.getJiraConfiguration(userId);

    const projectKey = options.projectKey || config?.projectKey;
    const issueTypeId = options.issueTypeId || config?.issueTypeId;

    if (!projectKey) {
      throw new Error('No Jira project selected. Please configure a default project in Settings → Integrations → Jira.');
    }

    if (!issueTypeId) {
      throw new Error('No Jira issue type selected. Please configure an issue type in Settings → Integrations → Jira.');
    }

    // Format rich Atlassian Document Format (ADF) description
    const adfParagraphs: any[] = [];

    // Context metadata
    if (options.meetingTitle) {
      adfParagraphs.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Source Meeting: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: options.meetingTitle }
        ]
      });
    }

    if (options.meetingDate) {
      adfParagraphs.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Meeting Date: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: options.meetingDate }
        ]
      });
    }

    if (options.ownerName) {
      adfParagraphs.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Assigned Owner: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: options.ownerName }
        ]
      });
    }

    // Action item content
    adfParagraphs.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Action Item: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: options.summary }
      ]
    });

    if (options.description) {
      adfParagraphs.push({
        type: 'paragraph',
        content: [{ type: 'text', text: options.description }]
      });
    }

    adfParagraphs.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Generated by MeetingFlow Intelligence Platform',
          marks: [{ type: 'em' }]
        }
      ]
    });

    const body: any = {
      fields: {
        project: { key: projectKey },
        summary: options.summary,
        issuetype: { id: issueTypeId },
        description: {
          type: 'doc',
          version: 1,
          content: adfParagraphs
        }
      }
    };

    // Priority mapping
    if (options.priority) {
      body.fields.priority = { name: this.mapPriority(options.priority) };
    } else if (config?.defaultPriority) {
      body.fields.priority = { name: config.defaultPriority };
    }

    // Due Date (Strict ISO YYYY-MM-DD)
    if (options.dueDate) {
      const datePart = options.dueDate.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        body.fields.duedate = datePart;
      }
    }

    // Assignee matching: match Jira account ID if provided
    if (options.assigneeAccountId) {
      body.fields.assignee = { accountId: options.assigneeAccountId };
    }

    // Labels
    const labels = options.labels || (config?.defaultLabel ? [config.defaultLabel] : ['meetingflow']);
    if (labels.length > 0) {
      body.fields.labels = labels.map(l => l.replace(/\s+/g, '-'));
    }

    console.log(`[JiraService] Creating issue in project ${projectKey} with summary "${options.summary}"...`);
    const createdData = await this.jiraPost<any>(userId, '/issue', body);

    const issueKey = createdData.key;
    const issueId = createdData.id;
    const issueUrl = `${siteUrl}/browse/${issueKey}`;

    // Link persistence
    const link: JiraIssueLink = {
      id: `jlink-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      meetingId: options.meetingId,
      meetingTitle: options.meetingTitle,
      actionItemId: options.actionItemId || `act-${Date.now()}`,
      jiraIssueId: issueId,
      jiraIssueKey: issueKey,
      jiraProjectKey: projectKey,
      jiraUrl: issueUrl,
      linkType: options.linkType || 'created',
      summary: options.summary,
      status: 'To Do',
      statusCategory: 'To Do',
      priority: options.priority || 'MEDIUM',
      assigneeName: options.ownerName,
      dueDate: options.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    persistentDb.saveJiraIssueLink(link);

    if (options.meetingId && options.actionItemId) {
      persistentDb.updateActionItemJira(
        options.meetingId,
        options.actionItemId,
        issueKey,
        issueUrl,
        'To Do',
        options.linkType || 'created'
      );
    }

    console.log(`[JiraService] Successfully created Jira issue ${issueKey}: ${issueUrl}`);

    return {
      issueId,
      issueKey,
      issueUrl,
      status: 'To Do'
    };
  }

  /**
   * Bulk create issues from unmapped tasks
   */
  public async createBulkIssues(
    userId: string,
    items: Array<{
      summary: string;
      priority?: any;
      dueDate?: string | null;
      projectKey?: string;
      description?: string;
    }>
  ): Promise<{ createdCount: number; issues: any[] }> {
    const created: any[] = [];
    for (const item of items) {
      try {
        const res = await this.createIssue(userId, {
          summary: item.summary,
          priority: item.priority,
          dueDate: item.dueDate,
          projectKey: item.projectKey,
          description: item.description
        });
        created.push(res);
      } catch (err: any) {
        console.warn(`[JiraService] Bulk item creation notice for "${item.summary}":`, err.message);
      }
    }
    return { createdCount: created.length, issues: created };
  }

  /**
   * Manually link an action item to an existing Jira issue
   */
  public async linkActionItemToIssue(
    userId: string,
    actionItemId: string,
    issueKey: string,
    meetingId?: string,
    meetingTitle?: string
  ): Promise<JiraIssueLink> {
    const liveIssue = await this.getIssue(userId, issueKey);

    const link: JiraIssueLink = {
      id: `jlink-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      meetingId,
      meetingTitle,
      actionItemId,
      jiraIssueId: liveIssue.id,
      jiraIssueKey: liveIssue.key,
      jiraProjectKey: liveIssue.project?.key,
      jiraUrl: liveIssue.url,
      linkType: 'manually_linked',
      summary: liveIssue.summary,
      status: liveIssue.status,
      statusCategory: liveIssue.statusCategory,
      priority: liveIssue.priority,
      assigneeName: liveIssue.assignee,
      dueDate: liveIssue.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    persistentDb.saveJiraIssueLink(link);

    if (meetingId) {
      persistentDb.updateActionItemJira(
        meetingId,
        actionItemId,
        liveIssue.key,
        liveIssue.url,
        liveIssue.status,
        'manually_linked'
      );
    }

    return link;
  }

  /**
   * Unlink an action item from Jira
   */
  public async unlinkActionItem(meetingId: string, actionItemId: string): Promise<void> {
    persistentDb.deleteJiraIssueLink(actionItemId);
    const meeting = persistentDb.getMeetingById(meetingId);
    if (meeting?.actionItems) {
      const item = meeting.actionItems.find(a => a.id === actionItemId);
      if (item) {
        item.jiraIssueKey = null;
        item.jiraIssueUrl = null;
        item.jiraStatus = undefined;
        item.jiraLinkType = undefined;
        persistentDb.saveMeeting(meeting);
      }
    }
  }

  /**
   * Get single real issue details directly from Jira
   */
  public async getIssue(
    userId: string,
    issueKey: string
  ): Promise<{
    id: string;
    key: string;
    summary: string;
    description?: string;
    status: string;
    statusCategory: string;
    priority?: string;
    assignee?: string;
    reporter?: string;
    dueDate?: string;
    project?: { key: string; name: string };
    labels?: string[];
    createdAt?: string;
    updatedAt?: string;
    url: string;
  }> {
    const { siteUrl } = await this.getValidClientContext(userId);
    const data = await this.jiraGet<any>(
      userId,
      `/issue/${issueKey}?fields=summary,description,status,priority,assignee,reporter,duedate,project,labels,created,updated`
    );

    const fields = data.fields || {};

    return {
      id: data.id,
      key: data.key,
      summary: fields.summary || '',
      description: typeof fields.description === 'string' ? fields.description : undefined,
      status: fields.status?.name || 'Open',
      statusCategory: fields.status?.statusCategory?.name || 'To Do',
      priority: fields.priority?.name || undefined,
      assignee: fields.assignee?.displayName || undefined,
      reporter: fields.reporter?.displayName || undefined,
      dueDate: fields.duedate || undefined,
      project: fields.project ? { key: fields.project.key, name: fields.project.name } : undefined,
      labels: fields.labels || [],
      createdAt: fields.created,
      updatedAt: fields.updated,
      url: `${siteUrl}/browse/${data.key}`
    };
  }

  /**
   * Synchronize live Jira issue status back to stored records
   */
  public async syncIssueStatus(userId: string, issueKey: string): Promise<JiraIssueLink | null> {
    try {
      const live = await this.getIssue(userId, issueKey);
      persistentDb.updateJiraIssueLinkStatus(issueKey, live.status, live.statusCategory);
      const link = persistentDb.getJiraIssueLinks().find(l => l.jiraIssueKey === issueKey);
      return link || null;
    } catch (err: any) {
      console.warn(`[JiraService] Failed to sync status for ${issueKey}:`, err.message);
      return null;
    }
  }

  /**
   * Get all real Jira work linked across meetings, with accurate metrics
   */
  public async getAllLinkedWork(userId: string): Promise<{
    issues: JiraIssueLink[];
    metrics: {
      totalLinked: number;
      openCount: number;
      inProgressCount: number;
      doneCount: number;
    };
  }> {
    const links = persistentDb.getJiraIssueLinks();

    // Optionally sync live statuses if user has active Jira connection
    if (this.isConnected(userId) && links.length > 0) {
      // Sync up to 5 oldest updated links
      const oldestToSync = [...links]
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        .slice(0, 5);

      for (const link of oldestToSync) {
        try {
          await this.syncIssueStatus(userId, link.jiraIssueKey);
        } catch {
          // ignore background sync failure
        }
      }
    }

    const updatedLinks = persistentDb.getJiraIssueLinks();

    const openCount = updatedLinks.filter(
      l => !l.statusCategory || l.statusCategory.toLowerCase().includes('to do') || l.status === 'To Do'
    ).length;

    const inProgressCount = updatedLinks.filter(
      l => l.statusCategory?.toLowerCase().includes('in progress') || l.status === 'In Progress'
    ).length;

    const doneCount = updatedLinks.filter(
      l => l.statusCategory?.toLowerCase().includes('done') || l.status === 'Done' || l.status === 'Closed'
    ).length;

    return {
      issues: updatedLinks,
      metrics: {
        totalLinked: updatedLinks.length,
        openCount,
        inProgressCount,
        doneCount
      }
    };
  }

  /**
   * Disconnect Jira integration
   */
  public async disconnect(userId: string): Promise<void> {
    persistentDb.deleteJiraConnection(userId);
    console.log(`[JiraService] Jira disconnected cleanly for user ${userId}.`);
  }

  /**
   * Test Jira connection
   */
  public async testConnection(userId: string = 'default-user'): Promise<{ success: boolean; message: string; projects?: string[] }> {
    const isConn = this.isConnected(userId);
    if (!isConn) {
      return {
        success: false,
        message: 'Jira Cloud is not connected. Please connect via OAuth in Settings → Integrations.'
      };
    }

    try {
      const projects = await this.getProjects(userId);
      return {
        success: true,
        message: `Connected to Jira Cloud (${projects.length} accessible projects).`,
        projects: projects.map(p => p.key)
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Jira connection test failed: ${err.message}`
      };
    }
  }

  public updateConfig(legacyConfig: { baseUrl: string; email: string; apiToken: string; projectKey?: string }) {
    console.log('[JiraService] Saved Jira config:', legacyConfig.baseUrl, legacyConfig.projectKey);
  }

  public async getStatus(userId: string = 'default-user'): Promise<JiraIntegrationStatus> {
    return this.getIntegrationStatus(userId);
  }

  private mapPriority(priority?: Priority): string {
    switch (priority) {
      case 'HIGH':
        return 'High';
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
      default:
        return 'Medium';
    }
  }
}

export const jiraService = new JiraService();
