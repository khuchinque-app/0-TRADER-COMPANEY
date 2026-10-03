// Address management routes — /api/addresses/*
// GET  /api/addresses/:userId              - list addresses
// POST /api/addresses/:userId              - add address
// GET  /api/addresses/:userId/whitelist    - list withdrawal whitelist
// POST /api/addresses/:userId/whitelist    - add to whitelist
// DELETE /api/addresses/:userId/whitelist/:addr - remove from whitelist

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

export interface AddressDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createAddressRouter(deps: AddressDeps): Router {
  const router = Router();
  router.use(express.json());

  // GET /api/addresses/:userId
  router.get('/api/addresses/:userId', (req: Request, res: Response) => {
    try {
      const rows = deps.db.prepare(
        `SELECT id, user_id, asset, address, tag, created_at FROM deposit_addresses WHERE user_id = ? ORDER BY created_at DESC`
      ).all(req.params.userId) as any[];
      res.json({ addresses: rows });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/addresses/:userId
  router.post('/api/addresses/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const { asset, address, tag } = req.body ?? {};
      if (!asset || !address) {
        return res.status(400).json({ error: 'asset and address required' });
      }
      const id = createHash('sha256').update(`${uid}-${address}-${Date.now()}`).digest('hex').slice(0, 16);
      const now = Date.now();
      deps.db.prepare(
        `INSERT OR IGNORE INTO deposit_addresses (id, user_id, asset, address, tag, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, uid, asset, address, tag || null, now);
      deps.audit?.(uid, 'address_add', `Added address ${address} for ${asset}`);
      res.status(201).json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/addresses/:userId/whitelist
  router.get('/api/addresses/:userId/whitelist', (req: Request, res: Response) => {
    try {
      const rows = deps.db.prepare(
        `SELECT id, user_id, asset, address, created_at FROM withdrawal_whitelist WHERE user_id = ? ORDER BY created_at DESC`
      ).all(req.params.userId) as any[];
      res.json({ whitelist: rows });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/addresses/:userId/whitelist
  router.post('/api/addresses/:userId/whitelist', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const { asset, address } = req.body ?? {};
      if (!asset || !address) {
        return res.status(400).json({ error: 'asset and address required' });
      }
      const id = createHash('sha256').update(`${uid}-wl-${address}-${Date.now()}`).digest('hex').slice(0, 16);
      deps.db.prepare(
        `INSERT OR IGNORE INTO withdrawal_whitelist (id, user_id, asset, address, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(id, uid, asset, address, Date.now());
      deps.audit?.(uid, 'whitelist_add', `Added whitelist addr ${address} for ${asset}`);
      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // DELETE /api/addresses/:userId/whitelist/:addr
  router.delete('/api/addresses/:userId/whitelist/:addr', (req: Request, res: Response) => {
    try {
      const info = deps.db.prepare(
        `DELETE FROM withdrawal_whitelist WHERE user_id = ? AND address = ?`
      ).run(req.params.userId, req.params.addr);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      deps.audit?.(req.params.userId, 'whitelist_remove', `Removed whitelist addr ${req.params.addr}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
