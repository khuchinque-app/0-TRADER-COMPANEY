// Security routes — /api/security/*
// PATCH /api/security/password  - change password

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

export interface SecurityDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createSecurityRouter(deps: SecurityDeps): Router {
  const router = Router();
  router.use(express.json());

  // PATCH /api/security/password
  router.patch('/api/security/password', (req: Request, res: Response) => {
    try {
      const uid = (req as any).userId || req.params.userId;
      const { currentPassword, newPassword } = req.body ?? {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword and newPassword required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      // Get current user
      const user = deps.db.prepare(`SELECT id, password_hash FROM users WHERE id = ? OR email = ? LIMIT 1`).get(uid, uid);
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Verify current password (simple hash compare — in production use bcrypt)
      const currentHash = createHash('sha256').update(currentPassword).digest('hex');
      if (user.password_hash !== currentHash) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      // Update password
      const newHash = createHash('sha256').update(newPassword).digest('hex');
      deps.db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(newHash, Date.now(), user.id);
      deps.audit?.(user.id, 'password_change', 'Password changed successfully');
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
