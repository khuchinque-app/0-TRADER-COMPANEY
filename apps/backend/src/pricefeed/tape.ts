// T07: Market trades tape — recent trades per symbol (paper-trading simulation).
//
// The venue has no real order flow, so the tape is generated: a rolling
// per-symbol buffer of synthetic ticks derived from the reference price feed
// (feed mid + deterministic jitter), appended every few seconds so the tape
// scrolls like a live market even with zero requests. The HTTP route merges
// these with real user fills from the ledger (fills table), flagging the
// requester's own fills with mine: true. The endpoint always returns exactly
// TAPE_LEN (50) rows, newest first.
//
// No Math.random anywhere: for a given feed mid, trade i..i+k is reproducible.

import { SUPPORTED_SYMBOLS, SymbolId } from "./adapter";
import { priceFeed } from "./service";
import { sizeFor, tickSizeFor } from "./book";

export interface TapeTrade {
  id: string;
  price: number;
  size: number; // base-asset quantity
  side: "buy" | "sell";
  time: number; // ms epoch
  mine: boolean; // true when the fill belongs to the requesting user
  source: "synthetic" | "ledger";
}

export const TAPE_LEN = 50;

// Deterministic per-sequence price jitter (bps). Stable across requests.
const OFFSET_BPS = [
  6, -3, 11, -7, 2, -12, 5, -4, 9, -1, -6, 14, -9, 3, -5, 8, -2, -11, 4, -8,
  1, 7, -13, 10, -6, 5, -3, 12, -7, 2, -10, 9, -4, 6, -1, -14, 8, -3, 11, -5,
  2, -9, 13, -7, 4, -10, 1, 6, -8, 3, -12, 7, -2, 12, -5, 10, -4, -13, 5, -1,
  9, -6, 3, -11,
];

// Deterministic size variation around the book's base sizes.
const SIZE_MULT = [0.5, 1, 1.5, 0.75, 1.25, 0.6, 1.8, 0.9];

// Deterministic side runs (buy-heavy, like real tape).
const SIDE_PATTERN: Array<"buy" | "sell"> = [
  "buy", "buy", "sell", "buy", "sell", "sell", "buy", "sell", "buy", "buy",
];

const SPACING_MS = 2500; // synthetic tick cadence
const MAX_BUFFER = 300;

class TapeService {
  private buffers = new Map<SymbolId, TapeTrade[]>();
  private seq = new Map<SymbolId, number>();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Seed every symbol with TAPE_LEN entries so the endpoint serves 50 rows
    // from the first millisecond (same cold-start guarantee as the price feed).
    const now = Date.now();
    for (const sym of SUPPORTED_SYMBOLS) {
      const buf: TapeTrade[] = [];
      for (let i = 0; i < TAPE_LEN; i++) {
        buf.push(this.makeTrade(sym, i, now - (TAPE_LEN - 1 - i) * SPACING_MS));
      }
      this.buffers.set(sym, buf);
      this.seq.set(sym, TAPE_LEN);
    }
  }

  start(): void {
    if (this.timer) return;
    // Anchor the seed window FIRST (endpoint serves 50 rows immediately), then
    // re-anchor once the first feed polls land (default poll = 5s) so the
    // oldest tape rows track the live/sim price instead of the cold-start seed.
    this.reseed();
    this.timer = setInterval(() => this.appendAll(), SPACING_MS);
    this.timer.unref?.();
    const reanchor = setTimeout(() => this.reseed(), 6000);
    reanchor.unref?.();
  }

  private reseed(): void {
    const now = Date.now();
    for (const sym of SUPPORTED_SYMBOLS) {
      const seq = this.seq.get(sym) ?? 0;
      const buf: TapeTrade[] = [];
      for (let i = 0; i < TAPE_LEN; i++) {
        buf.push(this.makeTrade(sym, seq + i, now - (TAPE_LEN - 1 - i) * SPACING_MS));
      }
      this.buffers.set(sym, buf);
      this.seq.set(sym, seq + TAPE_LEN);
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Newest-first recent trades for a symbol (default: TAPE_LEN rows). */
  getTrades(symbol: SymbolId, count: number = TAPE_LEN): TapeTrade[] {
    const buf = this.buffers.get(symbol) ?? [];
    return buf.slice(0, count);
  }

  private appendAll(): void {
    const now = Date.now();
    for (const sym of SUPPORTED_SYMBOLS) {
      const seq = this.seq.get(sym) ?? TAPE_LEN;
      const buf = this.buffers.get(sym) ?? [];
      buf.unshift(this.makeTrade(sym, seq, now));
      while (buf.length > MAX_BUFFER) buf.pop();
      this.buffers.set(sym, buf);
      this.seq.set(sym, seq + 1);
    }
  }

  /** One deterministic synthetic trade for a sequence number, priced off the feed mid. */
  private makeTrade(symbol: SymbolId, seq: number, time: number): TapeTrade {
    const mid = priceFeed.getPrice(symbol).price;
    const bps = OFFSET_BPS[seq % OFFSET_BPS.length];
    const tick = tickSizeFor(mid);
    const price = Math.round((mid * (1 + bps / 10000)) / tick) * tick;
    const size =
      Math.round(sizeFor(symbol, seq % 15) * SIZE_MULT[seq % SIZE_MULT.length] * 1e6) / 1e6;
    const side = SIDE_PATTERN[seq % SIDE_PATTERN.length];
    return {
      id: `tap-${symbol}-${time}-${seq}`,
      price,
      size,
      side,
      time,
      mine: false,
      source: "synthetic" as const,
    };
  }
}

export const tapeService = new TapeService();
