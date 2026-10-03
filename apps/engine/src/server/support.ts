// Support routes — /api/support/*
// GET  /api/support/faq           - get FAQ
// GET  /api/support/tickets/:userId  - list tickets
// POST /api/support/tickets/:userId  - create ticket
// PATCH /api/support/tickets/:userId/:id  - update ticket status

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

const FAQ_DATA = [
  { q: '如何充值？', a: '进入钱包页面，选择支付方式进行充值。' },
  { q: '提现需要多长时间？', a: '通常 5-30 分钟内到账。' },
  { q: '交易手续费是多少？', a: 'Maker 0.1%，Taker 0.1%。' },
  { q: '如何启用 2FA？', a: '在安全设置页面启用双重验证。' },
];

export interface SupportDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createSupportRouter(deps: SupportDeps): Router {
  const router = Router();
  router.use(express.json());

  router.get('/api/support/faq', (_req: Request, res: Response) => {
    res.json({ faq: FAQ_DATA });
  });

  router.get('/api/support/tickets/:userId', (req: Request, res: Response) => {
    try {
      const tickets = deps.db.prepare(`
        SELECT id, user_id, subject, message, status, category, created_at, updated_at
        FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC
      `).all(req.params.userId) as any[];
      res.json({ tickets });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/api/support/tickets/:userId', (req: Request, res: Response) => {
    try {
      const { subject, message, category } = req.body ?? {};
      if (!subject || !message) return res.status(400).json({ error: 'subject and message required' });
      const id = createHash('sha256').update(`${req.params.userId}-ticket-${Date.now()}`).digest('hex').slice(0, 16);
      const now = Date.now();
      deps.db.prepare(`
        INSERT INTO support_tickets (id, user_id, subject, message, status, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'open', ?, ?, ?)
      `).run(id, req.params.userId, subject, message, category || 'general', now, now);
      deps.audit?.(req.params.userId, 'support_ticket', `Created ticket ${id}`);
      res.status(201).json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.patch('/api/support/tickets/:userId/:id', (req: Request, res: Response) => {
    try {
      const { status, reply } = req.body ?? {};
      const sets: string[] = [];
      const vals: any[] = [];
      if (status) { sets.push('status = ?'); vals.push(status); }
      if (reply) { sets.push('message = message || \\n---\\n--- Admin: ' + reply); }
      sets.push('updated_at = ?');
      vals.push(Date.now());
      vals.push(req.params.id);
      deps.db.prepare(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
