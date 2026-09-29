// spec D gap "rate limit per user and ip on order and withdraw routes": the
// engine had exactly ONE token bucket (per IP, /api/auth only) and zero
// limiting on the money movers. This suite locks the generalized bucket:
//   - per USER bucket and per IP bucket, checked atomically (either one empty
//     -> 429; a pass drains both)
//   - separate namespaces per route family, so auth / order / withdraw quotas
//     cannot starve each other
//   - auth routes keep their own per-IP bucket after the refactor (behaviour
//     preserved, env vars AUTH_RATE_BURST / AUTH_RATE_REFILL_MS unchanged)
// Caps are env-tunable and read per request (RATE_LIMIT_USER_BURST,
// RATE_LIMIT_IP_BURST, RATE_LIMIT_REFILL_MS) so the suite can pin them.
// NOTE: deliberately NO vi.resetModules here — rate-limit buckets are module
// state and the test asserts namespace isolation across one module graph.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import { Matcher } from '../../src/matching/matcher';
import { Ledger } from '../../src/ledger/ledger';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { createOrderEntryRouter } from '../../src/server/orders';
import { createQuickRouter } from '../../src/server/quick';
import { createWalletRouter } from '../../src/server/wallet';
import { createAuthRouter, devTurnstile } from '../../src/server/auth-routes';
import { AuthService, consoleOtpProvider } from '../../src/auth/service';
import { resetRateLimiters } from '../../src/server/rate-limit';

const ENV_KEYS = [
  'RATE_LIMIT_USER_BURST', 'RATE_LIMIT_IP_BURST', 'RATE_LIMIT_REFILL_MS',
  'AUTH_RATE_BURST', 'AUTH_RATE_REFILL_MS',
];

async function boot(opts: { trustProxy?: boolean } = {}) {
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const matcher = new Matcher({ getBalance: (u: string, a: any) => ledger.getBalanceSync(u, a) });
  matcher.initPair('BTCUSDT', 50000);
  const orderAudit = vi.fn();
  const walletAudit = vi.fn();
  const auth = new AuthService(store.dbHandle, consoleOtpProvider, 'rl-secret');
  const app = express();
  if (opts.trustProxy) app.set('trust proxy', true);
  app.use(createAuthRouter(auth, devTurnstile));
  app.use(express.json());
  app.use(createOrderEntryRouter({ matcher, ledger, broadcast: () => {}, audit: orderAudit }));
  app.use(createQuickRouter({ matcher, ledger, broadcast: () => {}, audit: orderAudit }));
  app.use(createWalletRouter({ ledger, audit: walletAudit }));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, ledger, orderAudit, walletAudit };
}

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}-${++keySeq}`;

const post = (base: string, path: string, body: unknown, key: string, ip?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotency-Key': key,
      ...(ip ? { 'x-forwarded-for': ip } : {}),
    },
    body: JSON.stringify(body),
  });

const orderBody = (userId: string) => ({
  userId, pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 40000, quantity: 0.001,
});
const quickBody = (userId: string) => ({ userId, pair: 'BTCUSDT', side: 'buy', quoteAmount: 50 });
const withdrawBody = (amount = 1) => ({ asset: 'USDT', amount });

describe('spec D gap — rate limit per user AND per ip on order / quick / withdraw', () => {
  beforeEach(() => {
    resetRateLimiters();
    for (const k of ENV_KEYS) delete process.env[k];
    // no bucket refill inside a single test
    process.env.RATE_LIMIT_REFILL_MS = '3600000';
    process.env.AUTH_RATE_REFILL_MS = '3600000';
  });
  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    resetRateLimiters();
  });

  it('per USER bucket: one account hammering /api/orders cannot lock out another', async () => {
    process.env.RATE_LIMIT_USER_BURST = '2';
    process.env.RATE_LIMIT_IP_BURST = '1000';
    const { base, server, store, ledger } = await boot();
    try {
      for (const u of ['rl_user_a', 'rl_user_b']) await ledger.initializeDemoAccount(u);

      expect((await post(base, '/api/orders', orderBody('rl_user_a'), nextKey('u'))).status).toBe(201);
      expect((await post(base, '/api/orders', orderBody('rl_user_a'), nextKey('u'))).status).toBe(201);
      const limited = await post(base, '/api/orders', orderBody('rl_user_a'), nextKey('u'));
      expect(limited.status).toBe(429);
      const body: any = await limited.json();
      expect(body.error).toBe('rate_limited');
      expect(body.simulasi).toBe(true); // money route -> SIMULASI badge too

      // second user, SAME ip: own bucket, still served
      expect((await post(base, '/api/orders', orderBody('rl_user_b'), nextKey('u'))).status).toBe(201);
    } finally { server.close(); store.close(); }
  });

  it('per IP bucket: distinct users behind one IP share the quota; other IPs unaffected', async () => {
    process.env.RATE_LIMIT_USER_BURST = '1000';
    process.env.RATE_LIMIT_IP_BURST = '2';
    const { base, server, store, ledger } = await boot({ trustProxy: true });
    try {
      for (const u of ['rl_ip_a', 'rl_ip_b']) await ledger.initializeDemoAccount(u);
      const ip1 = '203.0.113.10';

      expect((await post(base, '/api/orders', orderBody('rl_ip_a'), nextKey('i'), ip1)).status).toBe(201);
      expect((await post(base, '/api/orders', orderBody('rl_ip_a'), nextKey('i'), ip1)).status).toBe(201);
      expect((await post(base, '/api/orders', orderBody('rl_ip_a'), nextKey('i'), ip1)).status).toBe(429);
      // different USER, same IP -> blocked by the IP bucket
      expect((await post(base, '/api/orders', orderBody('rl_ip_b'), nextKey('i'), ip1)).status).toBe(429);
      // same user, different IP -> fresh IP bucket
      expect((await post(base, '/api/orders', orderBody('rl_ip_a'), nextKey('i'), '203.0.113.11')).status).toBe(201);
    } finally { server.close(); store.close(); }
  });

  it('quick execute shares the order quota (both are order routes)', async () => {
    process.env.RATE_LIMIT_USER_BURST = '1';
    process.env.RATE_LIMIT_IP_BURST = '1000';
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('rl_quick');
      expect((await post(base, '/api/orders', orderBody('rl_quick'), nextKey('q'))).status).toBe(201);
      const limited = await post(base, '/api/quick/execute', quickBody('rl_quick'), nextKey('q'));
      expect(limited.status).toBe(429);
      expect((await limited.json() as any).error).toBe('rate_limited');
    } finally { server.close(); store.close(); }
  });

  it('withdraw: per USER bucket', async () => {
    process.env.RATE_LIMIT_USER_BURST = '1';
    process.env.RATE_LIMIT_IP_BURST = '1000';
    const { base, server, store, ledger } = await boot();
    try {
      for (const u of ['rl_wd_a', 'rl_wd_b']) await ledger.initializeDemoAccount(u);

      expect((await post(base, '/api/wallet/rl_wd_a/withdraw', withdrawBody(), nextKey('w'))).status).toBe(201);
      const limited = await post(base, '/api/wallet/rl_wd_a/withdraw', withdrawBody(), nextKey('w'));
      expect(limited.status).toBe(429);
      expect((await limited.json() as any).error).toBe('rate_limited');
      // another user still withdraws
      expect((await post(base, '/api/wallet/rl_wd_b/withdraw', withdrawBody(), nextKey('w'))).status).toBe(201);
    } finally { server.close(); store.close(); }
  });

  it('withdraw: per IP bucket (one IP cannot drain every account)', async () => {
    process.env.RATE_LIMIT_USER_BURST = '1000';
    process.env.RATE_LIMIT_IP_BURST = '1';
    const { base, server, store, ledger } = await boot({ trustProxy: true });
    try {
      for (const u of ['rl_wd_ip_a', 'rl_wd_ip_b']) await ledger.initializeDemoAccount(u);
      const ip = '198.51.100.7';

      expect((await post(base, '/api/wallet/rl_wd_ip_a/withdraw', withdrawBody(), nextKey('w'), ip)).status).toBe(201);
      const blocked = await post(base, '/api/wallet/rl_wd_ip_b/withdraw', withdrawBody(), nextKey('w'), ip);
      expect(blocked.status).toBe(429);
      // other IP: same user, fresh bucket
      expect((await post(base, '/api/wallet/rl_wd_ip_a/withdraw', withdrawBody(), nextKey('w'), '198.51.100.8')).status).toBe(201);
    } finally { server.close(); store.close(); }
  });

  it('route families are separate namespaces: drained orders do not block withdraw or auth', async () => {
    process.env.RATE_LIMIT_USER_BURST = '1';
    process.env.RATE_LIMIT_IP_BURST = '1000';
    process.env.AUTH_RATE_BURST = '1';
    const { base, server, store, ledger } = await boot();
    try {
      for (const u of ['rl_ns', 'rl_ns2']) await ledger.initializeDemoAccount(u);

      // order namespace for rl_ns: one token (USER burst = 1) then empty
      expect((await post(base, '/api/orders', orderBody('rl_ns'), nextKey('n'))).status).toBe(201);
      expect((await post(base, '/api/orders', orderBody('rl_ns'), nextKey('n'))).status).toBe(429);

      // withdraw lives in its own namespace -> the drained order quota is irrelevant
      expect((await post(base, '/api/wallet/rl_ns/withdraw', withdrawBody(), nextKey('n'))).status).toBe(201);

      // auth bucket drains on its own schedule and touches no other family
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(401); // counted
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(429); // its own bucket empty
      expect((await post(base, '/api/orders', orderBody('rl_ns2'), nextKey('n'))).status).toBe(201);
      expect((await post(base, '/api/wallet/rl_ns2/withdraw', withdrawBody(), nextKey('n'))).status).toBe(201);
    } finally { server.close(); store.close(); }
  });

  it('auth routes keep their per-IP bucket with the original env knobs', async () => {
    process.env.AUTH_RATE_BURST = '3';
    const { base, server, store } = await boot();
    try {
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(401);
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(401);
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(401);
      const limited = await fetch(`${base}/api/auth/me`);
      expect(limited.status).toBe(429);
      expect((await limited.json() as any).error).toBe('rate_limited');
    } finally { server.close(); store.close(); }
  });
});
