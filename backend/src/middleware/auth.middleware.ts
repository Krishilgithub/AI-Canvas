import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

export interface AuthRequest extends Request {
  user?: any;
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

    // specific method to get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth Error:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Exception:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
};
