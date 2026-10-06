// T05: Synthetic order book generator (paper-trading simulation).
// Builds a deterministic 15x15 book around the reference mid for each shortlisted
// symbol: same symbol + same mid => identical book (no randomness). Spread and size
// decay are fixed per symbol; the book is recomputed from the cached price-feed tick
// on every request, so it refreshes automatically when the price updates.
//
// Conventions (matches public venue APIs):
//   - bids: sorted descending, index 0 = best (highest) bid
//   - asks: sorted ascending,  index 0 = best (lowest) ask
//   - best ask > best bid always; every level size > 0.

import { SymbolId } from "./adapter";
import { priceFeed, Tick } from "./service";

export interface BookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: SymbolId;
  pair: string;
  quote: "USDT";
  mid: number;
  spread: number;
  bids: BookLevel[]; // 15 levels, descending, best first
  asks: BookLevel[]; // 15 levels, ascending, best first
  source: "live" | "sim";
  ts: number;
}

export const BOOK_LEVELS = 15;

// Deterministic per-symbol profile: spread in bps + base size + constant level decay.
// Fixed for the whole process lifetime => the book is reproducible per symbol.
const SPREAD_BPS: Record<SymbolId, number> = {
  BTC: 1.0,
  ETH: 1.5,
  SOL: 3.0,
  BNB: 2.0,
  XRP: 6.0,
  LINK: 5.0,
  AAVE: 4.0,
};

const BASE_SIZE: Record<SymbolId, number> = {
  BTC: 0.5,
  ETH: 5,
  SOL: 60,
  BNB: 7,
  XRP: 25000,
  LINK: 500,
  AAVE: 40,
};

const DECAY = 0.88; // size_i = BASE_SIZE * DECAY^i  (deterministic decay)

// Tick size derived from price magnitude (deterministic price ladder).
export function tickSizeFor(price: number): number {
  if (price >= 10000) return 1;
  if (price >= 1000) return 0.1;
  if (price >= 100) return 0.01;
  if (price >= 1) return 0.001;
  if (price >= 0.1) return 0.0001;
  return 0.00001;
}

function roundToTick(p: number, tick: number): number {
  return Math.round(p / tick) * tick;
}

/** Deterministic base-asset size at a given depth level (always > 0). */
export function sizeFor(symbol: SymbolId, level: number): number {
  const raw = BASE_SIZE[symbol] * Math.pow(DECAY, level);
  return Math.round(raw * 1e6) / 1e6;
}

export function getBook(symbol: SymbolId): OrderBook {
  const tick: Tick = priceFeed.getPrice(symbol);
  const mid = tick.price;
  const spread = (mid * SPREAD_BPS[symbol]) / 10000;
  const tickSize = tickSizeFor(mid);
  const step = Math.max(spread / 2, tickSize);

  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  for (let i = 0; i < BOOK_LEVELS; i++) {
    const size = sizeFor(symbol, i);
    const bidPrice = roundToTick(mid - spread / 2 - i * step, tickSize);
    const askPrice = roundToTick(mid + spread / 2 + i * step, tickSize);
    bids.push({ price: bidPrice, size });
    asks.push({ price: askPrice, size });
  }

  // Safety net: if per-tick rounding ever collapses the best levels (sub-tick
  // spread), force a minimum 1-tick offset so best ask > best bid always holds.
  if (asks[0].price <= bids[0].price) {
    const offset = Math.max(spread, tickSize);
    for (let i = 0; i < BOOK_LEVELS; i++) {
      bids[i] = { price: roundToTick(mid - offset - i * step, tickSize), size: bids[i].size };
      asks[i] = { price: roundToTick(mid + offset + i * step, tickSize), size: asks[i].size };
    }
  }

  return {
    symbol,
    pair: `${symbol}USDT`,
    quote: "USDT",
    mid,
    spread: Math.round((asks[0].price - bids[0].price) * 1e8) / 1e8,
    bids,
    asks,
    source: tick.source,
    ts: tick.ts,
  };
}
