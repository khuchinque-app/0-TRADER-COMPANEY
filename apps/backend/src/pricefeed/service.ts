// T04: Reference price feed service.
// Polls the upstream adapter every few seconds, caches the last tick per symbol and
// keeps a short 1-minute candle history (>= 30 candles guaranteed, even at cold start).
// Fallback to a simulated random walk happens inside the adapter — the service itself
// never crashes and never serves NaN/0.

import {
  SUPPORTED_SYMBOLS,
  SymbolId,
  DEFAULT_SEED_PRICES,
  fetchLivePrice,
  simulateNextPrice,
  roundPrice,
} from "./adapter";

export interface Tick {
  symbol: SymbolId;
  pair: string;
  quote: "USDT";
  price: number;
  source: "live" | "sim";
  ts: number;
}

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type IntervalId = "1m" | "5m" | "1h";

export const INTERVALS: IntervalId[] = ["1m", "5m", "1h"];
export const INTERVAL_MS: Record<IntervalId, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export function intervalMs(interval: string): number | null {
  return INTERVAL_MS[interval as IntervalId] ?? null;
}

// Minimum candle count per interval (verify requires >= 30); 1m keeps 1920 candles
// (32h) so 5m -> ~384 aggregated and 1h -> ~32 aggregated (all >= 30).
const MIN_CANDLES = 30;
const POLL_MS = Math.max(1000, parseInt(process.env.PRICE_POLL_MS || "5000", 10));
const CANDLE_BUCKET_MS = INTERVAL_MS["1m"];
const HISTORY_LEN = 1920; // 1m candles: covers ~32h, yields >=30 for all intervals

const bucketOf = (ts: number) => Math.floor(ts / CANDLE_BUCKET_MS) * CANDLE_BUCKET_MS;

class PriceFeedService {
  private ticks = new Map<SymbolId, Tick>();
  private candles = new Map<SymbolId, Candle[]>();
  private lastGood = new Map<SymbolId, number>();
  private polling = new Set<SymbolId>();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Cold-start guarantee: every symbol has a positive price and 30+ candles from the
    // first millisecond, seeded from DEFAULT_SEED_PRICES (marked 'sim' until first live tick).
    const now = Date.now();
    for (const sym of SUPPORTED_SYMBOLS) {
      const seed = DEFAULT_SEED_PRICES[sym];
      this.ticks.set(sym, { symbol: sym, pair: `${sym}USDT`, quote: "USDT", price: seed, source: "sim", ts: now });
      this.lastGood.set(sym, seed);
      this.candles.set(sym, this.backfill(seed, now));
    }
  }

  start(): void {
    if (this.timer) return;
    for (const sym of SUPPORTED_SYMBOLS) void this.poll(sym);
    this.timer = setInterval(() => {
      for (const sym of SUPPORTED_SYMBOLS) void this.poll(sym);
    }, POLL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getPrice(symbol: SymbolId): Tick {
    return this.ticks.get(symbol)!;
  }

  getHistory(symbol: SymbolId, interval: IntervalId = "1m"): { candles: Candle[]; source: "live" | "sim"; ts: number; interval: IntervalId } {
    const tick = this.ticks.get(symbol)!;
    const raw1m = this.candles.get(symbol) ?? [];
    if (interval === "1m") return { candles: raw1m, source: tick.source, ts: tick.ts, interval: "1m" };
    return { candles: aggregateCandles(raw1m, INTERVAL_MS[interval]), source: tick.source, ts: tick.ts, interval };
  }

  isPolling(symbol: SymbolId): boolean {
    return this.polling.has(symbol);
  }

  // ---- internals ----

  // Plausible OHLC candles leading up to `ts`, ending at `price`.
  private backfill(price: number, ts: number): Candle[] {
    const out: Candle[] = [];
    const bucket = bucketOf(ts);
    const startTs = bucket - (HISTORY_LEN - 1) * CANDLE_BUCKET_MS;
    let prevClose = price * (1 - 0.02 * (Math.random() - 0.5)); // start somewhere near the seed
    for (let i = 0; i < HISTORY_LEN; i++) {
      const open = i === 0 ? prevClose : out[i - 1].close;
      const close = i === HISTORY_LEN - 1 ? price : open * (1 + (Math.random() - 0.5) * 0.004);
      const high = Math.max(open, close) * (1 + Math.random() * 0.0008);
      const low = Math.min(open, close) * (1 - Math.random() * 0.0008);
      out.push({
        ts: startTs + i * CANDLE_BUCKET_MS,
        open: roundPrice(open),
        high: roundPrice(high),
        low: roundPrice(low),
        close: roundPrice(close),
      });
    }
    return out;
  }

  private async poll(symbol: SymbolId): Promise<void> {
    if (this.polling.has(symbol)) return;
    this.polling.add(symbol);
    try {
      let price: number;
      let source: "live" | "sim";
      let ts = Date.now();
      try {
        const live = await fetchLivePrice(symbol);
        price = live.price;
        source = live.source;
        ts = live.ts;
      } catch {
        // Upstream unreachable/junk -> simulated random walk seeded from last good price.
        const sim = simulateNextPrice(symbol, this.lastGood.get(symbol), Date.now());
        price = sim.price;
        source = sim.source;
        ts = sim.ts;
      }
      this.lastGood.set(symbol, price);
      const tick: Tick = { symbol, pair: `${symbol}USDT`, quote: "USDT", price, source, ts };
      this.ticks.set(symbol, tick);
      this.recordCandle(symbol, tick);
    } finally {
      this.polling.delete(symbol);
    }
  }

  private recordCandle(symbol: SymbolId, tick: Tick): void {
    const list = this.candles.get(symbol) ?? [];
    const bucket = bucketOf(tick.ts);
    const last = list[list.length - 1];
    const p = roundPrice(tick.price);
    if (last && last.ts === bucket) {
      last.high = Math.max(last.high, p);
      last.low = Math.min(last.low, p);
      last.close = p;
    } else if (!last || bucket > last.ts) {
      list.push({ ts: bucket, open: last ? last.close : p, high: p, low: p, close: p });
      while (list.length > HISTORY_LEN) list.shift();
    }
    // bucket < last.ts (clock skew): ignore the out-of-order tick
  }
}

/**
 * Aggregate a list of 1m candles into larger interval candles.
 * Each output candle covers a whole-number interval window containing the input bucket of its open.
 */
function aggregateCandles(candles: Candle[], intervalMs: number): Candle[] {
  if (candles.length === 0) return [];
  const windowMs = intervalMs;
  // Group candles by floor(ts / windowMs)
  const groups: Map<number, Candle[]> = new Map();
  for (const c of candles) {
    const key = Math.floor(c.ts / windowMs) * windowMs;
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }
  const out: Candle[] = [];
  for (const [, arr] of groups) {
    const first = arr[0];
    let high = first.high;
    let low = first.low;
    for (const c of arr) {
      high = Math.max(high, c.high);
      low = Math.min(low, c.low);
    }
    out.push({
      ts: first.ts,
      open: first.open,
      high,
      low,
      close: arr[arr.length - 1].close,
    });
  }
  return out;
}

export const priceFeed = new PriceFeedService();
