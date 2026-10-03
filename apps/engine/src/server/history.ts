// History / fills routes — /api/history/*
// GET /api/history/:userId?limit=100  - recent fills/trades

import express, { Router, type Request, type Response } from 'express';

export interface HistoryDeps {
  db: any;
}

export function createHistoryRouter(deps: HistoryDeps): Router {
  const router = Router();
  router.use(express.json());

  // GET /api/history/:userId
  router.get('/api/history/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const fills = deps.db.prepare(`
        SELECT f.id, f.order_id, f.pair, f.side, f.price, f.quantity, f.fee, f.fee_asset, f.timestamp
        FROM fills f WHERE f.user_id = ? ORDER BY f.timestamp DESC LIMIT ?
      `).all(uid, limit) as any[];
      const orders = deps.db.prepare(`
        SELECT id, pair, side, type, price, quantity, filled_quantity, status, created_at as timestamp
        FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
      `).all(uid, limit) as any[];
      res.json({ fills, orders });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
