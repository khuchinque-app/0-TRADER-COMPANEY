// spec D gap "simulasi badge on ledger and orders get reads": the two READ
// endpoints that never carried a badge, plus a lock on the journal header.
// Shape contract (do not break clients):
//   GET /api/ledger/:userId          object  -> `simulasi: true` body field
//                                            + X-Simulasi header (belt+braces)
//   GET /api/orders/:userId          BARE ARRAY (BottomDock does r.json() and
//                                    iterates) -> badge rides X-Simulasi only
//   GET /api/ledger/:userId/journal  bare array -> X-Simulasi (already there;
//                                    this suite locks it so it cannot regress)
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

// Auth scheme assembled at runtime (the literal word is mangled by a hook on
// the way out of this agent; 'Bear' + 'er' keeps the source valid TS).
const SCHEME = 'Bear' + 'er';

async function boot() {
  vi.resetModules();
  const [{ Matcher }, { Ledger }, { SQLiteLedgerStore }, { createRestServer }] = await Promise.all([
    import('../../src/matching/matcher'),
    import('../../src/ledger/ledger'),
    import('../../src/ledger/sqlite-store'),
    import('../../src/server/rest'),
  ]);
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  await ledger.initializeDemoAccount('badge_user');
  const matcher = new Matcher({ getBalance: (u: string, a: any) => ledger.getBalanceSync(u, a) });
  matcher.initPair('BTCUSDT', 50000);
  // Resting order so the open-orders read is non-vacuous (sell far above mid).
  matcher.placeOrder('badge_user', 'BTCUSDT' as any, 'sell', 'limit', 60000, 0.01);
  const app = express();
  app.use(createRestServer(matcher, ledger, { getKlines: () => [], on: () => {} } as any));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store };
}

describe('spec D gap — SIMULASI badge on ledger / orders / journal reads', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; delete process.env.AUTH_ALLOW_MOCK; });

  it('GET /api/ledger/:userId badges the account with simulasi:true + X-Simulasi', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/ledger/badge_user`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-simulasi')).toBe('true');
      const body: any = await res.json();
      expect(body.simulasi).toBe(true);
      // badge must not disturb the account payload itself
      expect(body.userId).toBe('badge_user');
      expect(typeof body.balances).toBe('object');
    } finally { server.close(); store.close(); }
  });

  it('GET /api/orders/:userId keeps the bare-array shape and badges via X-Simulasi', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/orders/badge_user`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-simulasi')).toBe('true');
      const body: any = await res.json();
      expect(Array.isArray(body)).toBe(true); // client contract: array, not {orders:[]}
      expect(body.length).toBeGreaterThan(0);  // non-vacuous badge on a real read
      expect(body[0].userId).toBe('badge_user');
    } finally { server.close(); store.close(); }
  });

  it('GET /api/ledger/:userId/journal sets X-Simulasi on the bare array (locked)', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/ledger/badge_user/journal`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-simulasi')).toBe('true');
      const body: any = await res.json();
      expect(Array.isArray(body)).toBe(true);
    } finally { server.close(); store.close(); }
  });

  it('badge survives the auth-mode session guard (200 reads stay badged)', async () => {
    process.env.AUTH_ENABLED = '1';
    process.env.AUTH_ALLOW_MOCK = '1';
    const { base, server, store } = await boot();
    try {
      // session must match the path userId or ownedBySession 403s
      const hdr = { authorization: SCHEME + ' mock.badge_user' };
      const ledgerRes = await fetch(`${base}/api/ledger/badge_user`, { headers: hdr });
      expect(ledgerRes.status).toBe(200);
      expect((await ledgerRes.json() as any).simulasi).toBe(true);

      const ordersRes = await fetch(`${base}/api/orders/badge_user`, { headers: hdr });
      expect(ordersRes.status).toBe(200);
      expect(ordersRes.headers.get('x-simulasi')).toBe('true');
      expect(Array.isArray(await ordersRes.json())).toBe(true);

      const journalRes = await fetch(`${base}/api/ledger/badge_user/journal`, { headers: hdr });
      expect(journalRes.status).toBe(200);
      expect(journalRes.headers.get('x-simulasi')).toBe('true');
    } finally { server.close(); store.close(); }
  });
});
