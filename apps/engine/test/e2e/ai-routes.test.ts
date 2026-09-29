// Invest-in-AI routes (spec C: Invest in AI → /api/ai/*). Subscribe is a
// money mover: real ledger debit, replay-safe Idempotency-Key.
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { Ledger } from '../../src/ledger/ledger';
import { createAiRouter } from '../../src/server/ai';

async function boot() {
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const audit = vi.fn();
  const app = express();
  app.use(createAiRouter({ ledger, db: store.dbHandle, audit }));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, ledger, audit };
}

const post = (base: string, body: unknown, key?: string) =>
  fetch(`${base}/api/ai/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: JSON.stringify(body),
  });

describe('ai invest routes', () => {
  it('GET /api/ai/strategies lists the SIMULASI strategy book', async () => {
    const { base, server, store } = await boot();
    try {
      const body: any = await (await fetch(`${base}/api/ai/strategies`)).json();
      expect(body.simulasi).toBe(true);
      expect(body.strategies.map((s: any) => s.id)).toContain('ai-momentum');
      for (const s of body.strategies) expect(['low', 'medium', 'high']).toContain(s.risk);
    } finally { server.close(); store.close(); }
  });

  it('subscribe debits USDT and records the subscription', async () => {
    const { base, server, store, ledger, audit } = await boot();
    try {
      await ledger.initializeDemoAccount('investor');
      const before = ledger.getBalanceSync('investor', 'USDT');
      const res = await post(base, { userId: 'investor', strategyId: 'ai-momentum', amount: 200 }, 'ai-1');
      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.subscriptionId).toMatch(/^aisub_/);
      expect(ledger.getBalanceSync('investor', 'USDT')).toBeCloseTo(before - 200, 6);
      const subs: any = await (await fetch(`${base}/api/ai/subscriptions?userId=investor`)).json();
      expect(subs.subscriptions).toHaveLength(1);
      expect(subs.subscriptions[0].strategy_id).toBe('ai-momentum');
      expect(audit).toHaveBeenCalledWith('investor', 'ai_subscribe', expect.stringContaining('strategy=ai-momentum'));
    } finally { server.close(); store.close(); }
  });

  it('replaying the same key does not double-debit', async () => {
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('replayer');
      const before = ledger.getBalanceSync('replayer', 'USDT');
      await post(base, { userId: 'replayer', strategyId: 'ai-stable', amount: 30 }, 'k');
      const second = await post(base, { userId: 'replayer', strategyId: 'ai-stable', amount: 30 }, 'k');
      expect((await second.json() as any).replayed).toBe(true);
      expect(ledger.getBalanceSync('replayer', 'USDT')).toBeCloseTo(before - 30, 6);
    } finally { server.close(); store.close(); }
  });

  it('requires Idempotency-Key and validates strategy/min/balance', async () => {
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('v');
      expect((await post(base, { userId: 'v', strategyId: 'ai-stable', amount: 30 })).status).toBe(400);
      expect((await post(base, { userId: 'v', strategyId: 'nope', amount: 30 }, 'k1')).status).toBe(400);
      expect((await post(base, { userId: 'v', strategyId: 'ai-alt', amount: 1 }, 'k2')).status).toBe(422); // min 100
      expect((await post(base, { userId: 'v', strategyId: 'ai-stable', amount: 1e11 }, 'k3')).status).toBe(422); // > funds
    } finally { server.close(); store.close(); }
  });
});
