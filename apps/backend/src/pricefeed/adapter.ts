// T04: Single upstream adapter for the reference price feed (USDT quote).
// ALL external ticker access for /api/price lives in this file:
//   1. Indodax public API first (source: 'live')
//   2. simulated random walk seeded from the last good price (source: 'sim')
// Never returns NaN or 0; never throws to the HTTP layer (service handles failures).

export const SUPPORTED_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "LINK", "AAVE"] as const;
export type SymbolId = (typeof SUPPORTED_SYMBOLS)[number];

export const isSymbol = (s: string): s is SymbolId =>
  (SUPPORTED_SYMBOLS as readonly string[]).includes(s.toUpperCase());

// Cold-start seeds (USD reference, internal quote = USDT). Used ONLY when upstream is
// unreachable AND there is no last good price yet, so the feed is always positive.
export const DEFAULT_SEED_PRICES: Record<SymbolId, number> = {
  BTC: 65000,
  ETH: 3500,
  SOL: 150,
  BNB: 580,
  XRP: 0.55,
  LINK: 15,
  AAVE: 150,
};

// Indodax ticker pairs: BTC/ETH have native USDT pairs; the rest are IDR-only and are
// converted to USDT via the usdtidr ticker (single upstream source).
const PAIR_BY_SYMBOL: Record<SymbolId, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solidr",
  BNB: "bnbidr",
  XRP: "xrpidr",
  LINK: "linkidr",
  AAVE: "aaveidr",
};

const INDODAX_BASE = process.env.INDODAX_BASE_URL || "https://indodax.com";
const FETCH_TIMEOUT_MS = parseInt(process.env.PRICE_FETCH_TIMEOUT_MS || "5000", 10);
const FX_TTL_MS = parseInt(process.env.FX_TTL_MS || "60000", 10); // usdtidr rate cache

export interface LivePrice {
  price: number;
  ts: number;
  source: "live" | "sim";
}

let fxCache: { rate: number; ts: number } | null = null;

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getUsdtIdrRate(): Promise<number> {
  const now = Date.now();
  if (fxCache && now - fxCache.ts < FX_TTL_MS) return fxCache.rate;
  const data = await fetchJson(`${INDODAX_BASE}/api/ticker/usdtidr`, FETCH_TIMEOUT_MS);
  const rate = parseFloat(data?.ticker?.last ?? data?.last);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("invalid usdtidr rate");
  fxCache = { rate, ts: now };
  return rate;
}

/**
 * Fetch a live USDT price for a symbol from the Indodax public API.
 * Throws when upstream is unreachable or returns junk (caller falls back to sim).
 */
export async function fetchLivePrice(symbol: SymbolId): Promise<LivePrice> {
  const pair = PAIR_BY_SYMBOL[symbol];
  const data = await fetchJson(`${INDODAX_BASE}/api/ticker/${pair}`, FETCH_TIMEOUT_MS);
  const last = parseFloat(data?.ticker?.last ?? data?.last);
  if (!Number.isFinite(last) || last <= 0) throw new Error(`invalid ticker data for ${pair}`);
  let price = last;
  if (!pair.endsWith("usdt")) {
    const rate = await getUsdtIdrRate();
    price = last / rate;
  }
  if (!Number.isFinite(price) || price <= 0) throw new Error(`invalid converted price for ${symbol}`);
  return { price: roundPrice(price), ts: Date.now(), source: "live" };
}

/**
 * Simulated random walk step seeded from the last good price (±0.15% per tick).
 * Guaranteed positive and finite — never NaN, never 0.
 */
export function simulateNextPrice(symbol: SymbolId, lastGood: number | undefined, ts: number): LivePrice {
  const seed = Number.isFinite(lastGood) && (lastGood as number) > 0
    ? (lastGood as number)
    : DEFAULT_SEED_PRICES[symbol];
  const step = seed * 0.0015 * 2 * (Math.random() - 0.5);
  return { price: roundPrice(Math.max(seed + step, seed * 0.0001)), ts, source: "sim" };
}

export function roundPrice(p: number): number {
  return Math.round(p * 1e8) / 1e8;
}
