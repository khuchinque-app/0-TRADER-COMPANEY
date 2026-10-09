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
export type EndpointCategory = 'ticker' | 'orderbook' | 'trades' | 'candles' | 'history' | 'stats' | 'list' | 'unknown';
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
export declare const DEFAULT_CONFIG: MarketClientConfig;
/** Build a config from environment variables plus explicit overrides. */
export declare function loadConfig(env?: Record<string, string | undefined>, overrides?: Partial<MarketClientConfig>): MarketClientConfig;
/**
 * The HTML page routes under the primary scope (/market/*), as served by
 * apps/exchange/server.mjs `routeState()`. These return text/html (the SPA shell).
 */
export declare const PAGE_ROUTES: Record<string, SubresourceSpec>;
/**
 * The JSON endpoints the /market/* pages actually call. Captured by inspecting the
 * page bundle and confirmed live; see discovery-report.md ("network calls made by the page").
 */
export declare const SUBRESOURCES: Record<string, SubresourceSpec>;
/** Every templated sub-resource id, in discovery order. */
export declare const SUBRESOURCE_IDS: string[];
/**
 * Pagination policy. Recording this explicitly because it is a genuine finding:
 * the upstream exposes no offset/cursor on any /market or /api/market route, so all
 * pagination here is client-side windowing over the newest `limit` rows.
 */
export declare const PAGINATION: {
    serverSide: boolean;
    strategy: "client-window";
    note: string;
};
