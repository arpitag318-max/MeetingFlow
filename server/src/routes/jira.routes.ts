import { Router } from 'express';
import { jiraController } from '../controllers/jira.controller.js';

const router = Router();

// OAuth 2.0 (3LO) Authentication
router.get('/oauth/url', jiraController.getOAuthUrl);
router.post('/oauth/config', jiraController.updateOAuthConfig);
router.get('/oauth/callback', jiraController.handleOAuthCallback);

// Integration Status & Disconnect
router.get('/status', jiraController.getStatus);
router.post('/disconnect', jiraController.disconnect);

// Sites & Configuration
router.get('/sites', jiraController.getSites);
router.post('/sites/select', jiraController.selectSite);
router.get('/projects', jiraController.getProjects);
router.get('/issue-types', jiraController.getIssueTypes);
router.get('/users', jiraController.getUsers);
router.post('/config', jiraController.saveConfig);

// Search & Duplicate Matching
router.get('/search', jiraController.searchIssues);
router.post('/issues/match', jiraController.matchIssue);

// Issues & Links
router.post('/issues', jiraController.createIssue);
router.post('/issues/bulk', jiraController.createBulk);
router.post('/issues/link', jiraController.linkIssue);
router.delete('/issues/link/:actionItemId', jiraController.unlinkIssue);
router.get('/issues/:issueKey', jiraController.getIssue);
router.post('/issues/:issueKey/sync', jiraController.syncStatus);

// Linked Work Overview & Metrics
router.get('/work', jiraController.getLinkedWork);

export default router;
