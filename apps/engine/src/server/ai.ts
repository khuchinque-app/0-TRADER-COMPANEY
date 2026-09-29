// Invest in AI — spec C: Invest in AI → /api/ai/* (ai-invest-service).
// The founder's differentiator: AI-assisted allocation on top of the venue.
// Paper venue: a subscription debits the real ledger into a recorded AI plan
// slot; performance is SIMULASI — no real strategy runs, no real payout.
// Idempotency-Key REQUIRED (spec D lists /api/ai/subscribe); the derived entry
// id namespaces user + hashes key, so a replay cannot double-debit.

import express, { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import type { Ledger } from '../ledger/ledger';
import { mockAuth, AUTH_ENABLED } from './auth';
import type { AuditEvent } from '../auth/service';

export interface AiStrategy {
  id: string;
  name: string;
  blurb: string;
  risk: 'low' | 'medium' | 'high';
  targetApy: number;      // percent, SIMULASI
  assets: string[];       // target universe
  minAmount: number;      // USDT
}

// SIMULASI strategy book. Targets are illustrative, not advice, not a promise.
export const AI_STRATEGIES: AiStrategy[] = [
  {
    id: 'ai-stable', name: 'AI Stable Yield', risk: 'low', targetApy: 6.5, minAmount: 25,
    assets: ['USDT'], blurb: 'Capital-preserving rotation across the staking book.',
  },
  {
    id: 'ai-momentum', name: 'AI Momentum', risk: 'medium', targetApy: 18.0, minAmount: 50,
    assets: ['BTC', 'ETH', 'SOL'], blurb: 'Trend-following allocation weighted by live indicator reads.',
  },
  {
    id: 'ai-alt', name: 'AI Alt Explorer', risk: 'high', targetApy: 42.0, minAmount: 100,
    assets: ['SOL', 'LINK', 'AAVE', 'XRP'], blurb: 'Higher-volatility baskets, rebalanced on signal shifts.',
  },
];

const STRATEGY_BY_ID = new Map(AI_STRATEGIES.map((s) => [s.id, s]));

function aiEntryId(uid: string, key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 24);
  return `ai_${uid}_${h}`.slice(0, 100);
}

export interface AiDeps {
  ledger: Ledger;
  db: { prepare(sql: string): { get(...a: unknown[]): unknown; all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown } };
  audit: (userId: string, event: AuditEvent, detail: string) => void;
}

interface SubRow {
  id: string; user_id: string; strategy_id: string; asset: string;
  amount: number; target_apy: number; status: string; created_at: number;
}

export function createAiRouter(deps: AiDeps): Router {
  const { ledger, db } = deps;
  const router = Router();
  router.use(express.json());

  const identity = (req: Request, res: Response, bodyUser?: unknown): string | null => {
    const uid = AUTH_ENABLED ? (req as any).userId : String(bodyUser ?? req.query.userId ?? '');
    if (AUTH_ENABLED && bodyUser !== undefined && bodyUser !== uid) {
      res.status(403).json({ error: 'userId does not match session', simulasi: true });
      return null;
    }
    if (!uid) { res.status(400).json({ error: 'userId required', simulasi: true }); return null; }
    return uid;
  };

  const idemKey = (req: Request, res: Response): string | null => {
    const k = req.header('Idempotency-Key');
    if (!k || k.length > 200 || !/^[\w:-]+$/.test(k)) {
      res.status(400).json({ error: 'Idempotency-Key header is required (<=200 chars, [\\w:-])', simulasi: true });
      return null;
    }
    return k;
  };

  // GET /api/ai/strategies — public strategy book
  router.get('/api/ai/strategies', (_req: Request, res: Response) => {
    res.json({ strategies: AI_STRATEGIES, simulasi: true });
  });

  // GET /api/ai/subscriptions?userId=
  router.get('/api/ai/subscriptions', mockAuth, (req: Request, res: Response) => {
    const uid = identity(req, res, (req as any).userId ?? undefined);
    if (!uid) return;
    const rows = db.prepare(
      'SELECT id, user_id, strategy_id, asset, amount, target_apy, status, created_at FROM ai_subscriptions WHERE user_id = ? ORDER BY created_at DESC'
    ).all(uid) as SubRow[];
    res.json({ subscriptions: rows, simulasi: true });
  });

  // POST /api/ai/subscribe { userId, strategyId, amount } — money mover.
  router.post('/api/ai/subscribe', mockAuth, async (req: Request, res: Response) => {
    const key = idemKey(req, res);
    if (!key) return;
    try {
      const { userId, strategyId, amount } = req.body ?? {};
      const uid = identity(req, res, userId);
      if (!uid) return;
      const strategy = STRATEGY_BY_ID.get(String(strategyId));
      if (!strategy) { res.status(400).json({ error: `unknown strategy: ${strategyId}`, simulasi: true }); return; }
      const n = typeof amount === 'number' ? amount : Number(amount);
      if (!Number.isFinite(n) || n <= 0 || n > 1e12) {
        res.status(400).json({ error: 'amount must be a positive number', simulasi: true }); return;
      }
      if (n < strategy.minAmount) {
        res.status(422).json({ error: `minimum for ${strategy.name} is ${strategy.minAmount} USDT`, simulasi: true }); return;
      }

      const entryId = aiEntryId(uid, key);
      const existing = db.prepare('SELECT id FROM ai_subscriptions WHERE entry_id = ?').get(entryId) as { id: string } | undefined;
      if (existing) {
        res.status(201).set('Idempotent-Replay', 'true').json({ ok: true, subscriptionId: existing.id, replayed: true, simulasi: true });
        return;
      }

      try { await ledger.getAccount(uid); } catch (e) {
        if ((e as Error).message.startsWith('Account not found')) await ledger.initializeDemoAccount(uid);
        else throw e;
      }
      const avail = ledger.getBalanceSync(uid, 'USDT');
      if (avail < n) { res.status(422).json({ error: 'Insufficient USDT balance', simulasi: true }); return; }

      const posted = await ledger.postExternal(entryId, uid, 'USDT', n, 'withdraw');
      if (!posted) {
        res.status(201).set('Idempotent-Replay', 'true').json({ ok: true, replayed: true, simulasi: true });
        return;
      }
      const subscriptionId = `aisub_${randomBytes(8).toString('hex')}`;
      db.prepare(
        `INSERT INTO ai_subscriptions (id, user_id, strategy_id, asset, amount, target_apy, status, entry_id, created_at)
         VALUES (?, ?, ?, 'USDT', ?, ?, 'active', ?, ?)`
      ).run(subscriptionId, uid, strategy.id, n, strategy.targetApy, entryId, Date.now());
      deps.audit(uid, 'ai_subscribe', `${n} USDT strategy=${strategy.id} subscription=${subscriptionId}`);
      res.status(201).json({ ok: true, subscriptionId, strategy, amount: n, simulasi: true });
    } catch (e) {
      console.error('[AI] subscribe error:', e);
      res.status(500).json({ error: 'Internal error', simulasi: true });
    }
  });

  return router;
}
