// 2FA routes — /api/2fa/*
// GET  /api/2fa/enable/:userId    - generate 2FA secret
// POST /api/2fa/verify/:userId    - verify and enable 2FA
// GET  /api/2fa/status/:userId    - check if 2FA is enabled

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

export interface TwoFaDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createTwoFaRouter(deps: TwoFaDeps): Router {
  const router = Router();
  router.use(express.json());

  // Helper: generate TOTP secret
  const generateSecret = () => createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16).toUpperCase();

  // GET /api/2fa/status/:userId
  router.get('/api/2fa/status/:userId', (req: Request, res: Response) => {
    try {
      const row = deps.db.prepare(`SELECT two_fa_secret FROM users WHERE id = ? OR email = ? LIMIT 1`).get(req.params.userId, req.params.userId) as any;
      res.json({ enabled: !!row?.two_fa_secret });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/2fa/enable/:userId
  router.get('/api/2fa/enable/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const secret = generateSecret();
      // Store secret temporarily (not enabled yet)
      deps.db.prepare(`UPDATE users SET two_fa_secret = ? WHERE id = ? OR email = ?`).run(secret, uid, uid);
      // Return provisioning URI for QR code
      const issuer = 'ChinQueCrypto';
      const uri = `otpauth://totp/${issuer}:${uid}?secret=${secret}&issuer=${issuer}`;
      res.json({ secret, uri, message: 'Scan QR code with your authenticator app, then verify' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/2fa/verify/:userId
  router.post('/api/2fa/verify/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const { code } = req.body ?? {};
      if (!code || code.length !== 6) {
        return res.status(400).json({ error: '6-digit code required' });
      }
      // In production, verify TOTP code against secret
      // For now, accept any 6-digit code (dev mode)
      deps.db.prepare(`UPDATE users SET two_fa_enabled = 1, two_fa_secret = NULL WHERE id = ? OR email = ?`).run(uid, uid);
      deps.audit?.(uid, '2fa_enable', '2FA enabled successfully');
      res.json({ ok: true, message: '2FA enabled' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/2fa/disable/:userId
  router.post('/api/2fa/disable/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      deps.db.prepare(`UPDATE users SET two_fa_enabled = 0, two_fa_secret = NULL WHERE id = ? OR email = ?`).run(uid, uid);
      deps.audit?.(uid, '2fa_disable', '2FA disabled');
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
