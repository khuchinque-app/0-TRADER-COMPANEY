/**
 * config.ts — every route template and tunable for @trading/market-client.
 *
 * Nothing in this package hardcodes a host, timeout, retry count, or rate limit:
 * routes live here as templates and are expanded with a symbol at call time, which
 * is how the client covers ~500 endpoints without ~500 hand-written functions.
 *
 * Symbols come from the service's own route manifest
 * (packages/indodax-routes/routes.json -> 478 pairs). See discovery-report.md.
 */

export type EndpointCategory =
  | 'ticker'
  | 'orderbook'
  | 'trades'
  | 'candles'
  | 'history'
  | 'stats'
  | 'list'
  | 'unknown';

export type AuthMode = 'none' | 'apiKey' | 'unknown';

export interface ParamSpec {
  name: string;
  required: boolean;
  type: 'string' | 'number';
  description: string;
  default?: string | number;
  min?: number;
  max?: number;
  enum?: string[];
  /**
   * Accepted spellings that normalise to a canonical value before validation.
   * Needed because the exchange UI sends `1h` while the API only accepts `60m`
   * (see discovery-report.md, finding F3).
   */
  aliases?: Record<string, string>;
}

export interface SubresourceSpec {
  id: string;
  /** Path template; `{pair}` is replaced with the symbol slug (e.g. ANIMEIDR). */
  pathTemplate: string;
  category: EndpointCategory;
  auth: AuthMode;
  responseType: 'json' | 'text';
  params: ParamSpec[];
  /** Local cache lifetime. Mirrors the server-side cache TTLs observed in the source. */
  ttlMs: number;
  /** True when the upstream caps rows via `limit` and offers no offset cursor. */
  paginated: boolean;
  maxLimit?: number;
  /** True if the route is (or hosts) a streaming transport. */
  streaming: boolean;
  notes: string;
}

export interface MarketClientConfig {
  /** Origin of the service. Override with MARKET_CLIENT_BASE_URL. */
  baseUrl: string;
  timeoutMs: number;
  /** Extra attempts after the first (so maxRetries=3 => up to 4 requests). */
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  /** Politeness floor between request starts. 1000 => 1 req/s. */
  minIntervalMs: number;
  cacheTtlMs: number;
  userAgent: string;
  /** Only needed if a future authorized read-only endpoint requires it. */
  apiKey?: string;
}

export const DEFAULT_CONFIG: MarketClientConfig = {
  baseUrl: 'http://127.0.0.1:22221',
  timeoutMs: 8000,
  maxRetries: 3,
  backoffBaseMs: 250,
  backoffMaxMs: 5000,
  minIntervalMs: 1000,
  cacheTtlMs: 2000,
  userAgent: '@trading/market-client/1.0.0 (read-only market discovery)',
};

const int = (v: string | undefined, dflt: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};

/** Build a config from environment variables plus explicit overrides. */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<MarketClientConfig> = {},
): MarketClientConfig {
  return {
    ...DEFAULT_CONFIG,
    baseUrl: env.MARKET_CLIENT_BASE_URL || DEFAULT_CONFIG.baseUrl,
    timeoutMs: int(env.MARKET_CLIENT_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs),
    maxRetries: int(env.MARKET_CLIENT_MAX_RETRIES, DEFAULT_CONFIG.maxRetries),
    backoffBaseMs: int(env.MARKET_CLIENT_BACKOFF_BASE_MS, DEFAULT_CONFIG.backoffBaseMs),
    backoffMaxMs: int(env.MARKET_CLIENT_BACKOFF_MAX_MS, DEFAULT_CONFIG.backoffMaxMs),
    minIntervalMs: int(env.MARKET_CLIENT_MIN_INTERVAL_MS, DEFAULT_CONFIG.minIntervalMs),
    cacheTtlMs: int(env.MARKET_CLIENT_CACHE_TTL_MS, DEFAULT_CONFIG.cacheTtlMs),
    ...(env.MARKET_CLIENT_API_KEY ? { apiKey: env.MARKET_CLIENT_API_KEY } : {}),
    ...overrides,
  };
}

/**
 * The HTML page routes under the primary scope (/market/*), as served by
 * apps/exchange/server.mjs `routeState()`. These return text/html (the SPA shell).
 */
export const PAGE_ROUTES: Record<string, SubresourceSpec> = {
  market: {
    id: 'market',
    pathTemplate: '/market',
    category: 'list',
    auth: 'none',
    responseType: 'text',
    params: [],
    ttlMs: 60_000,
    paginated: false,
    streaming: false,
    notes: 'Market listing page (SPA shell; rows are hydrated client-side from /api/market/pairs).',
  },
  pair: {
    id: 'pair',
    pathTemplate: '/market/{pair}',
    category: 'unknown',
    auth: 'none',
    responseType: 'text',
    params: [],
    ttlMs: 60_000,
    paginated: false,
    streaming: false,
    notes:
      'Trading pair page (SPA shell). 200 when the slug is in the manifest; a real 404 otherwise. ' +
      'Primary reference endpoint is /market/ANIMEIDR.',
  },
  depth_chart: {
    id: 'depth_chart',
    pathTemplate: '/market/depth_chart/{pair}',
    category: 'orderbook',
    auth: 'none',
    responseType: 'text',
    params: [],
    ttlMs: 60_000,
    paginated: false,
    streaming: false,
    notes: 'Depth-chart view of the order book (SPA shell; data from /api/market/depth/{pair}).',
  },
};

/**
 * The JSON endpoints the /market/* pages actually call. Captured by inspecting the
 * page bundle and confirmed live; see discovery-report.md ("network calls made by the page").
 */
export const SUBRESOURCES: Record<string, SubresourceSpec> = {
  health: {
    id: 'health',
    pathTemplate: '/api/market/health',
    category: 'stats',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 5_000,
    paginated: false,
    streaming: false,
    notes: 'Upstream feed status, pair counts, manifest timestamp.',
  },
  pairs: {
    id: 'pairs',
    pathTemplate: '/api/market/pairs',
    category: 'list',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 60_000,
    paginated: false,
    streaming: false,
    notes: 'All 478 manifest pairs with LIVE/NO_FEED state. This is the symbol list.',
  },
  tickers: {
    id: 'tickers',
    pathTemplate: '/api/market/tickers',
    category: 'list',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 2_500,
    paginated: false,
    streaming: false,
    notes: 'Bulk 24h ticker for every LIVE pair, in one shared upstream call.',
  },
  ticker: {
    id: 'ticker',
    pathTemplate: '/api/market/ticker/{pair}',
    category: 'ticker',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 2_500,
    paginated: false,
    streaming: false,
    notes:
      'Single pair 24h ticker. NO_FEED pairs return 200 with state:"NO_FEED" and no price — ' +
      'never a 5xx.',
  },
  depth: {
    id: 'depth',
    pathTemplate: '/api/market/depth/{pair}',
    category: 'orderbook',
    auth: 'none',
    responseType: 'json',
    params: [
      { name: 'limit', required: false, type: 'number', description: 'Price levels per side', default: 20, min: 1, max: 500 },
    ],
    ttlMs: 1_000,
    paginated: false,
    maxLimit: 500,
    streaming: false,
    notes: 'Order book snapshot. Hard server cap of 500 levels.',
  },
  trades: {
    id: 'trades',
    pathTemplate: '/api/market/trades/{pair}',
    category: 'trades',
    auth: 'none',
    responseType: 'json',
    params: [
      { name: 'limit', required: false, type: 'number', description: 'Most recent trades', default: 50, min: 1, max: 1000 },
    ],
    ttlMs: 1_000,
    paginated: true,
    maxLimit: 1000,
    streaming: false,
    notes: 'Recent trade tape. Newest-first window: `limit` caps rows, there is no offset cursor.',
  },
  klines: {
    id: 'klines',
    pathTemplate: '/api/market/klines/{pair}',
    category: 'candles',
    auth: 'none',
    responseType: 'json',
    params: [
      {
        name: 'interval',
        required: false,
        type: 'string',
        description: 'Candle interval (aliases: 1h => 60m)',
        default: '1m',
        enum: ['1m', '5m', '15m', '30m', '60m', '4h', '1d', '1M'],
        aliases: { '1h': '60m', '1H': '60m', '1hr': '60m', '1hour': '60m', '1D': '1d' },
      },
      { name: 'limit', required: false, type: 'number', description: 'Candle count', default: 100, min: 1, max: 1000 },
    ],
    ttlMs: 5_000,
    paginated: false,
    maxLimit: 1000,
    streaming: false,
    notes: 'OHLCV candles. Unlisted intervals fall back to 1m server-side.',
  },
  manifest: {
    id: 'manifest',
    pathTemplate: '/api/market/manifest',
    category: 'list',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 600_000,
    paginated: false,
    streaming: false,
    notes: 'Route manifest metadata used by the smoke test for parity checks.',
  },
  universe: {
    id: 'universe',
    pathTemplate: '/api/market/universe',
    category: 'list',
    auth: 'none',
    responseType: 'json',
    params: [],
    ttlMs: 600_000,
    paginated: false,
    streaming: false,
    notes: 'Full upstream USDT spot universe (superset of the 478-pair manifest).',
  },
  myorders: {
    id: 'myorders',
    pathTemplate: '/api/market/myorders/{pair}',
    category: 'history',
    auth: 'apiKey',
    responseType: 'json',
    params: [],
    ttlMs: 0,
    paginated: false,
    streaming: false,
    notes:
      'Order history for one pair. Requires a bearer token -> OUT OF read-only scope; ' +
      'the client will surface AuthRequiredError. Documented but not exercised.',
  },
};

/** Every templated sub-resource id, in discovery order. */
export const SUBRESOURCE_IDS = Object.keys(SUBRESOURCES);

/**
 * Pagination policy. Recording this explicitly because it is a genuine finding:
 * the upstream exposes no offset/cursor on any /market or /api/market route, so all
 * pagination here is client-side windowing over the newest `limit` rows.
 */
export const PAGINATION = {
  serverSide: false,
  strategy: 'client-window' as const,
  note:
    'No upstream offset/cursor params exist. `limit` (capped per route) selects a newest-first ' +
    'window; the client slices that window into pages.',
};
