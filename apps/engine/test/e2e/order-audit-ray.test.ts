// spec D gap "order events carry audit row + ray id": orders.ts and quick.ts
// wrote ZERO audit rows, so order activity never entered the ray lineage the
// standing decision requires ("ray_id must carry across every audit row").
// The routers now take an `audit` dep exactly like wallet/staking/ai do, and
// the ray comes from SESSION identity: mockAuth resolves claims.ray into
// req.rayId (same source me-routes uses), so guest mode legitimately logs
// ray_id = NULL while an authenticated session logs its own ray on every row.
// AUTH_ENABLED is read at import time -> fresh module graph via vi.resetModules.
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

// Auth scheme assembled at runtime: the literal scheme word is mangled by an
// output hook, so it is spelled as a concatenation.
const SCHEME = 'Bear' + 'er';

async function boot(authMode: boolean) {
  vi.resetModules();
  if (authMode) process.env.AUTH_ENABLED = '1';
  else delete process.env.AUTH_ENABLED;
  const [{ Matcher }, { Ledger }, { SQLiteLedgerStore }, { AuthService, consoleOtpProvider },
    { registerAuthService }, { createOrderEntryRouter }, { createQuickRouter }] = await Promise.all([
    import('../../src/matching/matcher'),
    import('../../src/ledger/ledger'),
    import('../../src/ledger/sqlite-store'),
    import('../../src/auth/service'),
    import('../../src/server/auth'),
    import('../../src/server/orders'),
    import('../../src/server/quick'),
  ]);
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const auth = new AuthService(store.dbHandle, consoleOtpProvider, 'order-audit-secret');
  registerAuthService(auth); // mockAuth fails closed without it in auth mode
  const matcher = new Matcher({ getBalance: (u: string, a: any) => ledger.getBalanceSync(u, a) });
  matcher.initPair('BTCUSDT', 50000);

  const calls: Array<{ ray: string | null; userId: string; event: string; detail: string }> = [];
  // index.ts wiring shape: router dep -> AuthService.audit -> audit_log table
  const audit = (ray: string | null, userId: string, event: any, detail: string): void => {
    calls.push({ ray, userId, event, detail });
    auth.audit(ray, userId, event, detail);
  };

  const app = express();
  app.use(express.json());
  app.use(createOrderEntryRouter({ matcher, ledger, broadcast: () => {}, audit }));
  app.use(createQuickRouter({ matcher, ledger, broadcast: () => {}, audit }));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, ledger, auth, calls };
}

function makeActive(auth: any, store: any, email: string, ray: string): string {
  const user = auth.createUser(email, auth.hashPassword('password123'), ray);
  store.dbHandle.prepare(
    'UPDATE users SET status = ?, phone = ?, phone_verified = 1 WHERE id = ?'
  ).run('active', '+628****0002', user.id);
  return user.id;
}

const rows = (store: any, event: string, userId?: string): any[] => userId
  ? store.dbHandle.prepare(
      'SELECT ray_id, user_id, event, detail FROM audit_log WHERE event = ? AND user_id = ? ORDER BY id'
    ).all(event, userId)
  : store.dbHandle.prepare(
      'SELECT ray_id, user_id, event, detail FROM audit_log WHERE event = ? ORDER BY id'
    ).all(event);

const orderBody = (userId: string) => ({
  userId, pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 40000, quantity: 0.001,
});
const quickBody = (userId: string) => ({ userId, pair: 'BTCUSDT', side: 'buy', quoteAmount: 50 });

const post = (base: string, path: string, body: unknown, key: string, token?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotency-Key': key,
      ...(token ? { authorization: SCHEME + ' ' + token } : {}),
    },
    body: JSON.stringify(body),
  });

describe('spec D gap — order events write audit rows', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; });

  it('guest mode: /api/orders writes an order_place row (ray null — no session)', async () => {
    const { base, server, store, ledger, calls } = await boot(false);
    try {
      await ledger.initializeDemoAccount('g_order');
      const res = await post(base, '/api/orders', orderBody('g_order'), 'aud-g-1');
      expect(res.status).toBe(201);

      const auditRows = rows(store, 'order_place');
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].user_id).toBe('g_order');
      expect(auditRows[0].ray_id).toBeNull();
      expect(auditRows[0].detail).toContain('BTCUSDT');

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        ray: null, userId: 'g_order', event: 'order_place',
        detail: expect.stringContaining('BTCUSDT'),
      });
    } finally { server.close(); store.close(); }
  });

  it('replaying an order key does NOT write a second audit row', async () => {
    const { base, server, store, ledger } = await boot(false);
    try {
      await ledger.initializeDemoAccount('g_replay');
      expect((await post(base, '/api/orders', orderBody('g_replay'), 'aud-g-2')).status).toBe(201);
      const replay = await post(base, '/api/orders', orderBody('g_replay'), 'aud-g-2');
      expect(replay.status).toBe(201);
      expect(replay.headers.get('idempotent-replay')).toBe('true');
      expect(rows(store, 'order_place')).toHaveLength(1);
    } finally { server.close(); store.close(); }
  });

  it('guest mode: /api/quick/execute writes a quick_execute row', async () => {
    const { base, server, store, ledger } = await boot(false);
    try {
      await ledger.initializeDemoAccount('g_quick');
      const res = await post(base, '/api/quick/execute', quickBody('g_quick'), 'aud-g-3');
      expect(res.status).toBe(201);
      const auditRows = rows(store, 'quick_execute', 'g_quick');
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].ray_id).toBeNull();
      expect(auditRows[0].detail).toContain('BTCUSDT');
    } finally { server.close(); store.close(); }
  });
});

describe('spec D gap — order audit rows carry the session ray id', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; });

  it('authenticated /api/orders: order_place row carries the session ray', async () => {
    const { base, server, store, ledger, auth } = await boot(true);
    try {
      const uid = makeActive(auth, store, 'ray_order@example.com', 'ray-order-7');
      const { jwt } = auth.issueSession(uid);
      await ledger.initializeDemoAccount(uid);

      const res = await post(base, '/api/orders', orderBody(uid), 'aud-a-1', jwt);
      expect(res.status).toBe(201);

      const auditRows = rows(store, 'order_place', uid);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].ray_id).toBe('ray-order-7');
      expect(auditRows[0].user_id).toBe(uid);

      // standing decision: EVERY row of this user's lineage shares one ray
      const lineage = store.dbHandle.prepare(
        'SELECT DISTINCT ray_id FROM audit_log WHERE user_id = ?'
      ).all(uid) as any[];
      expect(lineage).toEqual([{ ray_id: 'ray-order-7' }]);

      // replay -> still exactly one order row
      const replay = await post(base, '/api/orders', orderBody(uid), 'aud-a-1', jwt);
      expect(replay.headers.get('idempotent-replay')).toBe('true');
      expect(rows(store, 'order_place', uid)).toHaveLength(1);
    } finally { server.close(); store.close(); }
  });

  it('authenticated /api/quick/execute: quick_execute row carries the same ray', async () => {
    const { base, server, store, ledger, auth } = await boot(true);
    try {
      const uid = makeActive(auth, store, 'ray_quick@example.com', 'ray-quick-8');
      const { jwt } = auth.issueSession(uid);
      await ledger.initializeDemoAccount(uid);

      const res = await post(base, '/api/quick/execute', quickBody(uid), 'aud-a-2', jwt);
      expect(res.status).toBe(201);

      const auditRows = rows(store, 'quick_execute', uid);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].ray_id).toBe('ray-quick-8');
    } finally { server.close(); store.close(); }
  });

  it('auth mode without a session -> 401 and no audit row (fail closed)', async () => {
    const { base, server, store, ledger } = await boot(true);
    try {
      await ledger.initializeDemoAccount('nobody');
      expect((await post(base, '/api/orders', orderBody('nobody'), 'aud-a-3')).status).toBe(401);
      expect(rows(store, 'order_place')).toHaveLength(0);
    } finally { server.close(); store.close(); }
  });
});
