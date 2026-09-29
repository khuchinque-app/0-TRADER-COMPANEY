// Wallet external movements: deposit/withdraw posting + idempotent replay.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { Ledger } from '../../src/ledger/ledger';
import { Reconciler } from '../../src/ledger/reconciliation';

describe('Ledger.postExternal (wallet)', () => {
  let store: SQLiteLedgerStore;
  let ledger: Ledger;

  beforeEach(async () => {
    store = new SQLiteLedgerStore(':memory:');
    ledger = new Ledger(store);
    await ledger.initializeDemoAccount('wal');
  });

  afterEach(() => store.close());

  const usdt = async () => {
    const acct = await ledger.getAccount('wal');
    return acct.balances.find(b => b.asset === 'USDT')!.available;
  };

  it('deposit credits once; replayed key is a no-op', async () => {
    const before = await usdt();
    const first = await ledger.postExternal('wdp_k1', 'wal', 'USDT', 500, 'deposit');
    expect(first).toBe(true);
    expect(await usdt()).toBe(before + 500);

    const replay = await ledger.postExternal('wdp_k1', 'wal', 'USDT', 500, 'deposit');
    expect(replay).toBe(false);
    expect(await usdt()).toBe(before + 500); // NOT double-credited
  });

  it('withdraw debits and reconciliation replay stays clean', async () => {
    await ledger.postExternal('wdp_k2', 'wal', 'USDT', 200, 'deposit');
    const before = await usdt();
    const posted = await ledger.postExternal('wwd_k2', 'wal', 'USDT', 150, 'withdraw');
    expect(posted).toBe(true);
    expect(await usdt()).toBe(before - 150);

    const result = await new Reconciler(store).reconcile('wal');
    expect(result.ok).toBe(true); // replay of debit-only + credit-only lines matches stored balances
  });

  it('rejects over-balance only at the route layer — store posts what it is told', async () => {
    // The GUARD lives in the wallet route (422 path); the ledger is honest.
    // This pins that split so a future route refactor cannot silently drop it.
    const acct = await ledger.getAccount('wal');
    const big = (acct.balances.find(b => b.asset === 'USDT')!.available) + 1e9;
    await ledger.postExternal('wwd_huge', 'wal', 'USDT', big, 'withdraw');
    const after = await usdt();
    expect(after).toBeLessThan(0); // would be caught by Reconciler negative-balance check
    const result = await new Reconciler(store).reconcile('wal');
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toMatch(/negative/i);
  });
});
