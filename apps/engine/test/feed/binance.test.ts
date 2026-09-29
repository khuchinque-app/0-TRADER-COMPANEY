import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BinanceFeed } from '../../src/feed/binance';
import type { TickEvent, Candle, Ticker, OrderBook } from '@trading/shared';

describe('BinanceFeed', () => {
  let feed: BinanceFeed;

  beforeEach(() => {
    feed = new BinanceFeed();
  });

  afterEach(() => {
    feed.close();
  });

  describe('fetchKlines', () => {
    it('returns valid candle array for BTCUSDT 5m', async () => {
      const klines = await feed.fetchKlines('BTCUSDT', '5m', 10);
      expect(Array.isArray(klines)).toBe(true);
      expect(klines.length).toBeGreaterThan(0);
      const first = klines[0];
      expect(first).toHaveProperty('openTime');
      expect(typeof first.open).toBe('number');
      expect(typeof first.high).toBe('number');
      expect(typeof first.low).toBe('number');
      expect(typeof first.close).toBe('number');
      expect(typeof first.volume).toBe('number');
    });
  });

  describe('fetchTicker', () => {
    it('returns ticker with required fields for BTCUSDT', async () => {
      const ticker = await feed.fetchTicker('BTCUSDT');
      expect(ticker.symbol).toBe('BTCUSDT');
      expect(typeof ticker.lastPrice).toBe('number');
      expect(typeof ticker.priceChangePercent).toBe('number');
      expect(typeof ticker.highPrice).toBe('number');
      expect(typeof ticker.lowPrice).toBe('number');
      expect(typeof ticker.volume).toBe('number');
    });
  });

  describe('fetchOrderBook', () => {
    it('returns order book with asks and bids', async () => {
      const book = await feed.fetchOrderBook('BTCUSDT', 5);
      expect(book.symbol).toBe('BTCUSDT');
      expect(Array.isArray(book.asks)).toBe(true);
      expect(Array.isArray(book.bids)).toBe(true);
      expect(book.asks.length).toBeGreaterThan(0);
      expect(book.bids.length).toBeGreaterThan(0);
      // Check all prices are positive numbers
      book.asks.forEach(a => {
        expect(typeof a.price).toBe('number');
        expect(a.price).toBeGreaterThan(0);
      });
      book.bids.forEach(b => {
        expect(typeof b.price).toBe('number');
        expect(b.price).toBeGreaterThan(0);
      });
    });
  });

  describe('onTick', () => {
    it('emits tick events', async () => {
      const events: TickEvent[] = [];
      const unsubscribe = feed.onTick((event) => events.push(event));

      // Wait longer for WS connection and events
      await new Promise<void>(resolve => setTimeout(resolve, 3000));

      if (events.length > 0) {
        const first = events[0];
        expect(typeof first.symbol).toBe('string');
        expect(typeof first.price).toBe('number');
        expect(typeof first.timestamp).toBe('number');
        expect(typeof first.isBuyerMaker).toBe('boolean');
      }

      unsubscribe();
    });
  });

  describe('klines cache freshness', () => {
    // Regression guard: the REST cache used to warm up once at connect and
    // never again, so a long-running engine served 17h-stale candles while
    // the ticker kept moving. After one refresh interval the served klines
    // MUST have advanced; otherwise this test fails.
    it('advances the served klines within one refresh interval', async () => {
      const unsubscribe = feed.onTick(() => {}); // triggers connect + warm-up

      const waitFor = async (cond: () => boolean, timeoutMs: number, what: string) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (cond()) return;
          await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error(`timed out waiting for ${what}`);
      };

      // 1) Initial warm-up must land before the loop can be judged.
      await waitFor(() => feed.getKlines('BTCUSDT').length > 0, 30_000, 'initial klines warm-up');
      const initial = feed.getKlines('BTCUSDT');
      const initialLast = initial[initial.length - 1].openTime;

      // 2) Within one refresh interval (+ slack) the last candle must move.
      await waitFor(() => {
        const k = feed.getKlines('BTCUSDT');
        return k.length > 0 && k[k.length - 1].openTime > initialLast;
      }, 90_000, 'klines refresh within one interval');

      // 3) Served klines stay chart-safe: ascending order, valid shapes.
      const fresh = feed.getKlines('BTCUSDT');
      for (let i = 1; i < fresh.length; i++) {
        expect(fresh[i].openTime).toBeGreaterThanOrEqual(fresh[i - 1].openTime);
      }
      for (const c of fresh.slice(-5)) {
        expect(typeof c.open).toBe('number');
        expect(typeof c.high).toBe('number');
        expect(typeof c.low).toBe('number');
        expect(typeof c.close).toBe('number');
        expect(c.high).toBeGreaterThanOrEqual(c.low);
      }

      unsubscribe();
    }, 150_000);
  });
});
