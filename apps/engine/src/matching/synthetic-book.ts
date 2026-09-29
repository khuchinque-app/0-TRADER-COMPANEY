// T3: Synthetic Order Book
// Seeds a synthetic book around a reference mid price with realistic depth shape.
// This is the demo venue's core: limit orders fill against this book, not live exchange data.

import type { OrderBook, BookLevel } from '@trading/shared';

export interface SyntheticBookConfig {
  /** Base mid price to seed the book around */
  midPrice: number;
  /** Spread as a fraction of mid (e.g., 0.001 = 0.1%) */
  spread: number;
  /** Depth levels per side */
  depth: number;
  /** Min step between price levels */
  minStep: number;
}

const DEFAULT_CONFIG: SyntheticBookConfig = {
  midPrice: 50000,
  spread: 0.001,
  depth: 20,
  minStep: 1,
};

// In-memory mid-price cache with fallback defaults
const MID_PRICE_CACHE: Map<string, number> = new Map([
  ['BTCUSDT', 65000.00],
  ['ETHUSDT', 3500.00],
  ['SOLUSDT', 145.00],
  ['BNBUSDT', 600.00],
  ['XRPUSDT', 0.62],
  ['LINKUSDT', 18.00],
  ['AAVEUSDT', 180.00],
]);

/**
 * Get cached mid price with fallback to defaults
 */
export function getCachedMidPrice(symbol: string): number {
  return MID_PRICE_CACHE.get(symbol) || DEFAULT_CONFIG.midPrice;
}

/**
 * Update the mid price cache
 */
export function updateCachedMidPrice(symbol: string, price: number): void {
  MID_PRICE_CACHE.set(symbol, price);
}

/**
 * Generate a synthetic order book seeded around a mid price.
 * Asks are above mid, bids below, with increasing size for farther levels.
 * Uses cached mid price as fallback if none provided.
 */
export function createSyntheticBook(
  symbol: string,
  midPrice?: number,
  config: Partial<SyntheticBookConfig> = {}
): OrderBook {
  const effectiveMid = midPrice ?? getCachedMidPrice(symbol);
  const { spread, depth, minStep } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  const halfSpread = effectiveMid * (spread / 2);
  const askStart = effectiveMid + halfSpread;
  const bidStart = effectiveMid - halfSpread;

  // Step scales with the mid so low-priced pairs (XRP @ 0.62) never go negative;
  // minStep only acts as a floor.
  const stepBase = Math.max(minStep, effectiveMid * 0.0005);

  const asks: BookLevel[] = [];
  const bids: BookLevel[] = [];

  for (let i = 0; i < depth; i++) {
    // Geometric progression for quantity (more depth as you go farther)
    const qty = 0.1 * Math.pow(1.5, i);

    // Price decimals scale with the mid (sub-dollar pairs need more precision)
    const decimals = effectiveMid < 1 ? 4 : 2;

    // Ask prices: increment by stepBase * (1 + decay)
    const askStep = stepBase * (1 + i * 0.1);
    asks.push({
      price: parseFloat((askStart + i * askStep).toFixed(decimals)),
      quantity: parseFloat(qty.toFixed(6)),
    });

    // Bid prices: decrement similarly, floored above zero
    const bidStep = stepBase * (1 + i * 0.1);
    const rawBid = bidStart - i * bidStep;
    bids.push({
      price: parseFloat(Math.max(rawBid, effectiveMid * 0.001).toFixed(decimals)),
      quantity: parseFloat(qty.toFixed(6)),
    });
  }

  return {
    symbol,
    asks,
    bids, // Already in descending order (highest first)
    timestamp: now,
  };
}

/**
 * Update an existing book with a new mid price (re-seeds).
 */
export function updateBookMid(book: OrderBook, newMid: number): OrderBook {
  if (book.asks.length === 0 || book.bids.length === 0) {
    return book;
  }

  // Estimate current mid from book
  const bestAsk = book.asks[0]?.price ?? newMid;
  const bestBid = book.bids[0]?.price ?? newMid;
  const oldMid = (bestAsk + bestBid) / 2;

  if (oldMid === 0) return book;

  const ratio = newMid / oldMid;

  // Re-price ONLY synthetic depth. A level with an orderId is a resting user
  // limit order — its price is the user's own and must never drift with the mid.
  const decimals = newMid < 1 ? 4 : 2;
  const repriced = (l: BookLevel): BookLevel =>
    l.orderId ? l : { ...l, price: parseFloat((l.price * ratio).toFixed(decimals)) };

  const updatedAsks = book.asks.map(repriced);
  const updatedBids = book.bids.map(repriced);

  return {
    ...book,
    asks: updatedAsks,
    bids: updatedBids,
    timestamp: Date.now(),
  };
}
