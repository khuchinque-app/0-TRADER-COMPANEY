// Staking routes (spec C: Staking → /api/staking/*). Subscribe moves money:
// the debit must land on the real SQLite ledger, and a replayed
// Idempotency-Key must not double-debit.
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { Ledger } from '../../src/ledger/ledger';
import { createStakingRouter } from '../../src/server/staking';

async function boot() {
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const audit = vi.fn();
  const app = express();
  app.use(createStakingRouter({ ledger, db: store.dbHandle, audit }));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, ledger, audit };
}

const post = (base: string, body: unknown, key?: string) =>
  fetch(`${base}/api/staking/subscribe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: JSON.stringify(body),
  });

describe('staking routes', () => {
  it('GET /api/staking/plans lists the SIMULASI plan book', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/staking/plans`);
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.simulasi).toBe(true);
      expect(body.plans.length).toBeGreaterThan(0);
      expect(body.plans.map((p: any) => p.id)).toContain('usdt-flex');
      for (const p of body.plans) expect(typeof p.apy).toBe('number');
    } finally { server.close(); store.close(); }
  });

  it('subscribe debits the real ledger and records a position', async () => {
    const { base, server, store, ledger, audit } = await boot();
    try {
      await ledger.initializeDemoAccount('staker');
      const before = ledger.getBalanceSync('staker', 'USDT');
      const res = await post(base, { userId: 'staker', planId: 'usdt-flex', amount: 100 }, 'sub-1');
      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.simulasi).toBe(true);
      expect(body.positionId).toMatch(/^pos_/);
      expect(ledger.getBalanceSync('staker', 'USDT')).toBeCloseTo(before - 100, 6);

      const positions: any = await (await fetch(`${base}/api/staking/positions?userId=staker`)).json();
      expect(positions.positions).toHaveLength(1);
      expect(positions.positions[0].plan_id).toBe('usdt-flex');
      expect(positions.positions[0].amount).toBe(100);
      expect(audit).toHaveBeenCalledWith('staker', 'staking_subscribe', expect.stringContaining('plan=usdt-flex'));
    } finally { server.close(); store.close(); }
  });

  it('replaying the same Idempotency-Key does not double-debit', async () => {
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('replayer');
      const before = ledger.getBalanceSync('replayer', 'USDT');
      const first = await post(base, { userId: 'replayer', planId: 'usdt-flex', amount: 25 }, 'same-key');
      expect(first.status).toBe(201);
      const second = await post(base, { userId: 'replayer', planId: 'usdt-flex', amount: 25 }, 'same-key');
      expect(second.status).toBe(201);
      expect((await second.json() as any).replayed).toBe(true);
      expect(ledger.getBalanceSync('replayer', 'USDT')).toBeCloseTo(before - 25, 6);
      const positions: any = await (await fetch(`${base}/api/staking/positions?userId=replayer`)).json();
      expect(positions.positions).toHaveLength(1);
    } finally { server.close(); store.close(); }
  });

  it('mutations require an Idempotency-Key', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await post(base, { userId: 'x', planId: 'usdt-flex', amount: 10 });
      expect(res.status).toBe(400);
    } finally { server.close(); store.close(); }
  });

  it('rejects unknown plan, below-minimum, and insufficient balance', async () => {
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('broke');
      expect((await post(base, { userId: 'broke', planId: 'nope', amount: 10 }, 'k1')).status).toBe(400);
      expect((await post(base, { userId: 'broke', planId: 'usdt-30', amount: 1 }, 'k2')).status).toBe(422); // min 50
      expect((await post(base, { userId: 'broke', planId: 'usdt-flex', amount: 1e11 }, 'k3')).status).toBe(422); // > funds
    } finally { server.close(); store.close(); }
  });

  it('positions are scoped to the requested user', async () => {
    const { base, server, store, ledger } = await boot();
    try {
      await ledger.initializeDemoAccount('a');
      await ledger.initializeDemoAccount('b');
      await post(base, { userId: 'a', planId: 'usdt-flex', amount: 30 }, 'ka');
      const a: any = await (await fetch(`${base}/api/staking/positions?userId=a`)).json();
      const b: any = await (await fetch(`${base}/api/staking/positions?userId=b`)).json();
      expect(a.positions).toHaveLength(1);
      expect(b.positions).toHaveLength(0);
    } finally { server.close(); store.close(); }
  });
});
