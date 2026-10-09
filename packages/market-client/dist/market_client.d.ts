/**
 * market_client.ts — a config-driven, typed client for the /market/* service.
 *
 * Design: routes are templates in config.ts, expanded with a symbol at call time. That is
 * what keeps this at ~1 generic request path instead of ~500 hand-written functions.
 *
 * Guarantees (each covered by tests/market_client.test.ts):
 *   - rate limited to config.minIntervalMs between request starts (default 1 req/s)
 *   - retries with exponential backoff on 429 / 5xx / network / timeout
 *   - honours Retry-After on 429 (seconds or HTTP-date) and pushes the limiter out
 *   - never retries 4xx other than 429 (404/401/403 fail fast, typed)
 *   - hard timeout per attempt via AbortSignal
 *   - TTL caching keyed by the fully-built URL
 *   - malformed JSON becomes ParseError, never a silent `undefined`
 */
import { type MarketClientConfig, type SubresourceSpec } from './config';
import type { DepthResponse, KlinesResponse, PairsResponse, SubresourceId, SubresourceResponseMap, TickerResponse, TradesResponse } from './types';
export interface MarketClientDeps {
    fetch?: typeof fetch;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
}
export interface RequestOptions {
    params?: Record<string, string | number | boolean | undefined>;
    /** Override the route's default cache TTL. 0 disables caching for this call. */
    ttlMs?: number;
    responseType?: 'json' | 'text';
    headers?: Record<string, string>;
    signal?: AbortSignal;
}
export interface ClientResponse<T> {
    data: T;
    status: number;
    contentType: string;
    url: string;
    fromCache: boolean;
}
export interface PaginateOptions {
    pageSize: number;
    maxPages?: number;
}
export interface PaginatedResult<T> {
    pages: T[][];
    items: T[];
    /** True when the source window had more rows than maxPages * pageSize. */
    truncated: boolean;
    total: number;
}
/** Normalise a user-supplied symbol: "anime/idr" -> ANIMEIDR. */
export declare function normalisePair(pair: string): string;
/** Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds. */
export declare function parseRetryAfter(header: string | null | undefined, now?: number): number | undefined;
export declare class MarketClient {
    readonly config: MarketClientConfig;
    private readonly limiter;
    private readonly cache;
    private readonly fetchImpl;
    private readonly sleep;
    private readonly now;
    private _requests;
    private _retries;
    constructor(config?: Partial<MarketClientConfig>, deps?: MarketClientDeps);
    /** Build a fully-qualified URL, dropping undefined params and applying defaults. */
    buildUrl(pathTemplate: string, params?: Record<string, unknown>): string;
    /** Expand "{pair}" in a template and pull in that spec's declared param defaults. */
    private resolveTemplate;
    /**
     * Generic request with rate limiting, retry/backoff, timeout and caching.
     * This is the single place that talks to the network.
     */
    request<T = unknown>(path: string, opts?: RequestOptions): Promise<ClientResponse<T>>;
    /** One HTTP attempt. Returns a typed ClientResponse or throws a typed error. */
    private fetchOnce;
    private isRetryable;
    /** `get_market(pair)` — the typed market descriptor for one symbol (reference: ANIMEIDR). */
    getMarket(pair: string): Promise<ClientResponse<TickerResponse>>;
    /**
     * `get_market_subresource(pair, subresource, params)` — one generic entry point for
     * every templated route. `subresource` accepts a friendly alias (ticker, depth,
     * trades, klines, depth_chart, ...).
     */
    getMarketSubresource<K extends SubresourceId>(subresource: K, pair?: string, params?: Record<string, unknown>): Promise<ClientResponse<SubresourceResponseMap[K]>>;
    /** The HTML page route for one pair (primary scope: /market/{pair}). */
    getMarketPage(pair: string): Promise<ClientResponse<string>>;
    /** The /market/depth_chart/{pair} page route. */
    getDepthChartPage(pair: string): Promise<ClientResponse<string>>;
    /** `list_markets()` — the symbol list the /market page hydrates from. */
    listMarkets(): Promise<ClientResponse<PairsResponse>>;
    /** Typed convenience wrappers (thin; no per-pair duplication). */
    getTrades(pair: string, limit?: number): Promise<ClientResponse<TradesResponse>>;
    getKlines(pair: string, interval?: string, limit?: number): Promise<ClientResponse<KlinesResponse>>;
    getDepth(pair: string, limit?: number): Promise<ClientResponse<DepthResponse>>;
    /**
     * Client-side pagination over a newest-first window. The upstream has no offset
     * cursor (see config.PAGINATION), so `total` is the size of the fetched window.
     */
    paginate<T>(items: T[], opts: PaginateOptions): Promise<PaginatedResult<T>>;
    /** Fetch the trade window once and hand back paged slices. */
    iterateTrades(pair: string, opts?: PaginateOptions & {
        limit?: number;
    }): Promise<PaginatedResult<unknown>>;
    /** Resolve a spec by id (either a subtresource or a page route). */
    getSpec(id: string): SubresourceSpec | undefined;
    get stats(): {
        requests: number;
        retries: number;
        cache: {
            size: number;
            hits: number;
            misses: number;
        };
        limiter: {
            waits: number;
            waitedMs: number;
        };
    };
    clearCache(): void;
}
/** Small factory so callers can do createMarketClient({ baseUrl }) without importing config. */
export declare function createMarketClient(overrides?: Partial<MarketClientConfig>, deps?: MarketClientDeps): MarketClient;
