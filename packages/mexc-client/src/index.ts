// @trading/mexc-client — thin wrapper over MEXC PUBLIC spot market-data REST API.
// HARD RULE: public endpoints ONLY. No apiKey/apiSecret parameters exist anywhere
// in this module. Orders are matched by OUR engine against ledger.db.
const BASE = process.env.MEXC_BASE_URL || "https://api.mexc.com/api/v3";

export interface MexcResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>, timeoutMs = 8000): Promise<MexcResponse<T>> {
  let qs = "";
  if (params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) usp.set(k, String(v));
    }
    qs = usp.toString();
    if (qs) qs = "?" + qs;
  }
  const url = `${BASE}${path}${qs}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) {
      return { ok: false, status: r.status, data: null, error: `HTTP ${r.status}` };
    }
    return { ok: true, status: 200, data: (await r.json()) as T };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, error: e?.message || "network_error" };
  }
}

// ---------- types (subset of MEXC v3 public shapes) ----------

export interface MexcExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed: boolean;
  [k: string]: unknown;
}
export interface MexcExchangeInfo {
  symbols: MexcExchangeInfoSymbol[];
  timezone?: string;
  [k: string]: unknown;
}
export interface MexcTicker24h {
  symbol: string;
  lastPrice: string;
  openPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  [k: string]: unknown;
}
export interface MexcPriceTicker {
  symbol: string;
  price: string;
}
export interface MexcBookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}
export interface MexcDepth {
  bids: [string, string][]; // [price, qty]
  asks: [string, string][];
}
export interface MexcTrade {
  id: string | number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
  [k: string]: unknown;
}
export interface MexcKline {
  // [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...]
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  [k: number]: unknown;
}

// ---------- public endpoint wrapper ----------

export const mexc = {
  /** GET /ping — health */
  ping: () => get<Record<string, never>>("/ping"),

  /** GET /time — server time */
  time: () => get<{ serverTime: number }>("/time"),

  /** GET /exchangeInfo — pair universe */
  exchangeInfo: (symbols?: string[]) =>
    get<MexcExchangeInfo>("/exchangeInfo", symbols ? { symbols: JSON.stringify(symbols) } : undefined, 12000),

  /** GET /ticker/24hr — bulk or single */
  ticker24hr: (symbol?: string) => get<MexcTicker24h | MexcTicker24h[]>("/ticker/24hr", { symbol }),

  /** GET /ticker/price — last price bulk or single */
  tickerPrice: (symbol?: string) => get<MexcPriceTicker | MexcPriceTicker[]>("/ticker/price", { symbol }),

  /** GET /ticker/bookTicker — best bid/ask bulk or single */
  bookTicker: (symbol?: string) => get<MexcBookTicker | MexcBookTicker[]>("/ticker/bookTicker", { symbol }),

  /** GET /depth — order book */
  depth: (symbol: string, limit = 100) => get<MexcDepth>("/depth", { symbol, limit: Math.min(Math.max(limit, 1), 5000) }),

  /** GET /trades — recent trade tape (limit <= 1000) */
  trades: (symbol: string, limit = 50) => get<MexcTrade[]>("/trades", { symbol, limit: Math.min(Math.max(limit, 1), 1000) }),

  /** GET /aggTrades */
  aggTrades: (symbol: string, limit = 50) =>
    get<MexcTrade[]>("/aggTrades", { symbol, limit: Math.min(Math.max(limit, 1), 1000) }),

  /** GET /klines — candles */
  klines: (symbol: string, interval: string, limit = 100) =>
    get<MexcKline[]>("/klines", { symbol, interval, limit: Math.min(Math.max(limit, 1), 1000) }),

  /** GET /avgPrice */
  avgPrice: (symbol: string) => get<{ mins: number; price: string }>("/avgPrice", { symbol }),
};

export default mexc;
