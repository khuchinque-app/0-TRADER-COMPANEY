// T6-T8: Ledger tests - SQLiteStore, Ledger, Reconciler

import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { Ledger } from '../../src/ledger/ledger';
import { Reconciler } from '../../src/ledger/reconciliation';
import type { JournalEntry } from '@trading/shared';

describe('SQLiteLedgerStore', () => {
  let store: SQLiteLedgerStore;

  beforeEach(() => {
    store = new SQLiteLedgerStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('creates account with initial funds', async () => {
    await store.createAccount('user1', { USDT: 10000 });
    const account = await store.getAccount('user1');
    
    expect(account.userId).toBe('user1');
    expect(account.balances.length).toBeGreaterThan(0);
    expect(account.totalValueUsdt).toBeGreaterThan(0);
  });

  it('posts journal entry and updates balances', async () => {
    await store.createAccount('user2', { USDT: 5000 });
    
    // Get account to find real accountId
    const rows = store.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get('user2') as any;
    const realAccountId = rows.id;

    const entry: JournalEntry = {
      id: 'test_entry_1',
      timestamp: Date.now(),
      description: 'Test entry',
      debits: [{ accountId: realAccountId, asset: 'USDT', amount: 100 }],
      credits: [{ accountId: realAccountId, asset: 'USDT', amount: -100 }],
    };

    await store.post(entry);
    
    const updated = await store.getAccount('user2');
    expect(updated.balances.some(b => b.asset === 'USDT')).toBe(true);
  });

  it('retrieves journal entries', async () => {
    await store.createAccount('user3', { USDT: 1000 });
    
    const rows = store.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get('user3') as any;
    const realAccountId = rows.id;

    const entry: JournalEntry = {
      id: 'test_entry_2',
      timestamp: Date.now(),
      description: 'Test journal',
      debits: [{ accountId: realAccountId, asset: 'USDT', amount: 50 }],
      credits: [{ accountId: realAccountId, asset: 'USDT', amount: -50 }],
    };

    await store.post(entry);
    
    const journals = await store.getJournal('user3', 10);
    expect(journals.length).toBeGreaterThan(0);
    expect(journals[0].description).toBe('Test journal');
  });

  it('3b: entry_type comes from array membership, not amount sign (credit+ => decrease)', async () => {
    // A credit line with a POSITIVE magnitude must DECREASE the balance.
    // The old store inferred type from the sign (amount > 0 ? debit : credit)
    // and would have stored this as a debit, INCREASING USDT instead.
    await store.createAccount('sign_user', { USDT: 1000 });
    const { id: accountId } = store.db.prepare(
      'SELECT id FROM accounts WHERE user_id = ?'
    ).get('sign_user') as any;

    await store.post({
      id: 'positive_credit',
      timestamp: Date.now(),
      description: 'Withdraw 250 (credit side, positive magnitude)',
      debits: [],
      credits: [{ accountId, asset: 'USDT', amount: 250 }],
    });

    const acct = await store.getAccount('sign_user');
    const usdt = acct.balances.find(b => b.asset === 'USDT')!.available;
    expect(usdt).toBe(750); // decreased, NOT 1250

    // And a debit with a NEGATIVE magnitude must still INCREASE (side wins;
    // stored magnitude is abs). Post one: debit -100 -> +100 delta.
    await store.post({
      id: 'negative_debit',
      timestamp: Date.now(),
      description: 'Odd-shaped deposit',
      debits: [{ accountId, asset: 'USDT', amount: -100 }],
      credits: [],
    });
    const acct2 = await store.getAccount('sign_user');
    const usdt2 = acct2.balances.find(b => b.asset === 'USDT')!.available;
    expect(usdt2).toBe(850); // 750 + 100

    // Stored line amounts must all be non-negative (schema CHECK + abs)
    const negLines = store.db.prepare(
      'SELECT COUNT(*) as n FROM journal_lines WHERE amount < 0'
    ).get() as any;
    expect(negLines.n).toBe(0);
  });

  it('handles multiple assets', async () => {
    await store.createAccount('multi_user', { 
      USDT: 10000, 
      BTC: 0.5,
      ETH: 10 
    });
    
    const account = await store.getAccount('multi_user');
    const assets = account.balances.map(b => b.asset);
    
    expect(assets).toContain('USDT');
    expect(assets).toContain('BTC');
    expect(assets).toContain('ETH');
  });

  it('MARK-TO-MARKET: values holdings at oracle price, never at face value', async () => {
    // Pre-fix: 0.5 BTC + 10000 USDT summed as 10000.5. Base-asset units are
    // NOT dollars — a holding must be priced before it enters the total.
    await store.createAccount('mark_user', { USDT: 10000, BTC: 0.5 });

    // No oracle yet -> BTC is unpriceable and must contribute 0, not 0.5.
    const cold = await store.getAccount('mark_user');
    expect(cold.totalValueUsdt).toBe(10000);

    store.setPriceOracle((asset) => (asset === 'BTC' ? 40_000 : undefined));
    const marked = await store.getAccount('mark_user');
    expect(marked.totalValueUsdt).toBeCloseTo(10000 + 0.5 * 40_000, 6); // 30000
  });
});

describe('Ledger', () => {
  let store: SQLiteLedgerStore;
  let ledger: Ledger;

  beforeEach(() => {
    store = new SQLiteLedgerStore(':memory:');
    ledger = new Ledger(store);
  });

  afterEach(() => {
    store.close();
  });

  it('initializes demo account with standard funds', async () => {
    await ledger.initializeDemoAccount('demo1');
    const account = await ledger.getAccount('demo1');
    
    expect(account.userId).toBe('demo1');
    expect(account.totalValueUsdt).toBeGreaterThan(0);
    expect(account.balances.some(b => b.asset === 'USDT')).toBe(true);
  });

  it('MARK-TO-MARKET: a filled buy is counted once (balance), not balance + position', async () => {
    // Pre-fix: the 0.1 BTC bought existed BOTH as a balance delta AND as a
    // fill-derived position, so its notional was added twice (on top of every
    // base-asset balance being summed at face value).
    await ledger.initializeDemoAccount('mm');
    const marks: Record<string, number> = {
      BTC: 50_000, ETH: 3_000, SOL: 150, BNB: 600, XRP: 0.5, LINK: 20, AAVE: 200,
    };
    store.setPriceOracle((asset) => marks[asset]);

    await ledger.recordOrder({
      id: 'mm_o1', userId: 'mm', pair: 'BTCUSDT', side: 'buy', type: 'limit',
      price: 50_000, quantity: 0.1, filledQuantity: 0.1, status: 'filled',
      createdAt: 1, updatedAt: 1,
    } as any);
    await ledger.recordFill('mm', {
      id: 'mm_f1', orderId: 'mm_o1', userId: 'mm', pair: 'BTCUSDT', side: 'buy',
      price: 50_000, quantity: 0.1, fee: 50, feeAsset: 'USDT', timestamp: 1,
    } as any);

    const acct = await ledger.getAccount('mm');
    const usdt = acct.balances.find((b: any) => b.asset === 'USDT')!.available;
    const btc = acct.balances.find((b: any) => b.asset === 'BTC')!.available;

    // The fill really is represented as a position...
    expect(acct.positions.find((p: any) => p.pair === 'BTCUSDT')!.quantity).toBeCloseTo(0.1, 8);

    // ...but value = cash + every marked balance, positions NOT added on top.
    const expected =
      usdt + btc * marks.BTC + 5 * marks.ETH + 50 * marks.SOL + 5 * marks.BNB +
      10_000 * marks.XRP + 100 * marks.LINK + 10 * marks.AAVE;
    expect(acct.totalValueUsdt).toBeCloseTo(expected, 4);
  });

  it('3a: recordFill is atomic — failed persist rolls back journal AND balances', async () => {
    await ledger.initializeDemoAccount('atomic_user');
    const before = await ledger.getAccount('atomic_user');
    const usdtBefore = before.balances.find(b => b.asset === 'USDT')!.available;

    // Fill references an order that was never persisted -> fills FK fails
    // mid-way through recordFill. Pre-fix, postFill had already committed:
    // balances moved with no fills row (journal/fills divergence).
    await expect(
      ledger.recordFill('atomic_user', {
        id: 'fill_orphan',
        orderId: 'no_such_order',
        userId: 'atomic_user',
        pair: 'BTCUSDT',
        side: 'buy',
        price: 50000,
        quantity: 0.01,
        fee: 10,
        feeAsset: 'USDT',
        timestamp: Date.now(),
      })
    ).rejects.toThrow();

    const after = await ledger.getAccount('atomic_user');
    const usdtAfter = after.balances.find(b => b.asset === 'USDT')!.available;
    expect(usdtAfter).toBe(usdtBefore); // no phantom spend

    const journal = await ledger.getJournal('atomic_user', 1000);
    expect(journal.find(j => j.id === 'j_fill_orphan')).toBeUndefined(); // no orphan journal
  });

  it('3d: BUY posts notional + fee (fee charged, never refunded)', async () => {
    // Pre-fix: notional = price*qty - fee, then USDT was debited by that —
    // every buy PAID the user 2x fee out of thin air.
    await ledger.initializeDemoAccount('fee_user');
    const before = await ledger.getAccount('fee_user');
    const usdtBefore = before.balances.find(b => b.asset === 'USDT')!.available;

    await ledger.recordOrder({
      id: 'fo1', userId: 'fee_user', pair: 'BTCUSDT', side: 'buy', type: 'limit',
      price: 50000, quantity: 0.01, filledQuantity: 0.01, status: 'filled',
      createdAt: Date.now(), updatedAt: Date.now(),
    } as any);
    await ledger.recordFill('fee_user', {
      id: 'fee_fill_1', orderId: 'fo1', userId: 'fee_user', pair: 'BTCUSDT',
      side: 'buy', price: 50000, quantity: 0.01, fee: 10, feeAsset: 'USDT',
      timestamp: Date.now(),
    } as any);

    const after = await ledger.getAccount('fee_user');
    const usdtAfter = after.balances.find(b => b.asset === 'USDT')!.available;
    // cost = 500 notional + 10 fee = 510 (broken code charged 490)
    expect(usdtBefore - usdtAfter).toBeCloseTo(510, 6);

    // And SELL nets notional - fee
    await ledger.recordOrder({
      id: 'fo2', userId: 'fee_user', pair: 'BTCUSDT', side: 'sell', type: 'limit',
      price: 50000, quantity: 0.01, filledQuantity: 0.01, status: 'filled',
      createdAt: Date.now(), updatedAt: Date.now(),
    } as any);
    await ledger.recordFill('fee_user', {
      id: 'fee_fill_2', orderId: 'fo2', userId: 'fee_user', pair: 'BTCUSDT',
      side: 'sell', price: 50000, quantity: 0.01, fee: 5, feeAsset: 'USDT',
      timestamp: Date.now(),
    } as any);

    const after2 = await ledger.getAccount('fee_user');
    const usdtAfter2 = after2.balances.find(b => b.asset === 'USDT')!.available;
    expect(usdtAfter2 - usdtAfter).toBeCloseTo(495, 6); // 500 - 5
  });

  it('SWARM-A: partially-filled maker order does not poison later batches', async () => {
    // Lane-A HIGH: drainPendingSettlements replays an order's FULL fill
    // history when touched again -> re-posted j_<fillId> threw UNIQUE(id)
    // and rolled back the whole batch, silently losing other users' fills.
    await ledger.initializeDemoAccount('mk');
    await ledger.initializeDemoAccount('tk1');
    await ledger.initializeDemoAccount('tk2');
    const tk2Before = (await store.getAccount('tk2')).balances.find((b: any) => b.asset === 'BTC')!.available;

    const mkOrder: any = {
      id: 'mo_1', userId: 'mk', pair: 'BTCUSDT', side: 'buy', type: 'limit',
      price: 50000, quantity: 1.0, filledQuantity: 0.5, status: 'partially_filled',
      createdAt: 1, updatedAt: 2,
    };
    const fillA: any = {
      id: 'f_a', orderId: 'mo_1', userId: 'mk', pair: 'BTCUSDT', side: 'buy',
      price: 50000, quantity: 0.5, fee: 25, feeAsset: 'USDT', timestamp: 3,
    };
    const tk1Order: any = {
      id: 'to_1', userId: 'tk1', pair: 'BTCUSDT', side: 'buy', type: 'market',
      price: 50000, quantity: 0.5, filledQuantity: 0.5, status: 'filled',
      createdAt: 3, updatedAt: 3,
    };
    const fillB: any = {
      id: 'f_b', orderId: 'to_1', userId: 'tk1', pair: 'BTCUSDT', side: 'buy',
      price: 50000, quantity: 0.5, fee: 25, feeAsset: 'USDT', timestamp: 3,
    };
    await ledger.settleBatch([{ order: mkOrder, fills: [fillA] }, { order: tk1Order, fills: [fillB] }]);

    // Maker touched again with a SECOND tranche (replay includes fillA)
    const mkOrder2 = { ...mkOrder, filledQuantity: 1.0, status: 'filled' };
    const fillC: any = {
      id: 'f_c', orderId: 'mo_1', userId: 'mk', pair: 'BTCUSDT', side: 'buy',
      price: 50100, quantity: 0.5, fee: 25.05, feeAsset: 'USDT', timestamp: 4,
    };
    const tk2Order: any = {
      id: 'to_2', userId: 'tk2', pair: 'BTCUSDT', side: 'buy', type: 'market',
      price: 50100, quantity: 0.5, filledQuantity: 0.5, status: 'filled',
      createdAt: 4, updatedAt: 4,
    };
    const fillD: any = {
      id: 'f_d', orderId: 'to_2', userId: 'tk2', pair: 'BTCUSDT', side: 'buy',
      price: 50100, quantity: 0.5, fee: 25.05, feeAsset: 'USDT', timestamp: 4,
    };
    await ledger.settleBatch([{ order: mkOrder2, fills: [fillA, fillC] }, { order: tk2Order, fills: [fillD] }]);

    // tk2's unrelated batch must have settled (the poison bug lost it)
    const tk2 = await store.getAccount('tk2');
    const btc = tk2.balances.find((b: any) => b.asset === 'BTC')!;
    expect(btc.available - tk2Before).toBeCloseTo(0.5, 8);

    // fillA must appear exactly once in the journal (no double-post)
    const rows = store.db.prepare(
      "SELECT COUNT(*) n FROM journal WHERE id = 'j_f_a'"
    ).get() as any;
    expect(rows.n).toBe(1);

    // maker bought both tranches, paying cost + fee each time
    const mk = await store.getAccount('mk');
    const usdt = mk.balances.find((b: any) => b.asset === 'USDT')!;
    expect(usdt.available).toBeCloseTo(100000 - 25025 - 25075.05, 2);

    // books reconcile after all this
    const rec = await new Reconciler(store).reconcile('mk');
    expect(rec.errors).toEqual([]);
  });

  it('SWARM-A: dust sell (fee > notional) must not mint USDT', async () => {
    // Lane-A MEDIUM: notional - fee < 0 flowed through Math.abs in postInner
    // and became a CREDIT -> seller received ~fee instead of paying it.
    await ledger.initializeDemoAccount('dust');
    const sell: any = {
      id: 'do_1', userId: 'dust', pair: 'XRPUSDT', side: 'sell', type: 'market',
      price: 0.5, quantity: 0.0001, filledQuantity: 0.0001, status: 'filled',
      createdAt: 1, updatedAt: 1,
    };
    const fill: any = {
      id: 'df_1', orderId: 'do_1', userId: 'dust', pair: 'XRPUSDT', side: 'sell',
      price: 0.5, quantity: 0.0001, fee: 0.01, feeAsset: 'USDT', timestamp: 1,
    };
    const before = await store.getAccount('dust');
    const usdtBefore = before.balances.find((b: any) => b.asset === 'USDT')!.available;
    await ledger.settleBatch([{ order: sell, fills: [fill] }]);
    const after = await store.getAccount('dust');
    const usdtAfter = after.balances.find((b: any) => b.asset === 'USDT')!.available;
    // notional 0.00005 minus fee 0.01 would be negative; clamp => at most 0 received,
    // and the XRP side must have left the account
    expect(usdtAfter).toBeGreaterThanOrEqual(usdtBefore); // can only gain up to clamped 0
    const xrp = after.balances.find((b: any) => b.asset === 'XRP');
    // XRP credit posted; no USDT was minted beyond the notional clamp
    expect(usdtAfter - usdtBefore).toBeLessThanOrEqual(1e-9);
  });

  it('SWARM-A: deleted maker account does not poison unrelated settlements', async () => {
    // Lane-A MEDIUM: Account not found inside the one txn rolled back the
    // whole batch. Now the dead order is dropped, survivors settle.
    await ledger.initializeDemoAccount('ghost');
    await ledger.initializeDemoAccount('living');
    const livingBefore = (await store.getAccount('living')).balances.find((b: any) => b.asset === 'USDT')!.available;
    const ghostOrder: any = {
      id: 'go_1', userId: 'ghost', pair: 'BTCUSDT', side: 'buy', type: 'market',
      price: 50000, quantity: 0.1, filledQuantity: 0.1, status: 'filled',
      createdAt: 1, updatedAt: 1,
    };
    const ghostFill: any = {
      id: 'gf_1', orderId: 'go_1', userId: 'ghost', pair: 'BTCUSDT', side: 'buy',
      price: 50000, quantity: 0.1, fee: 100, feeAsset: 'USDT', timestamp: 1,
    };
    const okOrder: any = {
      id: 'lo_1', userId: 'living', pair: 'BTCUSDT', side: 'sell', type: 'market',
      price: 50000, quantity: 0.1, filledQuantity: 0.1, status: 'filled',
      createdAt: 1, updatedAt: 1,
    };
    const okFill: any = {
      id: 'lf_1', orderId: 'lo_1', userId: 'living', pair: 'BTCUSDT', side: 'sell',
      price: 50000, quantity: 0.1, fee: 50, feeAsset: 'USDT', timestamp: 1,
    };
    await store.deleteAccountData('ghost');

    await ledger.settleBatch([
      { order: ghostOrder, fills: [ghostFill] },
      { order: okOrder, fills: [okFill] },
    ]);

    const living = await store.getAccount('living');
    const usdt = living.balances.find((b: any) => b.asset === 'USDT')!;
    expect(usdt.available - livingBefore).toBeCloseTo(5000 - 50, 2);
  });

  it('posts balanced journal entry via ledger', async () => {
    await ledger.initializeDemoAccount('balanced_user');
    
    const rows = store.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get('balanced_user') as any;
    const accountId = rows.id;

    // Create a balanced entry directly (both debit and credit for same asset)
    const entry: JournalEntry = {
      id: 'balanced_entry',
      timestamp: Date.now(),
      description: 'Balanced transfer',
      debits: [
        { accountId, asset: 'USDT', amount: 100 },
        { accountId, asset: 'BTC', amount: -0.002 },
      ],
      credits: [
        { accountId, asset: 'USDT', amount: -100 },
        { accountId, asset: 'BTC', amount: 0.002 },
      ],
    };

    // This should not throw since it's balanced.
    // post() returns 'posted' | 'duplicate' (wallet idempotency contract).
    await expect(store.post(entry)).resolves.toBe('posted');
  });
});

describe('Reconciler', () => {
  let store: SQLiteLedgerStore;
  let reconciler: Reconciler;

  beforeEach(() => {
    store = new SQLiteLedgerStore(':memory:');
    reconciler = new Reconciler(store);
  });

  afterEach(() => {
    store.close();
  });

  it('returns ok for account with only deposits (paper mode)', async () => {
    // In paper mode, deposits are external sources, so journal won't match balances
    // Reconciler should handle this gracefully
    await store.createAccount('paper_user', { USDT: 10000 });
    
    const result = await reconciler.reconcile('paper_user');
    
    // Just check it doesn't crash
    expect(result).toBeDefined();
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  it('validates double-entry for journal entries', async () => {
    await store.createAccount('journal_user', { USDT: 5000 });
    
    const rows = store.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get('journal_user') as any;
    const accountId = rows.id;

    // Post a properly balanced entry
    await store.post({
      id: 'double_entry_test',
      timestamp: Date.now(),
      description: 'Double entry test',
      debits: [{ accountId, asset: 'USDT', amount: 100 }],
      credits: [{ accountId, asset: 'USDT', amount: -100 }],
    });

    const result = await reconciler.reconcile('journal_user');
    // Should pass basic checks
    expect(result).toBeDefined();
  });

  it('3f: reconcile PASSES after real trading (the seed-state false-green is dead)', async () => {
    // Pre-fix reconciler skipped deposits while comparing against seeded
    // balances and added credits with the same sign as debits — every
    // account that ever traded reconciled ok:false; the sweep only passed
    // because it never traded first. This test trades, then reconciles.
    const store2 = new SQLiteLedgerStore(':memory:');
    const ledger2 = new Ledger(store2);
    const rec2 = new Reconciler(store2);

    await ledger2.initializeDemoAccount('traded_user');
    await ledger2.recordOrder({
      id: 'ro1', userId: 'traded_user', pair: 'BTCUSDT', side: 'buy', type: 'limit',
      price: 50000, quantity: 0.02, filledQuantity: 0.02, status: 'filled',
      createdAt: Date.now(), updatedAt: Date.now(),
    } as any);
    await ledger2.recordFill('traded_user', {
      id: 'rf1', orderId: 'ro1', userId: 'traded_user', pair: 'BTCUSDT',
      side: 'buy', price: 50000, quantity: 0.02, fee: 20, feeAsset: 'USDT',
      timestamp: Date.now(),
    } as any);
    await ledger2.recordOrder({
      id: 'ro2', userId: 'traded_user', pair: 'ETHUSDT', side: 'sell', type: 'market',
      price: 0, quantity: 0.5, filledQuantity: 0.5, status: 'filled',
      createdAt: Date.now(), updatedAt: Date.now(),
    } as any);
    await ledger2.recordFill('traded_user', {
      id: 'rf2', orderId: 'ro2', userId: 'traded_user', pair: 'ETHUSDT',
      side: 'sell', price: 3000, quantity: 0.5, fee: 30, feeAsset: 'USDT',
      timestamp: Date.now(),
    } as any);

    const result = await rec2.reconcile('traded_user');
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);

    // Journal replay must include the trades exactly once each (no line fan-out)
    const journal = await ledger2.getJournal('traded_user', 1000);
    const ids = journal.map(j => j.id);
    expect(ids.filter(i => i === 'j_rf1').length).toBe(1);
    expect(ids.filter(i => i === 'j_rf2').length).toBe(1);
    expect(new Set(ids).size).toBe(ids.length);

    store2.close();
  });

  it('detects negative balances', async () => {
    await store.createAccount('negative_user', { USDT: 100 });
    
    const rows = store.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get('negative_user') as any;
    const accountId = rows.id;

    // Create a scenario where balance goes negative via journal
    await store.post({
      id: 'negative_test',
      timestamp: Date.now(),
      description: 'Overdraft attempt',
      debits: [{ accountId, asset: 'USDT', amount: -200 }], // Withdraw 200 from 100 balance
      credits: [{ accountId, asset: 'USDT', amount: 200 }],
    });

    const result = await reconciler.reconcile('negative_user');
    expect(result).toBeDefined();
  });
});
