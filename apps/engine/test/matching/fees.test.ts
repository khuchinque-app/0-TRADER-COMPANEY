// T5: Tests for fee schedule

import { describe, it, expect } from 'vitest';
import { calculateFee, getFeeSchedule, isMakerOrder, DEFAULT_FEE_SCHEDULE } from '../../src/matching/fees';
import { Matcher } from '../../src/matching/matcher';
import type { Fill } from '@trading/shared';

describe('Fee Schedule', () => {
  describe('calculateFee', () => {
    it('calculates maker fee correctly', () => {
      const fee = calculateFee(1, 50000, true);
      expect(fee).toBeCloseTo(50, 0.1); // 1 * 50000 * 0.001 = 50
    });

    it('calculates taker fee correctly', () => {
      const fee = calculateFee(1, 50000, false);
      expect(fee).toBeCloseTo(100, 0.1); // 1 * 50000 * 0.002 = 100
    });

    it('applies minimum fee', () => {
      const fee = calculateFee(0.0001, 50000, false);
      expect(fee).toBeGreaterThanOrEqual(0.01); // minFee = 0.01
    });

    it('uses custom schedule', () => {
      const customSchedule = {
        ...DEFAULT_FEE_SCHEDULE,
        maker: 0.0005,
        taker: 0.001,
      };
      const fee = calculateFee(1, 50000, true, customSchedule);
      expect(fee).toBeCloseTo(25, 0.1); // 1 * 50000 * 0.0005 = 25
    });
  });

  describe('getFeeSchedule', () => {
    it('returns default schedule', () => {
      const schedule = getFeeSchedule();
      expect(schedule).toEqual(DEFAULT_FEE_SCHEDULE);
    });

    it('returns same schedule for any pair', () => {
      const schedule1 = getFeeSchedule('BTCUSDT');
      const schedule2 = getFeeSchedule('ETHUSDT');
      expect(schedule1).toEqual(schedule2);
    });
  });

  describe('isMakerOrder', () => {
    it('returns true for buy below best bid', () => {
      // Buy at 49000 when best bid is 49900 = maker (sits in book)
      expect(isMakerOrder(49000, 50100, 49900, 'buy')).toBe(true);
    });

    it('returns true for sell above best ask', () => {
      // Sell at 51000 when best ask is 50100 = maker (sits in book)
      expect(isMakerOrder(51000, 50100, 49900, 'sell')).toBe(true);
    });

    it('returns false for buy above best bid', () => {
      // Buy at 50500 when best bid is 49900 = taker (crosses spread)
      expect(isMakerOrder(50500, 50100, 49900, 'buy')).toBe(false);
    });

    it('returns false for sell below best ask', () => {
      // Sell at 49500 when best ask is 50100 = taker (crosses spread)
      expect(isMakerOrder(49500, 50100, 49900, 'sell')).toBe(false);
    });
  });

  describe('3d: fees wired end-to-end into matcher fills', () => {
    // Pre-fix: createFill hardcoded fee: 0 — the venue collected nothing.
    it('taker fills carry taker fee, maker fills carry maker fee', () => {
      const m = new Matcher();
      m.initPair('BTCUSDT' as any, 50000);

      const maker = m.placeOrder('u1', 'BTCUSDT' as any, 'sell', 'limit', 50000, 0.5);
      m.placeOrder('u2', 'BTCUSDT' as any, 'buy', 'limit', 50000, 0.5);

      const makerFill = m.getFills(maker.id)[0];
      // Maker leg: 0.5 * 50000 * 0.001 = 25
      expect(makerFill.fee).toBeCloseTo(25, 6);

      // Taker leg: find u2's buy fill
      const allF = (m as any).fills as Fill[];
      const takerFill = allF.find(f => f.userId === 'u2');
      // Taker: 0.5 * 50000 * 0.002 = 50
      expect(takerFill!.fee).toBeCloseTo(50, 6);
    });

    it('market orders pay taker fee on every level swept', () => {
      const m = new Matcher();
      m.initPair('BTCUSDT' as any, 50000);

      const order = m.placeOrder('u1', 'BTCUSDT' as any, 'buy', 'market', 0, 1);
      const fills = m.getFills(order.id);
      const totalFee = fills.reduce((s, f) => s + f.fee, 0);
      const totalNotional = fills.reduce((s, f) => s + f.price * f.quantity, 0);

      // ~0.2% of notional, with the $0.01 floor
      expect(totalFee).toBeGreaterThan(0);
      expect(totalFee).toBeLessThanOrEqual(totalNotional * 0.002 + fills.length * 0.01);
    });
  });
});
