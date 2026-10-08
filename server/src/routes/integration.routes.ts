import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller.js';
import { jiraController } from '../controllers/jira.controller.js';

const router = Router();

router.get('/status', integrationController.getStatus);
router.post('/test-gemini', integrationController.testGemini);
router.post('/test-jira', integrationController.testJira);
router.post('/jira/config', integrationController.updateJiraConfig);

// Jira OAuth Integration routes
router.get('/jira/connect', jiraController.getOAuthUrl);
router.get('/jira/callback', jiraController.handleOAuthCallback);
router.post('/jira/disconnect', jiraController.disconnect);

export default router;
