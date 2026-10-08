import { Request, Response, NextFunction } from 'express';
import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';
import { User } from '../types/index.js';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isDemoUser?: boolean;
    }
  }
}

import { getSupabaseAdmin } from '../lib/supabase.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check headers: Authorization Bearer token or x-user-id header
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  let tokenOrId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenOrId = authHeader.substring(7).trim();
  } else if (userIdHeader) {
    tokenOrId = userIdHeader.trim();
  }

  // If Demo Mode header is passed explicitly, or if user token is demo
  const isDemoHeader = req.headers['x-demo-mode'] === 'true' || req.query.demo === 'true';

  if (tokenOrId === 'demo-user-id' || isDemoHeader || tokenOrId?.startsWith('demo')) {
    req.user = demoStore.currentUser;
    req.isDemoUser = true;
    return next();
  }

  if (tokenOrId) {
    // 1. Check local persistent DB directly by ID
    const user = persistentDb.getUserById(tokenOrId);
    if (user) {
      req.user = user;
      req.isDemoUser = false;
      return next();
    }

    // 2. Check Supabase Auth JWT
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.getUser(tokenOrId);
        if (data?.user && !error) {
          const supaUser = data.user;
          const existing = persistentDb.getUserByEmail(supaUser.email || '') || persistentDb.getUserById(supaUser.id);
          const localUser = persistentDb.upsertUser({
            id: existing?.id || supaUser.id,
            email: supaUser.email || '',
            name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
            avatarUrl: supaUser.user_metadata?.avatar_url || undefined,
            googleTokens: existing?.googleTokens
          });

          req.user = localUser;
          req.isDemoUser = false;
          return next();
        }
      } catch {
        // Fallback
      }
    }
  }

  // If no user found, leave req.user undefined so endpoints can handle unauthorized appropriately
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in with your Google account.'
    });
  }
  next();
}
