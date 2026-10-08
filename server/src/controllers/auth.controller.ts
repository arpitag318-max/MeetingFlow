import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';
import { googleService } from '../services/google.service.js';

export const authController = {
  // Save Google OAuth Credentials on server & persist to .env
  updateGoogleConfig: (req: Request, res: Response) => {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Both Google Client ID and Google Client Secret are required.'
      });
    }

    const trimmedClientId = String(clientId).trim();
    const trimmedSecret = String(clientSecret).trim();
    const trimmedRedirect = redirectUri ? String(redirectUri).trim() : config.google.redirectUri;

    // Update in-memory environment variables
    process.env.GOOGLE_CLIENT_ID = trimmedClientId;
    process.env.GOOGLE_CLIENT_SECRET = trimmedSecret;
    if (trimmedRedirect) {
      process.env.GOOGLE_REDIRECT_URI = trimmedRedirect;
    }

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

      content = updateKey(content, 'GOOGLE_CLIENT_ID', trimmedClientId);
      content = updateKey(content, 'GOOGLE_CLIENT_SECRET', trimmedSecret);
      content = updateKey(content, 'GOOGLE_REDIRECT_URI', trimmedRedirect);

      fs.writeFileSync(targetEnv, content, 'utf-8');
    } catch (fsErr) {
      console.warn('Notice: Could not write credentials to .env file:', fsErr);
    }

    try {
      const url = googleService.getAuthUrl();
      return res.json({
        success: true,
        message: 'Google OAuth credentials configured successfully.',
        authUrl: url
      });
    } catch (err: any) {
      return res.json({
        success: true,
        message: 'Google OAuth credentials saved.'
      });
    }
  },

  // Get Current User Profile (Real or Demo)
  getMe: (req: Request, res: Response) => {
    if (req.user) {
      const hasGoogle = Boolean(
        req.user.googleTokens?.access_token &&
        (req.user.googleTokens?.refresh_token || req.user.googleTokens?.scope?.includes('calendar'))
      );
      return res.json({
        success: true,
        user: req.user,
        isDemoMode: Boolean(req.isDemoUser),
        isGoogleConnected: hasGoogle
      });
    }

    return res.status(401).json({
      success: false,
      user: null,
      isDemoMode: false,
      isGoogleConnected: false,
      message: 'Not authenticated. Please sign in with Google or explore Demo Mode.'
    });
  },

  // Google OAuth URL Trigger
  getGoogleAuthUrl: (req: Request, res: Response) => {
    try {
      const state = req.user?.id || (req.query.userId as string) || undefined;
      const url = googleService.getAuthUrl(state);
      return res.json({ success: true, url });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  },

  // Real Google OAuth Callback (GET redirect from Google)
  googleCallbackGet: async (req: Request, res: Response) => {
    const { code, error, state } = req.query;

    if (error) {
      console.error('Google OAuth redirect error:', error);
      return res.redirect(`${config.appUrl}/login?error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${config.appUrl}/login?error=missing_code`);
    }

    try {
      const tokens = await googleService.getTokensFromCode(code as string);
      const profile = await googleService.getUserProfile(tokens);

      const user = persistentDb.upsertUser({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        googleTokens: tokens
      });

      // If state is set to an existing userId (e.g. Supabase user), also link tokens to that user!
      if (state && typeof state === 'string' && state !== user.id) {
        persistentDb.updateUserGoogleTokens(state, tokens);
      }

      // Synchronize live meetings from Google Calendar upon login
      try {
        const liveMeetings = await googleService.fetchLiveCalendarEvents(tokens, user.id);
        persistentDb.syncGoogleCalendarMeetings(user.id, liveMeetings);
      } catch (calErr: any) {
        console.warn('Initial calendar sync notice:', calErr.message);
      }

      // Redirect browser to frontend AuthCallbackPage with sessionToken
      return res.redirect(`${config.appUrl}/auth/callback?sessionToken=${encodeURIComponent(user.id)}`);
    } catch (err: any) {
      console.error('Google OAuth GET callback error:', err);
      return res.redirect(`${config.appUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
  },

  // Synchronize Google OAuth token passed from Supabase client session
  syncGoogleToken: async (req: Request, res: Response) => {
    const { providerToken, providerRefreshToken } = req.body;
    if (!providerToken) {
      return res.status(400).json({ success: false, message: 'providerToken is required' });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const tokens: any = {
      access_token: providerToken,
      token_type: 'Bearer'
    };
    if (providerRefreshToken) {
      tokens.refresh_token = providerRefreshToken;
    }

    persistentDb.updateUserGoogleTokens(req.user.id, tokens);
    req.user.googleTokens = tokens;

    try {
      const liveMeetings = await googleService.fetchLiveCalendarEvents(tokens, req.user.id);
      persistentDb.syncGoogleCalendarMeetings(req.user.id, liveMeetings);
    } catch (calErr: any) {
      console.warn('Sync notice after token sync:', calErr.message);
    }

    return res.json({
      success: true,
      message: 'Google OAuth token synchronized with server.',
      isGoogleConnected: true
    });
  },

  // Real Google OAuth Callback (POST from frontend SPA)
  googleCallbackPost: async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required.' });
    }

    try {
      const tokens = await googleService.getTokensFromCode(code as string);
      const profile = await googleService.getUserProfile(tokens);

      const user = persistentDb.upsertUser({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        googleTokens: tokens
      });

      // Synchronize live meetings from Google Calendar upon login
      try {
        const liveMeetings = await googleService.fetchLiveCalendarEvents(tokens, user.id);
        persistentDb.syncGoogleCalendarMeetings(user.id, liveMeetings);
      } catch (calErr) {
        console.warn('Initial calendar sync notice:', calErr);
      }

      return res.json({
        success: true,
        user,
        sessionToken: user.id,
        isDemoMode: false,
        message: `Welcome, ${user.name}! Connected with Google Workspace.`
      });
    } catch (err: any) {
      console.error('Google OAuth callback error:', err);
      return res.status(500).json({
        success: false,
        message: `Google authentication failed: ${err.message}`
      });
    }
  },

  // Alias for backward compatibility
  googleCallback: async (req: Request, res: Response) => {
    if (req.method === 'GET') {
      return authController.googleCallbackGet(req, res);
    }
    return authController.googleCallbackPost(req, res);
  },

  // Explicit Demo Mode Login (isolated from real user data)
  demoLogin: (req: Request, res: Response) => {
    return res.json({
      success: true,
      user: demoStore.currentUser,
      sessionToken: 'demo-user-id',
      isDemoMode: true,
      message: 'Entered Demo Mode sandbox with sample meetings.'
    });
  }
};
