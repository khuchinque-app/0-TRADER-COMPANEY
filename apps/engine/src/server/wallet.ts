// Wallet routes — spec route map: Wallet → /api/wallet/* (ledger-service).
// Paper venue: deposits/withdrawals are journal mutations, SIMULASI only —
// no chain. Idempotency-Key is REQUIRED on both POSTs (spec D money rule);
// the key seeds the deterministic journal entry id, so a replayed request
// cannot double-credit (INSERT OR IGNORE / unique PK) — same pattern as
// demo deposits (dep_<account>_<asset>).
//
// Double-entry fit (ADR 0001 + Reconciler replay):
//   deposit  = debit-only line (external source, mirrors postDeposit)
//   withdraw = credit-only line (external sink; replay deducts it)
// Balance guard: withdrawal must fit available+locked units; we deduct from
// available and reconciliation's negative-balance check is the backstop.

import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'crypto';
import type { Ledger } from '../ledger/ledger';
import type { Asset } from '@trading/shared';
import { ASSET_SHORTLIST } from '@trading/shared';
import { mockAuth, AUTH_ENABLED } from './auth';
import type { AuditEvent } from '../auth/service';
import { createRateLimiter, ipKey, userKey } from './rate-limit';

const ASSETS = new Set<string>(['USDT', ...ASSET_SHORTLIST]);

// Entry id namespaces the USER into the key: two accounts reusing the same
// Idempotency-Key string are different intents (a global key would silently
// swallow the second user's movement). The key is HASHED, not truncated —
// truncation lets two long distinct keys collide on the 100-char prefix.
function externalEntryId(prefix: 'wdp' | 'wwd', uid: string, key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 24);
  return `${prefix}_${uid}_${h}`.slice(0, 100);
}

export interface WalletDeps {
  ledger: Ledger;
  /** Audit insert seam (spec D: a row on every ledger mutation). */
  audit: (userId: string, event: AuditEvent, detail: string) => void;
}

export function createWalletRouter(deps: WalletDeps): Router {
  const { ledger } = deps;
  const router = Router();
  // Sub-app middleware is not shared with the parent express app — parse here.
  router.use(express.json());

  // spec D gap: rate limit per USER and per IP on the WITHDRAW route (money
  // out). Its own 'withdraw' namespace: draining the order quota must not
  // block withdrawals or vice versa. userKey prefers the verified session id,
  // so a forged :userId path cannot burn another account's quota.
  const withdrawRateLimit = createRateLimiter({
    namespace: 'withdraw',
    refillEnv: 'RATE_LIMIT_REFILL_MS',
    defaultRefillMs: 3000,
    dimensions: [
      { name: 'user', key: userKey, burstEnv: 'RATE_LIMIT_USER_BURST', defaultBurst: 20 },
      { name: 'ip', key: ipKey, burstEnv: 'RATE_LIMIT_IP_BURST', defaultBurst: 60 },
    ],
    extraBody: { simulasi: true },
  });

  // Identity: mirrors orders.ts — when auth is ON, the session wins and the
  // body/param userId must match it (prevents moving another user's funds).
  const identity = (req: Request, res: Response): string | null => {
    const uid = req.params.userId;
    if (AUTH_ENABLED && (req as any).userId !== uid) {
      res.status(403).json({ error: 'userId does not match session', simulasi: true });
      return null;
    }
    return uid;
  };

  const idemKey = (req: Request, res: Response): string | null => {
    const k = req.header('Idempotency-Key');
    if (!k || k.length > 200 || !/^[\w:-]+$/.test(k)) {
      res.status(400).json({ error: 'Idempotency-Key header is required (<=200 chars, [\w:-])', simulasi: true });
      return null;
    }
    return k;
  };

  const parseAmount = (raw: unknown): number | null => {
    if (typeof raw !== 'number' && typeof raw !== 'string') return null; // blocks ['500']-style coercion
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 1e12) return null;
    return n;
  };

  // GET /api/wallet/:userId — balances + mark-to-market total (auto-init demo)
  router.get('/api/wallet/:userId', async (req, res) => {
    try {
      const uid = req.params.userId;
      let account;
      try {
        account = await ledger.getAccount(uid);
      } catch (e) {
        if (!(e as Error).message.startsWith('Account not found')) throw e;
        await ledger.initializeDemoAccount(uid);
        account = await ledger.getAccount(uid);
      }
      res.json({ ...account, simulasi: true });
    } catch (e) {
      console.error('[WALLET] get error:', e);
      res.status(500).json({ error: 'Internal error', simulasi: true });
    }
  });

  // POST /api/wallet/:userId/deposit { asset, amount }
  router.post('/api/wallet/:userId/deposit', mockAuth, async (req, res) => {
    const key = idemKey(req, res);
    if (!key) return;
    try {
      const uid = identity(req, res);
      if (!uid) return;
      const { asset, amount } = req.body ?? {};
      if (typeof asset !== 'string' || !ASSETS.has(asset)) {
        res.status(400).json({ error: `Unknown asset: ${asset}`, simulasi: true }); return;
      }
      const n = parseAmount(amount);
      if (n === null) { res.status(400).json({ error: 'amount must be a positive number', simulasi: true }); return; }

      await ensureAccount(ledger, uid);
      const entryId = externalEntryId('wdp', uid, key);
      const posted = await ledger.postExternal(entryId, uid, asset as Asset, n, 'deposit');
      if (posted) deps.audit(uid, 'wallet_deposit', `${n} ${asset} entry=${entryId}`);
      res.status(201).json({ ok: true, entryId, replayed: !posted, simulasi: true });
    } catch (e) {
      console.error('[WALLET] deposit error:', e);
      res.status(500).json({ error: 'Internal error', simulasi: true });
    }
  });

  // POST /api/wallet/:userId/withdraw { asset, amount }
  router.post('/api/wallet/:userId/withdraw', mockAuth, withdrawRateLimit, async (req, res) => {
    const key = idemKey(req, res);
    if (!key) return;
    try {
      const uid = identity(req, res);
      if (!uid) return;
      const { asset, amount } = req.body ?? {};
      if (typeof asset !== 'string' || !ASSETS.has(asset)) {
        res.status(400).json({ error: `Unknown asset: ${asset}`, simulasi: true }); return;
      }
      const n = parseAmount(amount);
      if (n === null) { res.status(400).json({ error: 'amount must be a positive number', simulasi: true }); return; }

      await ensureAccount(ledger, uid);
      // Sync re-read immediately before posting (getBalanceSync has no await
      // point — matches the engine's fill path): guard is AVAILABLE only.
      // Locked units are reserved for open orders; counting them here let a
      // user withdraw past their spendable balance into negative territory.
      const avail = ledger.getBalanceSync(uid, asset as Asset);
      if (avail < n) {
        res.status(422).json({ error: `Insufficient ${asset} balance`, simulasi: true });
        return;
      }
      const entryId = externalEntryId('wwd', uid, key);
      const posted = await ledger.postExternal(entryId, uid, asset as Asset, n, 'withdraw');
      if (posted) deps.audit(uid, 'wallet_withdraw', `${n} ${asset} entry=${entryId}`);
      res.status(201).json({ ok: true, entryId, replayed: !posted, simulasi: true });
    } catch (e) {
      console.error('[WALLET] withdraw error:', e);
      res.status(500).json({ error: 'Internal error', simulasi: true });
    }
  });

  return router;
}

async function ensureAccount(ledger: Ledger, uid: string): Promise<void> {
  try { await ledger.getAccount(uid); } catch (e) {
    if ((e as Error).message.startsWith('Account not found')) await ledger.initializeDemoAccount(uid);
    else throw e;
  }
}
