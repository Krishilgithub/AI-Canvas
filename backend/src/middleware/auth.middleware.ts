import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

// ─── Typed user shape from Supabase auth.getUser() ───────────────────────────
// FIX: was typed as `any` — now uses the Supabase User type to surface
// type errors at compile time and remove implicit any throughout all controllers.
export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Malformed authorization header' });
    }

    // ── Support AI Canvas platform API keys (sk_live_...) as Bearer tokens ──
    if (token.startsWith('sk_live_')) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('api_key', token)
        .single();

      if (error || !profile) {
        return res.status(401).json({ error: 'Invalid AI Canvas API key' });
      }

      req.user = {
        id: profile.id,
        email: profile.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '',
      } as AuthenticatedUser;
      return next();
    }

    // ── Standard Supabase JWT ────────────────────────────────────────────────
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth] Token validation failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach typed user to request
    req.user = user as AuthenticatedUser;
    next();
  } catch (error) {
    console.error('[Auth] Middleware exception:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
};

