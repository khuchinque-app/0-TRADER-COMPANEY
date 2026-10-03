// Authentication middleware for backend API

import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // For now, allow all requests (will add JWT verification later)
  next();
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  // Check if user is admin
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
