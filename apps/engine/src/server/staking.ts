// Staking service — spec route map: Staking → /api/staking/*.
// Paper venue: subscriptions debit the real SQLite double-entry ledger
// (postExternal) into a recorded position; rewards accrue as SIMULASI only —
// no chain, no real yield. Idempotency-Key is REQUIRED on subscribe (spec D:
// /api/staking/subscribe is on the money-moving list), and the derived entry
// id namespaces the user + hashes the key so a replay cannot double-debit and
// two users reusing one key stay separate intents (same pattern as wallet.ts).

import express, { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import type { Ledger } from '../ledger/ledger';
import type { Asset } from '@trading/shared';
import { mockAuth, AUTH_ENABLED } from './auth';
import type { AuditEvent } from '../auth/service';

export interface StakingPlan {
  id: string;
  name: string;
  asset: string;
  apy: number;        // percent, SIMULASI
  lockDays: number;   // 0 = flexible
  minAmount: number;
}

// SIMULASI plan book (no real yield). Rates are illustrative, not advice.
export const STAKING_PLANS: StakingPlan[] = [
  { id: 'usdt-flex', name: 'Flexible USDT', asset: 'USDT', apy: 5.2, lockDays: 0, minAmount: 10 },
  { id: 'usdt-30', name: 'USDT 30-day', asset: 'USDT', apy: 7.4, lockDays: 30, minAmount: 50 },
  { id: 'eth-30', name: 'ETH 30-day', asset: 'ETH', apy: 4.1, lockDays: 30, minAmount: 0.005 },
  { id: 'sol-60', name: 'SOL 60-day', asset: 'SOL', apy: 9.8, lockDays: 60, minAmount: 0.1 },
];

const PLAN_BY_ID = new Map(STAKING_PLANS.map((p) => [p.id, p]));

function stakingEntryId(uid: string, key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 24);
  return `stk_${uid}_${h}`.slice(0, 100);
}

export interface StakingDeps {
  ledger: Ledger;
  /** Shared SQLite handle (positions table) — no reaching into ledger internals. */
  db: { prepare(sql: string): { get(...a: unknown[]): unknown; all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown } };
  audit: (userId: string, event: AuditEvent, detail: string) => void;
}

interface PositionRow {
  id: string; user_id: string; plan_id: string; asset: string;
  amount: number; apy: number; status: string; created_at: number;
}

export function createStakingRouter(deps: StakingDeps): Router {
  const { ledger, db } = deps;
  const router = Router();
  router.use(express.json());

  const identity = (req: Request, res: Response, bodyUser?: unknown): string | null => {
    const uid = AUTH_ENABLED ? (req as any).userId : String(bodyUser ?? req.query.userId ?? '');
    if (AUTH_ENABLED && bodyUser !== undefined && bodyUser !== uid) {
      res.status(403).json({ error: 'userId does not match session', simulasi: true });
      return null;
    }
    if (!uid) {
      res.status(400).json({ error: 'userId required', simulasi: true });
      return null;
    }
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

  // GET /api/staking/plans — public plan book (no identity needed)
  router.get('/api/staking/plans', (_req: Request, res: Response) => {
    res.json({ plans: STAKING_PLANS, simulasi: true });
  });

  // GET /api/staking/positions?userId=  (session-scoped under AUTH_ENABLED)
  router.get('/api/staking/positions', mockAuth, (req: Request, res: Response) => {
    const uid = identity(req, res, (req as any).userId ?? undefined);
    if (!uid) return;
    const rows = db.prepare(
      'SELECT id, user_id, plan_id, asset, amount, apy, status, created_at FROM staking_positions WHERE user_id = ? ORDER BY created_at DESC'
    ).all(uid) as PositionRow[];
    res.json({ positions: rows, simulasi: true });
  });

  // POST /api/staking/subscribe { userId, planId, amount } — money mover.
  router.post('/api/staking/subscribe', mockAuth, async (req: Request, res: Response) => {
    const key = idemKey(req, res);
    if (!key) return;
    try {
      const { userId, planId, amount } = req.body ?? {};
      const uid = identity(req, res, userId);
      if (!uid) return;
      const plan = PLAN_BY_ID.get(String(planId));
      if (!plan) { res.status(400).json({ error: `unknown plan: ${planId}`, simulasi: true }); return; }
      const n = typeof amount === 'number' ? amount : Number(amount);
      if (!Number.isFinite(n) || n <= 0 || n > 1e12) {
        res.status(400).json({ error: 'amount must be a positive number', simulasi: true }); return;
      }
      if (n < plan.minAmount) {
        res.status(422).json({ error: `minimum for ${plan.name} is ${plan.minAmount} ${plan.asset}`, simulasi: true }); return;
      }

      const entryId = stakingEntryId(uid, key);
      const existing = db.prepare('SELECT id FROM staking_positions WHERE entry_id = ?').get(entryId) as { id: string } | undefined;
      if (existing) {
        res.status(201).set('Idempotent-Replay', 'true').json({ ok: true, positionId: existing.id, replayed: true, simulasi: true });
        return;
      }

      // ensure the demo account exists before the debit
      try { await ledger.getAccount(uid); } catch (e) {
        if ((e as Error).message.startsWith('Account not found')) await ledger.initializeDemoAccount(uid);
        else throw e;
      }
      const avail = ledger.getBalanceSync(uid, plan.asset as Asset);
      if (avail < n) {
        res.status(422).json({ error: `Insufficient ${plan.asset} balance`, simulasi: true }); return;
      }

      const posted = await ledger.postExternal(entryId, uid, plan.asset as Asset, n, 'withdraw');
      if (!posted) {
        res.status(201).set('Idempotent-Replay', 'true').json({ ok: true, replayed: true, simulasi: true });
        return;
      }
      const positionId = `pos_${randomBytes(8).toString('hex')}`;
      db.prepare(
        `INSERT INTO staking_positions (id, user_id, plan_id, asset, amount, apy, status, entry_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      ).run(positionId, uid, plan.id, plan.asset, n, plan.apy, entryId, Date.now());
      deps.audit(uid, 'staking_subscribe', `${n} ${plan.asset} plan=${plan.id} position=${positionId}`);
      res.status(201).json({ ok: true, positionId, plan, amount: n, simulasi: true });
    } catch (e) {
      console.error('[STAKING] subscribe error:', e);
      res.status(500).json({ error: 'Internal error', simulasi: true });
    }
  });

  return router;
}
