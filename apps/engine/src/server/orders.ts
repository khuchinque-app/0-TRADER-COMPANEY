// Order entry (REST) — delegated decision Q5a (PLANNING/q1q5.txt).
// POST /api/orders with a REQUIRED Idempotency-Key header (spec hard rule:
// idempotency on every money-moving POST). Semantics mirror ws.ts 'order'
// frames exactly: initializeDemoAccount → matcher.placeOrder →
// drainPendingSettlements → ledger.settleBatch → broadcast.
//
// Idempotency store: IN-MEMORY map of key → response. Caveat (documented,
// accepted at delegation): cleared on restart, so a replayed key after a
// restart re-executes; capacity-capped with oldest-eviction. When this
// needs to survive restarts it earns a SQLite table keyed like journal rows.
// Only successful (2xx) executions are cached — a rejected order may be
// retried with the SAME key after fixing the request.

import express, { Router, type Request, type Response } from 'express';
import type { Matcher } from '../matching/matcher';
import type { Ledger } from '../ledger/ledger';
import { PAIRS, type Pair } from '@trading/shared';
import { AUTH_ENABLED } from './auth';
import { mockAuth } from './auth';
import type { AuditEvent } from '../auth/service';
import { createRateLimiter, ipKey, userKey } from './rate-limit';

const PAIR_SET = new Set<string>(PAIRS as readonly string[]);
const IDEMPOTENCY_MAX = 5000;

export interface OrderEntryDeps {
  matcher: Matcher;
  ledger: Ledger;
  /** Engine broadcast (set by index.ts once the WS server exists). */
  broadcast: (msg: { type: string; payload: any }) => void;
  /**
   * Audit insert seam (spec D: every order event writes an audit_log row and
   * carries the session's ray id — wired to AuthService.audit in index.ts).
   */
  audit: (rayId: string | null, userId: string, event: AuditEvent, detail: string) => void;
}

export function createOrderEntryRouter(deps: OrderEntryDeps): Router {
  const router = Router();
  // Sub-app middleware is not shared with the parent express app — parse here
  // (body-parser skips the body when the parent already parsed it).
  router.use(express.json());
  const idempotency = new Map<string, { status: number; body: unknown }>();

  // spec D gap: rate limit per USER AND per IP on the order routes. Shares the
  // 'order' namespace with /api/quick/execute (one quota for the order family)
  // and stays separate from the auth and withdraw namespaces. Guest mode keys
  // the user bucket on the body userId — spoofable by design (guest IS a demo
  // identity), so the per-IP bucket is the backstop there.
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

  router.post('/api/orders', mockAuth, rateLimit, async (req: Request, res: Response) => {
    const idemKey = req.header('Idempotency-Key');
    // Charset mirrors wallet.ts: forbids '|' so the composite per-user
    // cacheKey below can never be forged into another user's bucket.
    if (!idemKey || idemKey.length > 200 || !/^[\w:-]+$/.test(idemKey)) {
      res.status(400).json({ error: 'Idempotency-Key header is required (<=200 chars, [\\w:-])' });
      return;
    }

    const { userId, pair, side, type, price, quantity } = req.body ?? {};

    // Identity: in auth mode the token wins and must match the body
    // (prevents placing orders for someone else); guest mode trusts the body
    // exactly like the WS path does today.
    const effectiveUser = AUTH_ENABLED ? (req as any).userId : userId;
    if (AUTH_ENABLED && userId !== effectiveUser) {
      res.status(403).json({ error: 'body userId does not match session token' });
      return;
    }

    // Replay check is PER USER: with a global key, another account replaying
    // it received this user's cached order/fill payload (data leak).
    const cacheKey = `${effectiveUser ?? '?'}|${idemKey}`;
    const cached = idempotency.get(cacheKey);
    if (cached) {
      res.status(cached.status).set('Idempotent-Replay', 'true').json(cached.body);
      return;
    }

    // Validation — mirrors ws.ts handleInboundMessage 'order' branch
    if (!effectiveUser || !pair || !side || !type) {
      res.status(400).json({ error: 'userId, pair, side, type are required' });
      return;
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'quantity must be a positive finite number' });
      return;
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      res.status(400).json({ error: 'price must be a positive finite number' });
      return;
    }
    if (side !== 'buy' && side !== 'sell') {
      res.status(400).json({ error: "side must be 'buy' or 'sell'" });
      return;
    }
    if (type !== 'limit' && type !== 'market') {
      res.status(400).json({ error: "type must be 'limit' or 'market'" });
      return;
    }
    if (!PAIR_SET.has(String(pair))) {
      res.status(400).json({ error: `unknown pair: ${pair}` });
      return;
    }

    try {
      // Same sequence as ws.ts — one semantic, two transports
      await deps.ledger.initializeDemoAccount(String(effectiveUser));
      const order = deps.matcher.placeOrder(
        // PAIR_SET.has above already rejected unknown pairs at runtime
        String(effectiveUser), String(pair) as Pair, side, type, price, quantity
      );

      const batch = deps.matcher.drainPendingSettlements();
      await deps.ledger.settleBatch(batch); // let failures 500 — money path

      // Broadcast settled activity to all WS clients (same frames as ws.ts)
      for (const { order: o, fills } of batch) {
        deps.broadcast({ type: 'order', payload: o });
        for (const f of fills) deps.broadcast({ type: 'fill', payload: f });
      }

      // spec D gap: order events carry an audit row + the session's ray id
      // (mockAuth put it on req.rayId; guest mode has no session -> null).
      // An idempotent replay returns above, so it never double-audits.
      deps.audit(
        (req as any).rayId ?? null,
        String(effectiveUser),
        'order_place',
        `${side} ${type} ${quantity} ${pair} @${price} id=${order.id} fills=${batch.flatMap((b) => b.fills).length}`,
      );

      const body = {
        simulasi: true, // spec D: SIMULASI badge, server-side, on money responses
        order,
        fills: batch.flatMap((b) => b.fills),
      };
      idempotency.set(cacheKey, { status: 201, body });
      if (idempotency.size > IDEMPOTENCY_MAX) {
        const oldest = idempotency.keys().next().value;
        if (oldest !== undefined) idempotency.delete(oldest);
      }
      res.status(201).set('X-Simulated', 'true').json(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Matcher rejections (bad order, buying power) are client errors;
      // anything else (settlement/IO) is a server fault.
      const clientFault = /balance|cover|invalid|reject|unknown|insufficient/i.test(msg);
      res.status(clientFault ? 400 : 500).json({ error: clientFault ? msg : 'order processing failed' });
      if (!clientFault) console.error('[REST orders]', msg);
    }
  });

  return router;
}
