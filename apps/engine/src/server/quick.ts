// Quick Buy/Sell — spec: order-router → /api/quick/*, "simplified trading
// for beginners". Two endpoints:
//   GET  /api/quick/quote?pair=&side=&quoteAmount=  (no key — read-only)
//   POST /api/quick/execute { userId, pair, side, quoteAmount }
//        Idempotency-Key REQUIRED (spec D names /api/quick/execute explicitly).
// Execute converts a USDT amount into a market order at the top of book and
// runs the exact same settle+broadcast sequence as /api/orders (one semantic,
// two transports + a convenience shim).

import express, { Router, type Request, type Response } from 'express';
import type { Matcher } from '../matching/matcher';
import type { Ledger } from '../ledger/ledger';
import { PAIRS, type Pair } from '@trading/shared';
import { mockAuth, AUTH_ENABLED } from './auth';
import type { AuditEvent } from '../auth/service';
import { createRateLimiter, ipKey, userKey } from './rate-limit';

const PAIR_SET = new Set<string>(PAIRS as readonly string[]);

export interface QuickDeps {
  matcher: Matcher;
  ledger: Ledger;
  broadcast: (msg: { type: string; payload: any }) => void;
  /**
   * Audit insert seam (spec D: quick executions write an audit_log row that
   * carries the session's ray id — same wiring as orders.ts/wallet.ts).
   */
  audit: (rayId: string | null, userId: string, event: AuditEvent, detail: string) => void;
}

export function createQuickRouter(deps: QuickDeps): Router {
  const router = Router();
  router.use(express.json());

  // spec D gap: per USER + per IP limit. Shares the 'order' namespace with
  // POST /api/orders (one quota for the whole order family), separate from
  // auth and withdraw.
  const rateLimit = createRateLimiter({
    namespace: 'order',
    refillEnv: 'RATE_LIMIT_REFILL_MS',
    defaultRefillMs: 3000,
    dimensions: [
      { name: 'user', key: userKey, burstEnv: 'RATE_LIMIT_USER_BURST', defaultBurst: 20 },
      { name: 'ip', key: ipKey, burstEnv: 'RATE_LIMIT_IP_BURST', defaultBurst: 60 },
    ],
    extraBody: { simulasi: true },
  });

  const quoteFor = (pair: string, side: string, quoteAmount: number) => {
    const book = deps.matcher.getOrderBook(pair as Pair);
    if (!book) return null;
    const best = side === 'buy' ? book.asks[0]?.price : book.bids[0]?.price;
    const price = best ?? deps.matcher.getMidPrice(pair as Pair);
    if (!price) return null;
    const quantity = Math.round((quoteAmount / price) * 1e8) / 1e8;
    return { pair, side, price, quoteAmount, quantity };
  };

  // GET /api/quick/quote?pair=BTCUSDT&side=buy&quoteAmount=100
  router.get('/api/quick/quote', (req: Request, res: Response) => {
    const pair = String(req.query.pair ?? '').toUpperCase().replace('/', '');
    const side = String(req.query.side ?? '');
    const quoteAmount = Number(req.query.quoteAmount);
    if (!PAIR_SET.has(pair)) { res.status(400).json({ error: `unknown pair: ${pair}`, simulasi: true }); return; }
    if (side !== 'buy' && side !== 'sell') { res.status(400).json({ error: "side must be 'buy' or 'sell'", simulasi: true }); return; }
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0 || quoteAmount > 1e12) {
      res.status(400).json({ error: 'quoteAmount must be a positive number', simulasi: true }); return;
    }
    const q = quoteFor(pair, side, quoteAmount);
    if (!q) { res.status(503).json({ error: 'book not ready', simulasi: true }); return; }
    res.json({ ...q, simulasi: true });
  });

  // POST /api/quick/execute — money mover: key required, cached on success.
  // Cache key is PER USER: with a global key, another account replaying it
  // gets this user's cached order/fill payload back (data leak).
  const idempotency = new Map<string, { status: number; body: unknown }>();
  router.post('/api/quick/execute', mockAuth, rateLimit, async (req: Request, res: Response) => {
    const idemKey = req.header('Idempotency-Key');
    // Charset mirrors wallet.ts: forbids '|' so the composite per-user
    // cacheKey below can never be forged into another user's bucket.
    if (!idemKey || idemKey.length > 200 || !/^[\w:-]+$/.test(idemKey)) {
      res.status(400).json({ error: 'Idempotency-Key header is required (<=200 chars, [\\w:-])', simulasi: true });
      return;
    }

    try {
      const { userId, pair, side, quoteAmount } = req.body ?? {};
      const effectiveUser = AUTH_ENABLED ? (req as any).userId : userId;
      if (AUTH_ENABLED && userId !== effectiveUser) {
        res.status(403).json({ error: 'body userId does not match session', simulasi: true }); return;
      }
      const cacheKey = `${effectiveUser ?? '?'}|${idemKey}`;
      const cached = idempotency.get(cacheKey);
      if (cached) { res.status(cached.status).set('Idempotent-Replay', 'true').json(cached.body); return; }
      const P = String(pair ?? '').toUpperCase().replace('/', '');
      if (!effectiveUser || !PAIR_SET.has(P) || (side !== 'buy' && side !== 'sell') ||
          typeof quoteAmount !== 'number' || !Number.isFinite(quoteAmount) || quoteAmount <= 0 || quoteAmount > 1e12) {
        res.status(400).json({ error: 'userId, valid pair, side, positive quoteAmount required', simulasi: true }); return;
      }

      // Fresh quote AT EXECUTION time — never trust the client's numbers.
      const q = quoteFor(P, side, quoteAmount);
      if (!q) { res.status(503).json({ error: 'book not ready', simulasi: true }); return; }

      await deps.ledger.initializeDemoAccount(String(effectiveUser));
      const order = deps.matcher.placeOrder(String(effectiveUser), P as Pair, side, 'market', 0, q.quantity);
      const batch = deps.matcher.drainPendingSettlements();
      await deps.ledger.settleBatch(batch);
      for (const { order: o, fills } of batch) {
        deps.broadcast({ type: 'order', payload: o });
        for (const f of fills) deps.broadcast({ type: 'fill', payload: f });
      }

      // spec D gap: quick executions carry an audit row + the session ray id;
      // an idempotent replay returned above, so it never double-audits.
      deps.audit(
        (req as any).rayId ?? null,
        String(effectiveUser),
        'quick_execute',
        `${side} ${P} quote=${quoteAmount} id=${order.id} qty=${q.quantity}`,
      );

      const body = { simulasi: true, order, fills: batch.flatMap(b => b.fills), quote: q };
      idempotency.set(cacheKey, { status: 201, body });
      if (idempotency.size > 5000) {
        const oldest = idempotency.keys().next().value;
        if (oldest !== undefined) idempotency.delete(oldest);
      }
      res.status(201).json(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const clientFault = /balance|cover|invalid|reject|unknown|insufficient|below minimum|exceeds maximum/i.test(msg);
      res.status(clientFault ? 400 : 500).json({ error: clientFault ? msg : 'quick execute failed', simulasi: true });
      if (!clientFault) console.error('[QUICK]', msg);
    }
  });

  return router;
}
