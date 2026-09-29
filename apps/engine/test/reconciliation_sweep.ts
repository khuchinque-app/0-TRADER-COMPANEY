// Standalone reconciliation sweep — TRADE, then reconcile.
//
// Honesty rule (learned the hard way): reconciling never-traded seed
// accounts proves nothing (that was this script's old false-green). It now
// executes real fills through Matcher + Ledger.settleBatch, then runs the
// journal-replay reconciler and a venue-conservation check, exiting
// non-zero on any divergence.
//
// Run: cd apps/engine && npx tsx test/reconciliation_sweep.ts

import { SQLiteLedgerStore } from '../src/ledger/sqlite-store';
import { Reconciler } from '../src/ledger/reconciliation';
import { Ledger } from '../src/ledger/ledger';
import { Matcher } from '../src/matching/matcher';
import { DEMO_FUNDS_USDT } from '@trading/shared';
import type { Fill, Order } from '@trading/shared';

async function main(): Promise<void> {
  const store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const reconciler = new Reconciler(store);

  const userIds = ['demo_user_1', 'demo_user_2'];
  for (const uid of userIds) {
    await ledger.initializeDemoAccount(uid);
  }
  const matcher = new Matcher({
    getBalance: (uid, asset) => store.getBalanceSync(uid, asset),
  });
  matcher.initPair('BTCUSDT', 50000);

  // --- Execute real trading activity -------------------------------------
  // Maker rests a sell, taker buys into it; then market sweeps both ways.
  matcher.placeOrder('demo_user_1', 'BTCUSDT', 'sell', 'limit', 50000, 0.2);
  matcher.placeOrder('demo_user_2', 'BTCUSDT', 'buy', 'market', 0, 0.1);
  matcher.placeOrder('demo_user_1', 'BTCUSDT', 'buy', 'market', 0, 0.05);
  matcher.placeOrder('demo_user_2', 'BTCUSDT', 'sell', 'limit', 51000, 0.3);

  const batches = matcher.drainPendingSettlements();
  await ledger.settleBatch(batches as { order: Order; fills: Fill[] }[]);
  console.log(`Settled ${batches.length} orders, ` +
    `${batches.reduce((n, b) => n + b.fills.length, 0)} fill legs.`);

  // --- Reconcile (journal replay vs stored balances) ----------------------
  let allOk = true;
  for (const uid of userIds) {
    const result = await reconciler.reconcile(uid);
    console.log(`\n=== Reconciliation: ${uid} ===`);
    console.log(`OK: ${result.ok}`);
    if (result.errors.length) {
      console.log('Errors:\n  ' + result.errors.join('\n  '));
      allOk = false;
    }
    if (result.warnings.length) {
      console.log('Warnings:\n  ' + result.warnings.join('\n  '));
    }
  }

  // --- Venue-level conservation -------------------------------------------
  // Σ(USDT deltas) across users must be <= seeded total: user-vs-user trades
  // cancel, venue fees burn user USDT, nothing mints it.
  let totalUsdt = 0;
  for (const uid of userIds) {
    const row = store.db.prepare(`
      SELECT b.available FROM balances b
      JOIN accounts a ON b.account_id = a.id
      WHERE a.user_id = ? AND b.asset = 'USDT'
    `).get(uid) as { available: number } | undefined;
    totalUsdt += row?.available ?? 0;
  }
  const seeded = userIds.length * DEMO_FUNDS_USDT;
  const leak = totalUsdt - seeded;
  console.log(`\nVenue USDT: ${totalUsdt.toFixed(2)} (seeded ${seeded}) -> net ${leak.toFixed(2)} (must be <= 0: fees only burn user USDT)`);
  if (leak > 1e-6) {
    console.log('VIOLATION: venue created USDT out of nothing');
    allOk = false;
  }

  store.close();
  console.log(allOk ? '\nSWEEP PASS' : '\nSWEEP FAIL');
  process.exit(allOk ? 0 : 1);
}

main().catch(e => { console.error('Sweep crashed:', e); process.exit(1); });
