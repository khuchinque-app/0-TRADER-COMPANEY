// Ticket 03 (2026-09-26 sweep): per-userId GET reads in rest.ts must be
// session-guarded when AUTH_ENABLED=1 (guest mode stays open — demo venue
// contract). AUTH_ENABLED/mockAuth read process.env at import time, so each
// mode gets a fresh module graph via vi.resetModules.
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

async function bootGuest() {
  vi.resetModules();
  const [{ Matcher }, { Ledger }, { SQLiteLedgerStore }, { createRestServer }] = await Promise.all([
    import('../../src/matching/matcher'),
    import('../../src/ledger/ledger'),
    import('../../src/ledger/sqlite-store'),
    import('../../src/server/rest'),
  ]);
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  await ledger.initializeDemoAccount('alice');
  await ledger.initializeDemoAccount('bob');
  const matcher = new Matcher({ getBalance: (u: string, a: any) => ledger.getBalanceSync(u, a) });
  matcher.initPair('BTCUSDT', 50000);
  // Seed real activity on BOTH users so filter assertions are non-vacuous:
  // resting limit + crossing market order -> fills for maker AND taker.
  matcher.placeOrder('alice', 'BTCUSDT' as any, 'sell', 'limit', 50000, 0.01);
  matcher.placeOrder('bob', 'BTCUSDT' as any, 'buy', 'market', 50000, 0.002);
  const app = express();
  app.use(createRestServer(matcher, ledger, { getKlines: () => [], on: () => {} } as any));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, matcher };
}

describe('ticket 03 — guest mode (AUTH_ENABLED=0): reads stay open for the demo', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; delete process.env.AUTH_ALLOW_MOCK; });

  it('ledger/orders/fills readable without any session', async () => {
    const { base, server, store } = await bootGuest();
    try {
      expect((await fetch(`${base}/api/ledger/alice`)).status).toBe(200);
      expect((await fetch(`${base}/api/orders/alice`)).status).toBe(200);
      expect((await fetch(`${base}/api/fills`)).status).toBe(200);
      expect((await fetch(`${base}/api/ledger/alice/journal`)).status).toBe(200);
    } finally { server.close(); store.close(); }
  });
});

describe('ticket 03 — auth mode (AUTH_ENABLED=1 + mock bearer): session must match path userId', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; delete process.env.AUTH_ALLOW_MOCK; });

  async function bootAuth() {
    process.env.AUTH_ENABLED = '1';
    process.env.AUTH_ALLOW_MOCK = '1'; // legacy demo token: Bearer mock.<userId>
    return bootGuest();
  }

  it('no session -> 401 on per-userId reads; market reads stay public', async () => {
    const { base, server, store } = await bootAuth();
    try {
      expect((await fetch(`${base}/api/ledger/alice`)).status).toBe(401);
      expect((await fetch(`${base}/api/orders/alice`)).status).toBe(401);
      expect((await fetch(`${base}/api/fills/alice`)).status).toBe(401);
      expect((await fetch(`${base}/api/ledger/alice/journal`)).status).toBe(401);
      // spec D allowlist intent: market data is public
      expect((await fetch(`${base}/api/tickers`)).status).toBe(200);
      expect((await fetch(`${base}/api/market/BTCUSDT`)).status).toBe(200);
      expect((await fetch(`${base}/api/fx/USD`)).status).toBeLessThan(500);
    } finally { server.close(); store.close(); }
  });

  it('alice session reading bob -> 403; own reads -> 200', async () => {
    const { base, server, store } = await bootAuth();
    const hdr = (u: string) => ({ authorization: `Bearer mock.${u}` });
    try {
      expect((await fetch(`${base}/api/ledger/bob`, { headers: hdr('alice') })).status).toBe(403);
      expect((await fetch(`${base}/api/orders/bob`, { headers: hdr('alice') })).status).toBe(403);
      expect((await fetch(`${base}/api/fills/bob`, { headers: hdr('alice') })).status).toBe(403);
      expect((await fetch(`${base}/api/ledger/alice`, { headers: hdr('alice') })).status).toBe(200);
      expect((await fetch(`${base}/api/orders/alice`, { headers: hdr('alice') })).status).toBe(200);
      expect((await fetch(`${base}/api/fills/alice`, { headers: hdr('alice') })).status).toBe(200);
      expect((await fetch(`${base}/api/ledger/alice/journal`, { headers: hdr('alice') })).status).toBe(200);
    } finally { server.close(); store.close(); }
  });

  it('fills with no param returns ONLY the caller\'s fills (seeded, non-vacuous)', async () => {
    process.env.AUTH_ENABLED = '1';
    process.env.AUTH_ALLOW_MOCK = '1';
    const booted = await bootGuest(); // env set before module import → auth mode
    const hdr = (u: string) => ({ authorization: `Bearer mock.${u}` });
    try {
      const pool = booted.matcher.getRecentFills(100);
      expect(pool.some((f: any) => f.userId === 'alice')).toBe(true);
      expect(pool.some((f: any) => f.userId === 'bob')).toBe(true);
      const a: any = await (await fetch(`${booted.base}/api/fills`, { headers: hdr('alice') })).json();
      const b: any = await (await fetch(`${booted.base}/api/fills`, { headers: hdr('bob') })).json();
      for (const f of a.fills) expect(f.userId).toBe('alice');
      for (const f of b.fills) expect(f.userId).toBe('bob');
      expect(a.fills.length).toBeGreaterThan(0);
      expect(b.fills.length).toBeGreaterThan(0);
      expect(a.fills.length).toBeLessThan(pool.length);
      expect(b.fills.length).toBeLessThan(pool.length);
    } finally { booted.server.close(); booted.store.close(); }
  });
});
