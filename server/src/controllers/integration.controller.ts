import { Request, Response } from 'express';
import { googleService } from '../services/google.service.js';
import { geminiService } from '../services/gemini.service.js';
import { jiraService } from '../services/jira.service.js';
import { demoStore } from '../store/demo-store.js';

export const integrationController = {
  // Get integration statuses (never exposes secrets or keys)
  getStatus: async (req: Request, res: Response) => {
    const isDemo = req.isDemoUser;
    const user = req.user;
    const userId = user?.id || 'default-user';
    const googleConnected = Boolean(isDemo ? demoStore.currentUser.googleTokens : user?.googleTokens);

    let authUrl: string | null = null;
    try {
      if (googleService.isConfigured()) {
        authUrl = googleService.getAuthUrl();
      }
    } catch {
      authUrl = null;
    }

    const jiraStatus = await jiraService.getIntegrationStatus(userId);

    return res.json({
      success: true,
      google: {
        isConnected: googleConnected,
        isConfigured: googleService.isConfigured(),
        calendarConnected: googleConnected,
        meetConnected: googleConnected,
        authUrl
      },
      gemini: {
        isConfigured: geminiService.isConfigured(),
        model: geminiService.getModelName(),
        aiAnalysisEnabled: geminiService.isConfigured() || isDemo
      },
      jira: jiraStatus
    });
  },

  // Test Gemini AI connection safely
  testGemini: async (req: Request, res: Response) => {
    try {
      const result = await geminiService.testConnection();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        model: geminiService.getModelName(),
        message: `Gemini connection failed: ${err.message}`
      });
    }
  },

  // Test Jira connection safely
  testJira: async (req: Request, res: Response) => {
    try {
      const result = await jiraService.testConnection();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Jira connection failed: ${err.message}`
      });
    }
  },

  // Save Jira configuration on server
  updateJiraConfig: async (req: Request, res: Response) => {
    const { baseUrl, email, apiToken, projectKey } = req.body;
    const userId = req.user?.id || 'default-user';

    if (!baseUrl || !email || !apiToken) {
      return res.status(400).json({
        success: false,
        message: 'baseUrl, email, and apiToken are required.'
      });
    }

    jiraService.updateConfig({ baseUrl, email, apiToken, projectKey });
    const status = await jiraService.getStatus(userId);

    return res.json({
      success: true,
      message: 'Jira configuration updated on server.',
      status
    });
  }
};
