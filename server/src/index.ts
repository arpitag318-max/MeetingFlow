import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import taskRoutes from './routes/task.routes.js';
import jiraRoutes from './routes/jira.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import { geminiService } from './services/gemini.service.js';

const app = express();

// Middleware
app.use(cors({
  origin: [config.appUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach Auth Session & User Isolation Middleware
app.use('/api', authMiddleware);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MeetingFlow Production API',
    mode: req.isDemoUser ? 'demo' : 'real',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    statusReport: {
      supabase: config.supabase.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      googleOAuth: config.google.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      gemini: config.gemini.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      database: config.databaseUrl ? 'CONFIGURED' : 'NOT CONFIGURED',
      jira: config.jira.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
    },
    supabaseConfigured: config.supabase.isConfigured,
    googleConfigured: config.google.isConfigured,
    geminiConfigured: config.gemini.isConfigured,
    geminiModel: config.gemini.model,
    googleRedirectUri: config.google.redirectUri,
    jiraConfigured: config.jira.isConfigured
  });
});

// Server-Side Gemini Diagnostic Health Check
app.get('/api/health/gemini', async (req, res) => {
  if (!config.gemini.isConfigured) {
    return res.status(503).json({
      configured: false,
      error: 'GEMINI_API_KEY is not available to the backend runtime'
    });
  }

  try {
    const testResult = await geminiService.testConnection();
    if (testResult.success) {
      return res.json({
        configured: true,
        provider: 'gemini',
        model: testResult.model,
        status: 'READY'
      });
    } else {
      return res.status(502).json({
        configured: false,
        provider: 'gemini',
        error: testResult.message
      });
    }
  } catch (err: any) {
    return res.status(502).json({
      configured: false,
      provider: 'gemini',
      error: err.message || 'Gemini connection failed'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationRoutes);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 MeetingFlow Production Engine running on port ${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`Supabase: ${config.supabase.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Google OAuth: ${config.google.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Gemini: ${config.gemini.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Database: ${config.databaseUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Jira: ${config.jira.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`=========================================`);
});

export default app;
