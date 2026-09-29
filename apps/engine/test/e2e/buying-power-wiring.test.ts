// Lane-B gap: every 3h gate test injects a stub provider. This file wires
// the gate the SAME way index.ts does (ledger.getBalanceSync over a real
// SQLite store) so a wiring bug — asset mapping, cache staleness, provider
// never invoked — fails here instead of silently disabling enforcement in
// production.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Matcher } from '../../src/matching/matcher';
import { Ledger } from '../../src/ledger/ledger';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';

describe('E2E: buying-power gate wired through the real ledger', () => {
  let store: SQLiteLedgerStore;
  let ledger: Ledger;
  let matcher: Matcher;

  beforeEach(async () => {
    store = new SQLiteLedgerStore(':memory:');
    ledger = new Ledger(store);
    // EXACTLY the index.ts:26-28 wiring
    matcher = new Matcher({
      getBalance: (userId, asset) => ledger.getBalanceSync(userId, asset),
    });
    matcher.initPair('BTCUSDT', 50000);
    await ledger.initializeDemoAccount('wired_alice');
    await ledger.initializeDemoAccount('wired_bob');
  });

  afterEach(() => store.close());

  it('overspend rejected against the REAL account (not a stub)', () => {
    // demo account has 100k USDT; a 3 BTC market buy costs >150k
    expect(() =>
      matcher.placeOrder('wired_alice', 'BTCUSDT', 'buy', 'market', 0, 3)
    ).toThrow(/Insufficient USDT/);
  });

  it('sell beyond REAL holdings rejected (asset mapping BTCUSDT->BTC works)', () => {
    const demoBtc = ledger.getBalanceSync('wired_alice', 'BTC');
    expect(demoBtc).toBeGreaterThan(0); // mapping works at all
    expect(() =>
      matcher.placeOrder('wired_alice', 'BTCUSDT', 'sell', 'limit', 51000, demoBtc * 3)
    ).toThrow(/Insufficient BTC/);
  });

  it('after a real settlement the spent USDT is gone: the gate uses moved balances', async () => {
    // Take enough liquidity to drain a big chunk of balance
    matcher.placeOrder('wired_alice', 'BTCUSDT', 'buy', 'market', 0, 1.5);
    const batch = matcher.drainPendingSettlements();
    await ledger.settleBatch(batch);

    const usdtLeft = ledger.getBalanceSync('wired_alice', 'USDT');
    expect(usdtLeft).toBeLessThan(100000); // money actually moved

    // A follow-up buy larger than what remains must fail on the NEW balance,
    // proving the gate reads live ledger state, not the initial 100k.
    const qtyTooBig = (usdtLeft / 50000) + 0.5;
    expect(() =>
      matcher.placeOrder('wired_alice', 'BTCUSDT', 'buy', 'market', 0, qtyTooBig)
    ).toThrow(/Insufficient USDT/);

    // and books still reconcile
    const { Reconciler } = await import('../../src/ledger/reconciliation');
    const rec = await new Reconciler(store).reconcile('wired_alice');
    expect(rec.errors).toEqual([]);
  });

  it('unknown user (no account) cannot trade at all', () => {
    // getBalanceSync returns 0 for unknown accounts -> gate blocks everything
    expect(() =>
      matcher.placeOrder('nobody', 'BTCUSDT', 'buy', 'market', 0, 0.001)
    ).toThrow(/Insufficient USDT/);
    expect(() =>
      matcher.placeOrder('nobody', 'BTCUSDT', 'sell', 'market', 0, 0.001)
    ).toThrow(/Insufficient BTC/);
  });
});
