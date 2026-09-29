// T3: Tests for synthetic book

import { describe, it, expect } from 'vitest';
import { createSyntheticBook, updateBookMid } from '../../src/matching/synthetic-book';

describe('Synthetic Book', () => {
  describe('createSyntheticBook', () => {
    it('creates asks above mid and bids below', () => {
      const book = createSyntheticBook('BTCUSDT', 50000, { depth: 5 });

      const bestAsk = book.asks[0].price;
      const bestBid = book.bids[0].price;

      expect(bestAsk).toBeGreaterThan(50000);
      expect(bestBid).toBeLessThan(50000);
    });

    it('returns 20 levels by default', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);
      expect(book.asks.length).toBe(20);
      expect(book.bids.length).toBe(20);
    });

    it('depth parameter controls book depth', () => {
      const book = createSyntheticBook('BTCUSDT', 50000, { depth: 10 });
      expect(book.asks.length).toBe(10);
      expect(book.bids.length).toBe(10);
    });

    it('asks are sorted ascending, bids descending', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);

      for (let i = 1; i < book.asks.length; i++) {
        expect(book.asks[i].price).toBeGreaterThan(book.asks[i - 1].price);
      }

      for (let i = 1; i < book.bids.length; i++) {
        expect(book.bids[i].price).toBeLessThan(book.bids[i - 1].price);
      }
    });

    it('quantities increase with depth', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);

      // Ask quantities should generally increase
      for (let i = 1; i < Math.min(5, book.asks.length); i++) {
        expect(book.asks[i].quantity).toBeGreaterThanOrEqual(book.asks[i - 1].quantity);
      }
    });
  });

  describe('updateBookMid', () => {
    it('scales prices proportionally when mid changes', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);
      const updated = updateBookMid(book, 55000); // 10% increase

      // Best ask should be ~10% higher
      const ratio = updated.asks[0].price / book.asks[0].price;
      expect(ratio).toBeCloseTo(1.1, 1);
    });

    it('decreases prices when mid drops', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);
      const updated = updateBookMid(book, 45000); // 10% decrease

      const ratio = updated.asks[0].price / book.asks[0].price;
      expect(ratio).toBeCloseTo(0.9, 1);
    });

    it('preserves quantities on update', () => {
      const book = createSyntheticBook('BTCUSDT', 50000);
      const originalAskQty = book.asks[0].quantity;

      const updated = updateBookMid(book, 52000);

      expect(updated.asks[0].quantity).toBe(originalAskQty);
    });

    it('3e: never re-prices resting user levels (orderId-tagged)', () => {
      // Old code multiplied EVERY level by the mid ratio, silently repricing
      // users' limit orders (49000 -> 58800 on a 20% move) and orphaning
      // their cancel state.
      const book = createSyntheticBook('BTCUSDT', 50000);
      book.bids.push({ price: 49000, quantity: 1, orderId: 'ord_x', userId: 'u1' });

      const updated = updateBookMid(book, 60000); // +20%

      const userLevel = updated.bids.find(l => l.orderId === 'ord_x');
      expect(userLevel!.price).toBe(49000); // unchanged
      // Synthetic depth DID move
      expect(updated.bids[0].price).toBeGreaterThan(49000);
    });
  });

  describe('3e: low-priced pairs', () => {
    it('XRP book has strictly positive bids (no negative prices)', () => {
      // Old code: absolute $1 minStep on a 0.62 mid drove bids to -4.98
      const book = createSyntheticBook('XRPUSDT', 0.62);

      for (const b of book.bids) expect(b.price).toBeGreaterThan(0);
      for (const a of book.asks) expect(a.price).toBeGreaterThan(0);
      // Properly crossed: best bid < best ask
      expect(book.bids[0].price).toBeLessThan(book.asks[0].price);
    });

    it('sub-dollar pairs keep enough price precision (4 decimals)', () => {
      const book = createSyntheticBook('XRPUSDT', 0.62);
      // Distinct levels must not collapse when rounded to 2dp
      const askPrices = new Set(book.asks.map(a => a.price));
      expect(askPrices.size).toBe(book.asks.length);
    });
  });
});
