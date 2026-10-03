// Recurring invest routes — /api/recurring/*
// GET  /api/recurring/:userId         - list all plans
// POST /api/recurring/:userId         - create plan
// PATCH /api/recurring/:userId/:id    - update plan (pause/resume/edit)
// DELETE /api/recurring/:userId/:id   - cancel plan

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

export interface RecurringDeps {
  db: any; // SQLite handle
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createRecurringRouter(deps: RecurringDeps): Router {
  const router = Router();
  router.use(express.json());

  // GET /api/recurring/:userId
  router.get('/api/recurring/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const plans = deps.db.prepare(
        `SELECT id, user_id, asset, amount, frequency, next_run_at, status, created_at, updated_at
         FROM recurring_plans WHERE user_id = ? ORDER BY created_at DESC`
      ).all(uid) as any[];
      res.json({ plans });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/recurring/:userId
  router.post('/api/recurring/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      const { asset, amount, frequency, nextRunAt } = req.body ?? {};
      if (!asset || !amount || !frequency) {
        return res.status(400).json({ error: 'Missing required fields: asset, amount, frequency' });
      }
      const id = createHash('sha256').update(`${uid}-${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16);
      const now = Date.now();
      deps.db.prepare(`
        INSERT INTO recurring_plans (id, user_id, asset, amount, frequency, next_run_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(id, uid, asset, amount, frequency, nextRunAt || now + 86400000, now, now);
      deps.audit?.(uid, 'recurring_create', `Created plan ${id} ${amount} ${asset}/${frequency}`);
      res.status(201).json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // PATCH /api/recurring/:userId/:id
  router.patch('/api/recurring/:userId/:id', (req: Request, res: Response) => {
    try {
      const { status, amount, frequency } = req.body ?? {};
      const sets: string[] = [];
      const vals: any[] = [];
      if (status) { sets.push('status = ?'); vals.push(status); }
      if (amount !== undefined) { sets.push('amount = ?'); vals.push(amount); }
      if (frequency) { sets.push('frequency = ?'); vals.push(frequency); }
      if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
      sets.push('updated_at = ?');
      vals.push(Date.now());
      vals.push(req.params.id);
      deps.db.prepare(`UPDATE recurring_plans SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, req.params.userId);
      deps.audit?.(req.params.userId, 'recurring_update', `Updated plan ${req.params.id}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // DELETE /api/recurring/:userId/:id
  router.delete('/api/recurring/:userId/:id', (req: Request, res: Response) => {
    try {
      const stmt = deps.db.prepare(`DELETE FROM recurring_plans WHERE id = ? AND user_id = ?`);
      const info = stmt.run(req.params.id, req.params.userId);
      if (info.changes === 0) return res.status(404).json({ error: 'Plan not found' });
      deps.audit?.(req.params.userId, 'recurring_delete', `Deleted plan ${req.params.id}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
