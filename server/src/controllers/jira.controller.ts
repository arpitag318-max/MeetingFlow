import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { jiraService } from '../services/jira.service.js';
import { persistentDb } from '../db/index.js';

export const jiraController = {
  // 1. Get OAuth authorization URL
  getOAuthUrl: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const authUrl = jiraService.getOAuthUrl(userId);
      return res.json({ success: true, authUrl });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 1b. Save Atlassian OAuth credentials on server & persist to .env
  updateOAuthConfig: async (req: Request, res: Response) => {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Both Atlassian Client ID and Client Secret are required.'
      });
    }

    const trimmedClientId = String(clientId).trim();
    const trimmedSecret = String(clientSecret).trim();
    const trimmedRedirect = redirectUri
      ? String(redirectUri).trim()
      : 'http://localhost:5000/api/jira/oauth/callback';

    // Update in-memory environment variables
    process.env.JIRA_CLIENT_ID = trimmedClientId;
    process.env.ATLASSIAN_CLIENT_ID = trimmedClientId;
    process.env.JIRA_CLIENT_SECRET = trimmedSecret;
    process.env.ATLASSIAN_CLIENT_SECRET = trimmedSecret;
    process.env.JIRA_REDIRECT_URI = trimmedRedirect;
    process.env.ATLASSIAN_REDIRECT_URI = trimmedRedirect;

    // Persist to .env on disk
    try {
      const candidates = [
        path.resolve(process.cwd(), 'server/.env'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env')
      ];
      const targetEnv = candidates.find(p => fs.existsSync(p)) || candidates[0];

      let content = fs.existsSync(targetEnv) ? fs.readFileSync(targetEnv, 'utf-8') : '';

      const updateKey = (raw: string, key: string, val: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(raw)) {
          return raw.replace(regex, `${key}=${val}`);
        }
        return raw + (raw.endsWith('\n') ? '' : '\n') + `${key}=${val}\n`;
      };

      content = updateKey(content, 'JIRA_CLIENT_ID', trimmedClientId);
      content = updateKey(content, 'JIRA_CLIENT_SECRET', trimmedSecret);
      content = updateKey(content, 'JIRA_REDIRECT_URI', trimmedRedirect);

      fs.writeFileSync(targetEnv, content, 'utf-8');
      console.log('[JiraController] OAuth credentials successfully persisted to server .env.');
    } catch (fsErr: any) {
      console.warn('[JiraController] Notice: Could not write credentials to .env file:', fsErr.message);
    }

    const userId = req.user?.id || 'default-user';
    try {
      const authUrl = jiraService.getOAuthUrl(userId);
      return res.json({
        success: true,
        message: 'Atlassian OAuth credentials configured successfully.',
        authUrl
      });
    } catch (err: any) {
      return res.json({
        success: true,
        message: 'Atlassian OAuth credentials saved.'
      });
    }
  },

  // 2. OAuth Callback handler
  handleOAuthCallback: async (req: Request, res: Response) => {
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      console.error('[JiraController] OAuth returned error:', oauthError, error_description);
      return res.redirect(`/integrations?error=${encodeURIComponent(String(error_description || oauthError))}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect('/integrations?error=Missing+authorization+code');
    }

    let userId = 'default-user';
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (decoded.userId) userId = decoded.userId;
      } catch {
        // fallback
      }
    }

    try {
      const tokens = await jiraService.exchangeCodeForTokens(code);
      await jiraService.completeOAuthConnection(userId, tokens);
      return res.redirect('/integrations?jira=connected');
    } catch (err: any) {
      console.error('[JiraController] OAuth completion failed:', err.message);
      return res.redirect(`/integrations?error=${encodeURIComponent(err.message)}`);
    }
  },

  // 3. Status
  getStatus: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const status = await jiraService.getIntegrationStatus(userId);
      return res.json({ success: true, ...status });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 4. Disconnect
  disconnect: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      await jiraService.disconnect(userId);
      return res.json({ success: true, message: 'Jira disconnected successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 5. Accessible Jira sites
  getSites: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const ctx = await jiraService.getValidClientContext(userId);
      const sites = await jiraService.getAccessibleResources(ctx.accessToken);
      return res.json({ success: true, sites });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 6. Select Jira site
  selectSite: async (req: Request, res: Response) => {
    try {
      const { cloudId } = req.body;
      const userId = req.user?.id || 'default-user';
      const conn = persistentDb.getJiraConnection(userId) || persistentDb.getAnyJiraConnection();

      if (!conn) {
        return res.status(400).json({ success: false, message: 'No Jira connection exists to configure.' });
      }

      const ctx = await jiraService.getValidClientContext(userId);
      const sites = await jiraService.getAccessibleResources(ctx.accessToken);
      const matched = sites.find(s => s.id === cloudId);

      if (!matched) {
        return res.status(404).json({ success: false, message: 'Jira site with specified cloudId not found.' });
      }

      conn.cloudId = matched.id;
      conn.siteName = matched.name;
      conn.siteUrl = matched.url;
      conn.updatedAt = new Date().toISOString();
      persistentDb.saveJiraConnection(conn);

      return res.json({ success: true, connection: conn });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 7. Get projects
  getProjects: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const projects = await jiraService.getProjects(userId);
      return res.json({ success: true, projects });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 8. Get issue types for project
  getIssueTypes: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ success: false, message: 'projectId query parameter is required.' });
      }

      const userId = req.user?.id || 'default-user';
      const issueTypes = await jiraService.getIssueTypes(userId, projectId);
      return res.json({ success: true, issueTypes });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 9. Get assignable users
  getUsers: async (req: Request, res: Response) => {
    try {
      const { projectKey } = req.query;
      if (!projectKey || typeof projectKey !== 'string') {
        return res.status(400).json({ success: false, message: 'projectKey query parameter is required.' });
      }

      const userId = req.user?.id || 'default-user';
      const users = await jiraService.getAssignableUsers(userId, projectKey);
      return res.json({ success: true, users });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 10. Save Jira configuration
  saveConfig: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const {
        projectId,
        projectKey,
        projectName,
        projectAvatarUrl,
        issueTypeId,
        issueTypeName,
        issueTypeIconUrl,
        defaultPriority,
        defaultAssignee,
        defaultAssigneeName,
        defaultLabel
      } = req.body;

      if (!projectKey || !issueTypeId) {
        return res.status(400).json({
          success: false,
          message: 'Both projectKey and issueTypeId are required to configure Jira.'
        });
      }

      const conn = persistentDb.getJiraConnection(userId) || persistentDb.getAnyJiraConnection();
      if (!conn) {
        return res.status(400).json({
          success: false,
          message: 'Connect Jira before saving configuration.'
        });
      }

      const saved = persistentDb.saveJiraConfiguration({
        userId,
        cloudId: conn.cloudId,
        projectId: projectId || '',
        projectKey,
        projectName,
        projectAvatarUrl,
        issueTypeId,
        issueTypeName,
        issueTypeIconUrl,
        defaultPriority: defaultPriority || 'Medium',
        defaultAssignee,
        defaultAssigneeName,
        defaultLabel: defaultLabel || 'meeting-action-item',
        updatedAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: 'Jira configuration saved successfully.',
        config: saved
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 11. Search Jira issues
  searchIssues: async (req: Request, res: Response) => {
    try {
      const { query, projectKey } = req.query;
      if (!query || typeof query !== 'string') {
        return res.json({ success: true, issues: [] });
      }

      const userId = req.user?.id || 'default-user';
      const issues = await jiraService.searchIssues(
        userId,
        query,
        typeof projectKey === 'string' ? projectKey : undefined
      );

      return res.json({ success: true, issues });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 12. Evaluate existing issue match (duplicate detection)
  matchIssue: async (req: Request, res: Response) => {
    try {
      const { taskTitle, projectKey } = req.body;
      if (!taskTitle) {
        return res.status(400).json({ success: false, message: 'taskTitle is required.' });
      }

      const userId = req.user?.id || 'default-user';
      const matchResult = await jiraService.matchExistingIssue(userId, taskTitle, projectKey);
      return res.json({ success: true, ...matchResult });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 13. Create Jira issue from action item
  createIssue: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const {
        actionItemId,
        meetingId,
        meetingTitle,
        meetingDate,
        summary,
        description,
        ownerName,
        dueDate,
        priority,
        projectKey,
        projectId,
        issueTypeId,
        assigneeAccountId,
        labels
      } = req.body;

      if (!summary) {
        return res.status(400).json({ success: false, message: 'Issue summary is required.' });
      }

      const result = await jiraService.createIssue(userId, {
        actionItemId,
        meetingId,
        meetingTitle,
        meetingDate,
        summary,
        description,
        ownerName,
        dueDate,
        priority,
        projectKey,
        projectId,
        issueTypeId,
        assigneeAccountId,
        labels
      });

      return res.json({
        success: true,
        message: `Created ${result.issueKey} in Jira.`,
        ...result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 13b. Bulk create issues
  createBulk: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'items array is required' });
      }

      const result = await jiraService.createBulkIssues(userId, items);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 14. Manually link action item to Jira issue
  linkIssue: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const { actionItemId, issueKey, meetingId, meetingTitle } = req.body;

      if (!actionItemId || !issueKey) {
        return res.status(400).json({ success: false, message: 'actionItemId and issueKey are required.' });
      }

      const link = await jiraService.linkActionItemToIssue(userId, actionItemId, issueKey, meetingId, meetingTitle);
      return res.json({
        success: true,
        message: `Linked action item to Jira issue ${issueKey}.`,
        link
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 15. Unlink action item
  unlinkIssue: async (req: Request, res: Response) => {
    try {
      const { actionItemId } = req.params;
      const { meetingId } = req.query;

      if (!actionItemId || !meetingId || typeof meetingId !== 'string') {
        return res.status(400).json({ success: false, message: 'actionItemId and meetingId are required.' });
      }

      await jiraService.unlinkActionItem(meetingId, actionItemId);
      return res.json({ success: true, message: 'Unlinked from Jira.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 16. Get single real issue & status
  getIssue: async (req: Request, res: Response) => {
    try {
      const { issueKey } = req.params;
      const userId = req.user?.id || 'default-user';
      const issue = await jiraService.getIssue(userId, issueKey);
      return res.json({ success: true, issue });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 17. Sync status
  syncStatus: async (req: Request, res: Response) => {
    try {
      const { issueKey } = req.params;
      const userId = req.user?.id || 'default-user';
      const link = await jiraService.syncIssueStatus(userId, issueKey);
      return res.json({ success: true, link });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 18. All linked work & metrics
  getLinkedWork: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'default-user';
      const data = await jiraService.getAllLinkedWork(userId);
      return res.json({ success: true, ...data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};
