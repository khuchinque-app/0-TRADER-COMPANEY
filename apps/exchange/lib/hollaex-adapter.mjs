// apps/exchange/lib/hollaex-adapter.mjs
// SERVER-SIDE ONLY. Never import this from the browser bundle.
//
// Thin, dependency-free wrapper around the HollaEx Kit `/v2/public/*` API.
// Implemented on top of global `fetch` (Node 18+) rather than `hollaex-node-lib`
// so the exchange server keeps its current zero-runtime-dependency shape;
// `hollaex-node-lib` can be dropped in later without changing callers.
//
// Guarantees (new-prompt/task.md, "CLIENT IMPLEMENTATION"):
//   - timeout on every upstream call
//   - retry with exponential backoff on 429/5xx
//   - in-memory TTL cache
//   - stale fallback (serve last good value with `stale: true`) instead of 5xx
//   - max 1 request/sec to HollaEx public endpoints (serialized queue)
//   - never exposes HOLLAEX_API_KEY / HOLLAEX_API_SECRET to the browser

/** @typedef {'ticker'|'orderbook'|'trades'} Feed */

const DEFAULTS = {
  apiURL: 'http://localhost:10010/v2',
  timeoutMs: 4000,
  cacheTtlMs: 2000,
  staleMaxMs: 300000,
  minIntervalMs: 1000,
  maxRetries: 2,
};

const PUBLIC_PATHS = {
  ticker: '/public/ticker',
  orderbook: '/public/orderbook',
  trades: '/public/trades',
};

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize a HollaEx ticker object into the exchange ticker shape. */
export function normalizeTicker(raw) {
  if (!raw) return null;
  const last = num(raw.last ?? raw.close ?? raw.price);
  const open = num(raw.open);
  const quoteVolume = num(raw.quote_volume ?? raw.quoteVolume ?? raw.volume);
  let changePercent = num(raw.change);
  if (changePercent == null && open != null && open !== 0 && last != null) {
    changePercent = ((last - open) / open) * 100;
  }
  return {
    symbol: String(raw.symbol || raw.pair || '').toLowerCase() || null,
    lastPrice: last,
    highPrice: num(raw.high),
    lowPrice: num(raw.low),
    openPrice: open,
    quoteVolume,
    baseVolume: num(raw.volume ?? raw.base_volume),
    priceChangePercent: changePercent,
    timestamp: raw.timestamp ? Number(raw.timestamp) : Date.now(),
  };
}

function normalizeLevel(x) {
  if (Array.isArray(x)) return [num(x[0]), num(x[1])];
  if (x && typeof x === 'object') return [num(x.price), num(x.size ?? x.quantity)];
  return [null, null];
}

/** Normalize a HollaEx orderbook into `{ bids: [[p,s]], asks: [[p,s]] }`. */
export function normalizeOrderbook(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const bids = (raw.bids || raw.buy || []).map(normalizeLevel).filter((l) => l[0] != null);
  const asks = (raw.asks || raw.sell || []).map(normalizeLevel).filter((l) => l[0] != null);
  return { bids, asks, timestamp: raw.timestamp ? Number(raw.timestamp) : Date.now() };
}

/** Normalize a HollaEx trade list. */
export function normalizeTrades(raw) {
  const list = Array.isArray(raw) ? raw : raw?.data || [];
  return list.map((t) => ({
    price: num(t.price),
    qty: num(t.size ?? t.quantity ?? t.qty),
    side: t.side === 'sell' ? 'sell' : 'buy',
    time: t.timestamp ? Number(t.timestamp) : Number(t.time) || Date.now(),
  }));
}

/**
 * Resolve the bulk ticker payload (object keyed by symbol, or an array) into a
 * Map<symbol, normalizedTicker>.
 */
export function normalizeTickerList(raw) {
  const out = new Map();
  if (Array.isArray(raw)) {
    for (const t of raw) {
      const n = normalizeTicker(t);
      if (n?.symbol) out.set(n.symbol, n);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [symbol, t] of Object.entries(raw)) {
      const n = normalizeTicker({ symbol, ...(t || {}) });
      if (n?.symbol) out.set(n.symbol, n);
    }
  }
  return out;
}

/**
 * Create a HollaEx public-data adapter.
 * @param {object} [options]
 * @param {string} [options.apiURL]         e.g. http://localhost:10010/v2
 * @param {number} [options.timeoutMs]
 * @param {number} [options.cacheTtlMs]
 * @param {number} [options.staleMaxMs]
 * @param {number} [options.minIntervalMs]  rate limit (default 1000 = 1 req/s)
 * @param {Function} [options.fetchImpl]    injectable for tests
 * @param {() => number} [options.now]      injectable clock for tests
 */
export function createHollaexAdapter(options = {}) {
  const env = typeof process !== 'undefined' ? process.env : {};
  const cfg = {
    apiURL: (options.apiURL || env.HOLLAEX_API_URL || DEFAULTS.apiURL).replace(/\/$/, ''),
    timeoutMs: options.timeoutMs ?? toInt(env.HOLLAEX_TIMEOUT_MS, DEFAULTS.timeoutMs),
    cacheTtlMs: options.cacheTtlMs ?? toInt(env.HOLLAEX_CACHE_TTL_MS, DEFAULTS.cacheTtlMs),
    staleMaxMs: options.staleMaxMs ?? toInt(env.HOLLAEX_STALE_MAX_MS, DEFAULTS.staleMaxMs),
    minIntervalMs: options.minIntervalMs ?? toInt(env.HOLLAEX_MIN_INTERVAL_MS, DEFAULTS.minIntervalMs),
    maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
  };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => Date.now());

  /** @type {Map<string, {data:any, ts:number, stale:boolean}>} */
  const cache = new Map();
  let lastCallAt = 0;
  let queue = Promise.resolve();

  function cacheKey(path, symbol) {
    return `${path}?${symbol || ''}`;
  }

  function readCache(key) {
    const hit = cache.get(key);
    if (!hit) return null;
    const age = now() - hit.ts;
    if (age <= cfg.cacheTtlMs) return { ...hit, fresh: true, age };
    if (age <= cfg.staleMaxMs) return { ...hit, fresh: false, age };
    cache.delete(key);
    return null;
  }

  // Serialize upstream calls and enforce the 1 req/sec floor.
  function rateLimited(fn) {
    const run = queue.then(async () => {
      const wait = cfg.minIntervalMs - (now() - lastCallAt);
      if (wait > 0) await sleep(wait);
      lastCallAt = now();
      return fn();
    });
    // keep the chain alive even if this call rejects
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function rawGet(path, params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    const url = `${cfg.apiURL}${path}${qs ? `?${qs}` : ''}`;
    let lastErr;
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        const res = await fetchImpl(url, {
          headers: {
            accept: 'application/json',
            // Public endpoints need no auth. Credentials stay server-side and are
            // only attached when explicitly present, and are never logged/bundled.
            ...(env.HOLLAEX_API_KEY ? { 'api-key': env.HOLLAEX_API_KEY } : {}),
          },
          signal: AbortSignal.timeout(cfg.timeoutMs),
        });
        if (res.status === 429 || res.status >= 500) {
          const err = new Error(`upstream ${res.status}`);
          err.status = res.status;
          err.retryable = true;
          throw err;
        }
        if (res.status === 404) {
          const err = new Error('upstream 404');
          err.status = 404;
          throw err;
        }
        if (!res.ok) {
          const err = new Error(`upstream ${res.status}`);
          err.status = res.status;
          throw err;
        }
        return await res.json();
      } catch (e) {
        lastErr = e;
        const retryable = e.retryable || e.name === 'TimeoutError' || e.name === 'AbortError' || e.name === 'TypeError';
        if (!retryable || attempt === cfg.maxRetries) break;
        await sleep(2 ** attempt * cfg.minIntervalMs); // exponential backoff
      }
    }
    throw lastErr || new Error('upstream error');
  }

  /**
   * Fetch a public feed with cache + stale fallback.
   * @returns {Promise<{data:any, stale:boolean, noFeed:boolean, fetchedAt:number, source:'live'|'cache'|'stale'|'unavailable'}>}
   */
  async function get(feed, params = {}) {
    const path = PUBLIC_PATHS[feed];
    const key = cacheKey(path, params.symbol || '');
    const hit = readCache(key);
    if (hit && hit.fresh) {
      return { data: hit.data, stale: false, noFeed: false, fetchedAt: hit.ts, source: 'cache' };
    }
    try {
      const data = await rateLimited(() => rawGet(path, params));
      cache.set(key, { data, ts: now(), stale: false });
      return { data, stale: false, noFeed: false, fetchedAt: now(), source: 'live' };
    } catch (e) {
      if (hit) {
        // serve last good value, flagged stale
        return { data: hit.data, stale: true, noFeed: false, fetchedAt: hit.ts, source: 'stale', error: String(e.message) };
      }
      // no cache -> explicit NO_FEED, callers render greyed UI with HTTP 200
      return { data: null, stale: true, noFeed: true, fetchedAt: now(), source: 'unavailable', error: String(e.message) };
    }
  }

  return {
    config: cfg,
    get,
    getRawTicker: (symbol) => get('ticker', { symbol }),
    getRawTickers: () => get('ticker'),
    getRawOrderbook: (symbol) => get('orderbook', { symbol }),
    getRawTrades: (symbol) => get('trades', { symbol }),
    _clearCache: () => cache.clear(),
  };
}
