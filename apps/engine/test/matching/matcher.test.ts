// T4: Tests for matching engine

import { describe, it, expect, beforeEach } from 'vitest';
import { Matcher } from '../../src/matching/matcher';
import type { Order, Fill } from '@trading/shared';

describe('Matcher', () => {
  let matcher: Matcher;

  beforeEach(() => {
    matcher = new Matcher({
      orderIdGenerator: () => 'test_ord_1',
      fillIdGenerator: () => 'test_fill_1',
    });
    matcher.initPair('BTCUSDT', 50000);
  });

  describe('Market Orders', () => {
    it('fills buy market order at best ask price', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'market', 0, 1);

      expect(order.status).toBe('filled');
      expect(order.filledQuantity).toBe(1);
      expect(order.price).toBe(0);

      const fills = matcher.getFills(order.id);
      expect(fills.length).toBeGreaterThan(0);
      expect(fills[0].price).toBeGreaterThan(50000); // Above mid
    });

    it('fills sell market order at best bid price', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'sell', 'market', 0, 1);

      expect(order.status).toBe('filled');
      expect(order.filledQuantity).toBe(1);

      const fills = matcher.getFills(order.id);
      expect(fills.length).toBeGreaterThan(0);
      expect(fills[0].price).toBeLessThan(50000); // Below mid
    });
  });

  describe('Limit Orders', () => {
    it('adds buy limit order to book when no match', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 49000, 1);

      expect(order.status).toBe('open');
      expect(order.price).toBe(49000);

      const openOrders = matcher.getOpenOrders('user1');
      expect(openOrders.length).toBe(1);
    });

    it('adds sell limit order to book when no match', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'sell', 'limit', 51000, 1);

      expect(order.status).toBe('open');
      expect(order.price).toBe(51000);
    });

    it('fills buy limit order when price matches ask', () => {
      // Place a sell limit at 50000
      matcher.placeOrder('user2', 'BTCUSDT', 'sell', 'limit', 50000, 1);

      // Place a buy limit at 50000 or above
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 50000, 1);

      expect(order.status).toBe('filled');
    });

    it('partial fill for limit order', () => {
      // Place a sell with quantity 2
      matcher.placeOrder('user2', 'BTCUSDT', 'sell', 'limit', 50000, 2);

      // Place a buy with quantity 1
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 50000, 1);

      expect(order.status).toBe('filled');
      expect(order.filledQuantity).toBe(1);
    });
  });

  describe('Cancel Orders', () => {
    it('cancels open limit order', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 49000, 1);
      expect(order.status).toBe('open');

      const cancelled = matcher.cancelOrder('user1', order.id);
      expect(cancelled).not.toBeNull();
      expect(cancelled!.status).toBe('cancelled');

      const openOrders = matcher.getOpenOrders('user1');
      expect(openOrders.length).toBe(0);
    });

    it('cannot cancel another user\'s order', () => {
      const order = matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 49000, 1);

      const cancelled = matcher.cancelOrder('user2', order.id);
      expect(cancelled).toBeNull();
    });
  });

  describe('Validation', () => {
    it('rejects order below minimum quantity', () => {
      expect(() => {
        matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 49000, 0.00001);
      }).toThrow();
    });

    it('rejects order above maximum quantity', () => {
      expect(() => {
        matcher.placeOrder('user1', 'BTCUSDT', 'buy', 'limit', 49000, 1001);
      }).toThrow();
    });

    it('3c: rejects NaN/Infinity quantity and NaN/nonpositive limit price', () => {
      // Old code: NaN passed BOTH <min and >max checks (NaN comparisons are false)
      expect(() => matcher.placeOrder('u', 'BTCUSDT', 'buy', 'limit', 50000, NaN)).toThrow();
      expect(() => matcher.placeOrder('u', 'BTCUSDT', 'sell', 'market', 0, Infinity)).toThrow();
      expect(() => matcher.placeOrder('u', 'BTCUSDT', 'buy', 'limit', NaN, 1)).toThrow();
      expect(() => matcher.placeOrder('u', 'BTCUSDT', 'buy', 'limit', 0, 1)).toThrow();
      expect(() => matcher.placeOrder('u', 'BTCUSDT', 'buy', 'limit', -5, 1)).toThrow();
    });
  });

  describe('3c money-state invariants', () => {
    // NOTE: the outer beforeEach uses a CONSTANT order-id generator
    // ('test_ord_1'), which would collide between two orders in one test.
    // Use a fresh Matcher with the default unique ids + spread-aware prices
    // (seed book: bestBid ~49975, bestAsk ~50025, so 50000 rests, 49900 crosses).
    let m: Matcher;
    beforeEach(() => {
      m = new Matcher();
      m.initPair('BTCUSDT', 50000);
    });

    it('market order larger than book depth is partially filled, never fake-full', () => {
      // Seeded BTC book holds ~664 total; order the max 1000.
      // Old code: status='filled', filledQuantity=1000 => 335 phantom BTC.
      const order = m.placeOrder('u1', 'BTCUSDT', 'buy', 'market', 0, 1000);

      const fills = m.getFills(order.id);
      const fillSum = fills.reduce((s, f) => s + f.quantity, 0);

      expect(order.filledQuantity).toBeCloseTo(fillSum, 9);
      expect(order.filledQuantity).toBeLessThan(order.quantity);
      expect(order.status).toBe('partially_filled');
    });

    it('partial limit keeps original quantity and rests only the remainder', () => {
      // Old code overwrote order.quantity with the resting remainder
      m.placeOrder('u2', 'BTCUSDT', 'sell', 'limit', 50000, 0.3); // rests (inside spread)
      const taker = m.placeOrder('u1', 'BTCUSDT', 'buy', 'limit', 50000, 1);

      expect(taker.quantity).toBe(1);           // NOT overwritten to 0.7
      expect(taker.filledQuantity).toBeCloseTo(0.3, 9);
      expect(taker.filledQuantity).toBeLessThanOrEqual(taker.quantity);
    });

    it('resting maker order gets its own fill when hit', () => {
      // Old code: BookLevel had no identity; the resting order received
      // NOTHING — taker got BTC, nobody debited it.
      const maker = m.placeOrder('u1', 'BTCUSDT', 'sell', 'limit', 50000, 0.5);
      const taker = m.placeOrder('u2', 'BTCUSDT', 'buy', 'limit', 50000, 0.5);

      const makerFills = m.getFills(maker.id);
      expect(makerFills.length).toBe(1);
      expect(makerFills[0].userId).toBe('u1');
      expect(makerFills[0].quantity).toBeCloseTo(0.5, 9);

      // Both legs present in the settlement drain (ws settles the batch)
      const batch = m.drainPendingSettlements();
      const ids = batch.map(b => b.order.id);
      expect(ids).toContain(maker.id);
      expect(ids).toContain(taker.id);
      expect(batch.find(b => b.order.id === maker.id)!.order.status).toBe('filled');
    });

    it('self-trade is prevented', () => {
      const resting = m.placeOrder('u1', 'BTCUSDT', 'sell', 'limit', 50000, 0.5);
      const taker = m.placeOrder('u1', 'BTCUSDT', 'buy', 'limit', 50000, 0.5);

      for (const f of m.getFills(taker.id)) {
        expect(f.counterOrderId).not.toBe(resting.id);
      }
      expect(resting.filledQuantity).toBe(0);
    });

    it('cancel removes only the canceller level; two same-price orders are independent', () => {
      // Old code matched levels by (price,qty) value equality: cancelling u1
      // removed BOTH identical levels.
      const a = m.placeOrder('u1', 'BTCUSDT', 'buy', 'limit', 49000, 1);
      m.placeOrder('u2', 'BTCUSDT', 'buy', 'limit', 49000, 1);

      m.cancelOrder('u1', a.id);

      const levels = m.getOrderBook('BTCUSDT')!.bids.filter(l => l.price === 49000);
      expect(levels.length).toBe(1);
      expect(levels[0].userId).toBe('u2');
    });

    it('settled orders cannot be cancelled (post-settlement flip guard)', () => {
      // Old code re-inserted fully-filled orders into openOrders, so a
      // filled order could be 'cancelled' afterwards and re-persisted.
      const maker = m.placeOrder('u1', 'BTCUSDT', 'sell', 'limit', 50000, 0.5);
      m.placeOrder('u2', 'BTCUSDT', 'buy', 'limit', 50000, 0.5);

      expect(maker.status).toBe('filled');
      expect(m.cancelOrder('u1', maker.id)).toBeNull();
    });
  });

  describe('Order Book', () => {
    it('3h: balance provider rejects overspend/oversell outright, keeps affordable flow', () => {
      // Old code: zero balance checks anywhere — sell 1000 BTC with 0.5 held,
      // unlimited paper shorting.
      const balances: Record<string, Record<string, number>> = {
        rich: { USDT: 100000, BTC: 0.5 },
        poor: { USDT: 100, BTC: 0 },
      };
      const m = new Matcher({
        getBalance: (userId, asset) => balances[userId]?.[asset] ?? 0,
      });
      m.initPair('BTCUSDT', 50000);

      // Oversell: poor holds 0 BTC -> rejected outright (venue semantics)
      expect(() => m.placeOrder('poor', 'BTCUSDT', 'sell', 'limit', 51000, 0.1)).toThrow(/Insufficient BTC/);
      // Overspend: poor has 100 USDT, best ask ~50025
      expect(() => m.placeOrder('poor', 'BTCUSDT', 'buy', 'market', 0, 0.01)).toThrow(/Insufficient USDT/);
      // rich can do both
      expect(() => m.placeOrder('rich', 'BTCUSDT', 'sell', 'limit', 51000, 0.1)).not.toThrow();
      expect(() => m.placeOrder('rich', 'BTCUSDT', 'buy', 'market', 0, 0.001)).not.toThrow();
      // Oversell beyond holdings rejected
      expect(() => m.placeOrder('rich', 'BTCUSDT', 'sell', 'market', 0, 1000)).toThrow(/Insufficient BTC/);
    });

    it('3h: market buy reserves cost across the swept depth, not just best ask', () => {
      // Sweeping deep levels costs more than qty*bestAsk — a naive check
      // would let 12,000 USDT eat a ~12,560 sweep (0.25 BTC over 2 levels).
      const balances = { edge: { USDT: 12000 } };
      const m = new Matcher({
        getBalance: (u, a) => (balances as any)[u]?.[a] ?? 0,
      });
      m.initPair('BTCUSDT', 50000);
      // 0.25 BTC sweeps ask levels totalling ~12,560 incl. fee -> reject
      expect(() => m.placeOrder('edge', 'BTCUSDT', 'buy', 'market', 0, 0.25)).toThrow(/Insufficient USDT/);
      // 0.2 BTC sweeps the first levels only (~10,048 incl. fee) -> accept
      expect(() => m.placeOrder('edge', 'BTCUSDT', 'buy', 'market', 0, 0.2)).not.toThrow();
    });

    it('3h: without a provider (default config) behavior is unchanged', () => {
      const m = new Matcher();
      m.initPair('BTCUSDT', 50000);
      expect(() => m.placeOrder('anon', 'BTCUSDT', 'sell', 'market', 0, 1)).not.toThrow();
    });

    it('SWARM-A: two resting bids cannot double-spend the same USDT', () => {
      // Lane-A probe: two big resting bids each passed the gate against the
      // same USDT and filled to a negative balance.
      const balances: Record<string, Record<string, number>> = {
        alice: { USDT: 80000, BTC: 0 },
      };
      const m = new Matcher({
        getBalance: (u, a) => balances[u]?.[a] ?? 0,
      });
      m.initPair('BTCUSDT', 50000);

      // 0.9 @ 49000 = 44.1k (below best bid -> rests)
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'buy', 'limit', 49000, 0.9)).not.toThrow();
      // Second 44.1k bid: reserved 44.1k + 44.1k > 80k -> reject
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'buy', 'limit', 49000, 0.9)).toThrow(/Insufficient USDT/);
      // A small bid fitting the remainder is fine
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'buy', 'limit', 49000, 0.3)).not.toThrow();
    });

    it('SWARM-A: two resting asks cannot oversell the same base coins', () => {
      // Lane-A mirror: 0.5 BTC held, two 0.45 asks both accepted -> BTC -0.4
      const balances: Record<string, Record<string, number>> = {
        alice: { USDT: 0, BTC: 0.5 },
      };
      const m = new Matcher({
        getBalance: (u, a) => balances[u]?.[a] ?? 0,
      });
      m.initPair('BTCUSDT', 50000);

      expect(() => m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.45)).not.toThrow();
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.45)).toThrow(/Insufficient BTC/);
      // exactly the remaining 0.05 is fine
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.05)).not.toThrow();
    });

    it('SWARM-A: cancel releases the reservation', () => {
      const balances: Record<string, Record<string, number>> = {
        alice: { USDT: 60000, BTC: 0.5 },
      };
      const m = new Matcher({
        getBalance: (u, a) => balances[u]?.[a] ?? 0,
      });
      m.initPair('BTCUSDT', 50000);
      const o1 = m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.5);
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.1)).toThrow(/Insufficient/);
      m.cancelOrder('alice', o1.id);
      expect(() => m.placeOrder('alice', 'BTCUSDT', 'sell', 'limit', 51000, 0.5)).not.toThrow();
    });

    it('returns order book for initialized pair', () => {
      const book = matcher.getOrderBook('BTCUSDT');
      expect(book).not.toBeNull();
      expect(book!.asks.length).toBeGreaterThan(0);
      expect(book!.bids.length).toBeGreaterThan(0);
    });

    it('returns null for uninitialized pair', () => {
      const book = matcher.getOrderBook('ETHUSDT');
      expect(book).toBeNull();
    });
  });
});
