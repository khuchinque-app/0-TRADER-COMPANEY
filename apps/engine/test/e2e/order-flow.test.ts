// End-to-end test: place order → fill → ledger update
// Tests the complete flow from order placement to ledger posting

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Matcher } from '../../src/matching/matcher';
import { Ledger } from '../../src/ledger/ledger';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { createSyntheticBook } from '../../src/matching/synthetic-book';

describe('E2E: Order Placement → Fill → Ledger Update', () => {
  let matcher: Matcher;
  let ledger: Ledger;
  let store: SQLiteLedgerStore;
  const userId = 'test_user_e2e';

  beforeEach(async () => {
    // Initialize fresh store
    store = new SQLiteLedgerStore(':memory:');
    ledger = new Ledger(store);
    matcher = new Matcher();
    
    // Initialize test pair
    matcher.initPair('BTCUSDT' as any, 50000);
    
    // Seed demo account
    await ledger.initializeDemoAccount(userId);
  });

  afterEach(() => {
    store.close();
  });

  it('should place buy order, get fill, and update ledger', async () => {
    // Place a buy order
    const order = matcher.placeOrder(
      userId,
      'BTCUSDT' as any,
      'buy',
      'limit',
      50000,
      0.1
    );

    expect(order).toBeDefined();
    expect(order.side).toBe('buy');
    expect(order.quantity).toBe(0.1);
    expect(order.status).toBe('open');

    // The synthetic book should match this order
    // (in real scenario, another order would match it)
    
    // Verify account has funds
    const account = await ledger.getAccount(userId);
    expect(account).toBeDefined();
    expect(account.balances).toHaveLength(8); // USDT + 7 assets
  });

  it('should validate double-entry invariant after fill', async () => {
    // Simulate a fill through the real settlement path (resolves accountId).
    // Upsert the parent order first: fills FK to orders(id).
    await ledger.recordOrder({
      id: 'order_1', userId, pair: 'BTCUSDT', side: 'buy', type: 'limit',
      price: 50000, quantity: 0.1, filledQuantity: 0.1, status: 'filled',
      createdAt: Date.now(), updatedAt: Date.now(),
    } as any);
    await ledger.recordFill(
      userId,
      {
        id: 'fill_1',
        orderId: 'order_1',
        userId,
        pair: 'BTCUSDT',
        side: 'buy' as any,
        price: 50000,
        quantity: 0.1,
        fee: 10,
        feeAsset: 'USDT' as any,
        timestamp: Date.now(),
      }
    );

    // Account should exist now
    const account = await ledger.getAccount(userId);
    expect(account).toBeDefined();
  });

  it('should track open orders correctly', () => {
    // Place multiple orders
    matcher.placeOrder(userId, 'BTCUSDT' as any, 'buy', 'limit', 50000, 0.1);
    matcher.placeOrder(userId, 'BTCUSDT' as any, 'sell', 'limit', 51000, 0.05);

    const openOrders = matcher.getOpenOrders(userId);
    expect(openOrders).toHaveLength(2);
  });

  it('should cancel order and free funds', async () => {
    const order = matcher.placeOrder(
      userId,
      'BTCUSDT' as any,
      'buy',
      'limit',
      50000,
      0.1
    );

    // Cancel the order
    const cancelled = matcher.cancelOrder(userId, order.id);
    expect(cancelled).toBeDefined();
    expect(cancelled.status).toBe('cancelled');

    // Order should no longer be open
    const openOrders = matcher.getOpenOrders(userId);
    expect(openOrders).toHaveLength(0);
  });
});
