// Referral routes — /api/referral/*
// GET /api/referral/:userId  - referral stats + code

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';

export interface ReferralDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
}

export function createReferralRouter(deps: ReferralDeps): Router {
  const router = Router();
  router.use(express.json());

  // GET /api/referral/:userId
  router.get('/api/referral/:userId', (req: Request, res: Response) => {
    try {
      const uid = req.params.userId;
      // Get or create referral code
      let codeRow = deps.db.prepare(`SELECT code FROM referrals WHERE referee_id = ? LIMIT 1`).get(uid);
      let code: string;
      if (!codeRow) {
        code = createHash('sha256').update(`${uid}-${Date.now()}`).digest('hex').slice(0, 8).toUpperCase();
        const refId = createHash('sha256').update(`ref-${uid}`).digest('hex').slice(0, 16);
        deps.db.prepare(
          `INSERT INTO referrals (id, referrer_id, referee_id, code, earned_usdt, created_at) VALUES (?, NULL, ?, ?, 0, ?)`
        ).run(refId, uid, code, Date.now());
      } else {
        code = codeRow.code;
      }
      // Count referrals
      const count = deps.db.prepare(`SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = ?`).get(uid) as any;
      // Total earned
      const total = deps.db.prepare(`SELECT COALESCE(SUM(earned_usdt), 0) as total FROM referrals WHERE referrer_id = ?`).get(uid) as any;
      // Recent referrers
      const recent = deps.db.prepare(`
        SELECT r.referee_id, r.earned_usdt, r.created_at, u.email
        FROM referrals r LEFT JOIN users u ON r.referee_id = u.id
        WHERE r.referrer_id = ? ORDER BY r.created_at DESC LIMIT 10
      `).all(uid) as any[];
      res.json({ code, referralCount: count.cnt, totalEarned: total.total, recent });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/referral/:userId/claim — claim referral by code
  router.post('/api/referral/:userId/claim', (req: Request, res: Response) => {
    try {
      const { code } = req.body ?? {};
      if (!code) return res.status(400).json({ error: 'code required' });
      const ref = deps.db.prepare(`SELECT * FROM referrals WHERE code = ? AND referee_id != ? LIMIT 1`).get(code, req.params.userId);
      if (!ref) return res.status(404).json({ error: 'Invalid referral code' });
      if (ref.referrer_id === req.params.userId) return res.status(400).json({ error: 'Cannot refer yourself' });
      // Credit referrer
      deps.db.prepare(`UPDATE referrals SET earned_usdt = earned_usdt + 5.0 WHERE id = ?`).run(ref.id);
      deps.audit?.(req.params.userId, 'referral_claim', `Claimed referral ${code}`);
      res.json({ ok: true, bonus: 5.0 });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
