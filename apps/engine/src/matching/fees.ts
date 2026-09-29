// T5: Fee Schedule
// Flat maker/taker fee schedule for the paper trading venue
// Fees are applied to fills and deducted from user balances

import type { Asset, Pair, OrderSide } from '@trading/shared';

export interface FeeSchedule {
  /** Maker fee rate (e.g., 0.001 = 0.1%) */
  maker: number;
  /** Taker fee rate (e.g., 0.002 = 0.2%) */
  taker: number;
  /** Minimum fee per trade (in USDT) */
  minFee: number;
  /** Fee asset (USDT or base asset) */
  feeAsset: Asset | 'USDT';
}

// Default fee schedule per config
const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  maker: 0.001,   // 0.1%
  taker: 0.002,   // 0.2%
  minFee: 0.01,   // $0.01 minimum
  feeAsset: 'USDT',
};

/**
 * Calculate fee for a trade
 */
export function calculateFee(quantity: number, price: number, isMaker: boolean, schedule?: FeeSchedule): number {
  const { maker, taker, minFee } = schedule || DEFAULT_FEE_SCHEDULE;
  const rate = isMaker ? maker : taker;
  const fee = quantity * price * rate;
  return Math.max(fee, minFee);
}

/**
 * Get fee for a pair (same schedule for all pairs in demo)
 */
export function getFeeSchedule(pair?: Pair, asset?: Asset): FeeSchedule {
  return DEFAULT_FEE_SCHEDULE;
}

/**
 * Check if order is maker or taker
 * @param orderPrice - The price of the order
 * @param bestAsk - The current best ask price
 * @param bestBid - The current best bid price
 * @param side - The order side ('buy' or 'sell')
 */
export function isMakerOrder(orderPrice: number, bestAsk: number, bestBid: number, side: OrderSide): boolean {
  if (side === 'buy') {
    // Buy maker: price <= best bid (sits below book, provides liquidity)
    // Buy taker: price > best bid (crosses spread, takes liquidity)
    return orderPrice <= bestBid;
  } else {
    // Sell maker: price >= best ask (sits above book, provides liquidity)
    // Sell taker: price < best ask (crosses spread, takes liquidity)
    return orderPrice >= bestAsk;
  }
}

// Export default schedule
export { DEFAULT_FEE_SCHEDULE };
