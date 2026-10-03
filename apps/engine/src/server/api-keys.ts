// API Keys routes — /api/api-keys/*
// GET  /api/api-keys/:userId          - list keys
// POST /api/api-keys/:userId          - create key
// DELETE /api/api-keys/:userId/:keyId  - revoke key

import express, { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'crypto';

export interface ApiKeyDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createApiKeyRouter(deps: ApiKeyDeps): Router {
  const router = Router();
  router.use(express.json());

  // Helper: generate API key
  const generateKey = () => {
    const raw = randomBytes(32).toString('hex');
    return `cq_${raw}`;
  };

  // GET /api/api-keys/:userId
  router.get('/api/api-keys/:userId', (req: Request, res: Response) => {
    try {
      const rows = deps.db.prepare(`
        SELECT id, user_id, name, key_hash, permissions, expires_at, last_used_at, created_at, revoked
        FROM api_keys WHERE user_id = ? AND revoked = 0 ORDER BY created_at DESC
      `).all(req.params.userId) as any[];
      // Don't expose full hash, just prefix
      const result = rows.map(r => ({
        ...r,
        key_preview: r.key_hash.slice(0, 8) + '...',
        key_hash: undefined,
      }));
      res.json({ keys: result });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/api-keys/:userId
  router.post('/api/api-keys/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const { name, permissions, expiresInDays } = req.body ?? {};
      const plainKey = generateKey();
      const keyHash = createHash('sha256').update(plainKey).digest('hex');
      const expiresAt = expiresInDays ? Date.now() + expiresInDays * 86400000 : null;
      const id = createHash('sha256').update(`${uid}-key-${Date.now()}`).digest('hex').slice(0, 16);
      deps.db.prepare(`
        INSERT INTO api_keys (id, user_id, name, key_hash, permissions, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, uid, name || 'API Key', keyHash, JSON.stringify(permissions || { read: true }), expiresAt, Date.now());
      deps.audit?.(uid, 'api_key_create', `Created key ${id}`);
      // Return the plain key ONCE — can't store it
      res.status(201).json({ ok: true, id, key: plainKey, message: 'Save this key — it will not be shown again' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // DELETE /api/api-keys/:userId/:keyId
  router.delete('/api/api-keys/:userId/:keyId', (req: Request, res: Response) => {
    try {
      const info = deps.db.prepare(
        `UPDATE api_keys SET revoked = 1, updated_at = ? WHERE id = ? AND user_id = ? AND revoked = 0`
      ).run(Date.now(), req.params.keyId, req.params.userId);
      if (info.changes === 0) return res.status(404).json({ error: 'Key not found' });
      deps.audit?.(req.params.userId, 'api_key_revoke', `Revoked key ${req.params.keyId}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
