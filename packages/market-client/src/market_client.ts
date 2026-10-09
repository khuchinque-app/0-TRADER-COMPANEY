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

import {
  DEFAULT_CONFIG,
  PAGE_ROUTES,
  SUBRESOURCES,
  loadConfig,
  type MarketClientConfig,
  type SubresourceSpec,
} from './config';
import {
  ConfigError,
  HttpError,
  MarketClientError,
  NetworkError,
  ParseError,
  RateLimitError,
  TimeoutError,
  httpErrorFor,
} from './errors';
import { RateLimiter } from './rate-limiter';
import { TtlCache } from './cache';
import type {
  DepthResponse,
  KlinesResponse,
  PairsResponse,
  SubresourceId,
  SubresourceResponseMap,
  TickerResponse,
  TradesResponse,
} from './types';

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

const PAIR_RE = /^[A-Z0-9]{2,20}$/;

/** Normalise a user-supplied symbol: "anime/idr" -> ANIMEIDR. */
export function normalisePair(pair: string): string {
  const p = String(pair || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!PAIR_RE.test(p)) throw new ConfigError(`Invalid pair symbol: ${JSON.stringify(pair)}`);
  return p;
}

/** Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds. */
export function parseRetryAfter(header: string | null | undefined, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const raw = String(header).trim();
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;
  const when = Date.parse(raw);
  if (Number.isFinite(when)) return Math.max(0, when - now);
  return undefined;
}

export class MarketClient {
  readonly config: MarketClientConfig;
  private readonly limiter: RateLimiter;
  private readonly cache: TtlCache<ClientResponse<unknown>>;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private _requests = 0;
  private _retries = 0;

  constructor(config: Partial<MarketClientConfig> = {}, deps: MarketClientDeps = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (!this.config.baseUrl) throw new ConfigError('baseUrl is required');
    this.now = deps.now ?? (() => Date.now());
    this.sleep = deps.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    this.limiter = new RateLimiter({ minIntervalMs: this.config.minIntervalMs, now: this.now, sleep: this.sleep });
    this.cache = new TtlCache({ now: this.now });
    const f = deps.fetch ?? globalThis.fetch;
    if (typeof f !== 'function') throw new ConfigError('global fetch is unavailable; pass deps.fetch');
    this.fetchImpl = f;
  }

  /** Build a fully-qualified URL, dropping undefined params and applying defaults. */
  buildUrl(pathTemplate: string, params: Record<string, unknown> = {}): string {
    const origin = this.config.baseUrl.replace(/\/+$/, '');
    const path = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`;
    const url = new URL(origin + path);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  /** Expand "{pair}" in a template and pull in that spec's declared param defaults. */
  private resolveTemplate(spec: SubresourceSpec, pair?: string, params: Record<string, unknown> = {}) {
    const path = spec.pathTemplate.replace('{pair}', pair ? normalisePair(pair) : '');
    if (spec.pathTemplate.includes('{pair}') && !pair) {
      throw new ConfigError(`Route ${spec.id} requires a pair`);
    }
    const merged: Record<string, unknown> = {};
    for (const p of spec.params) if (p.default !== undefined) merged[p.name] = p.default;
    Object.assign(merged, params);
    for (const p of spec.params) {
      // 1) normalise accepted aliases to canonical form (e.g. 1h -> 60m)
      let v = merged[p.name];
      if (v !== undefined && v !== null && p.aliases) {
        const mapped = p.aliases[String(v)];
        if (mapped !== undefined) {
          merged[p.name] = mapped;
          v = mapped;
        }
      }
      if (p.required && (v === undefined || v === null || v === '')) {
        throw new ConfigError(`Missing required param "${p.name}" for route ${spec.id}`);
      }
      if (v !== undefined && v !== null && p.type === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new ConfigError(`Param "${p.name}" must be a number`);
        if (p.min !== undefined && n < p.min) throw new ConfigError(`Param "${p.name}" below min ${p.min}`);
        if (p.max !== undefined && n > p.max) throw new ConfigError(`Param "${p.name}" above max ${p.max}`);
        merged[p.name] = n;
      }
      if (v !== undefined && v !== null && p.enum && !p.enum.includes(String(v))) {
        throw new ConfigError(`Param "${p.name}" must be one of ${p.enum.join(', ')}`);
      }
    }
    return { path, params: merged };
  }

  /**
   * Generic request with rate limiting, retry/backoff, timeout and caching.
   * This is the single place that talks to the network.
   */
  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ClientResponse<T>> {
    const responseType = opts.responseType ?? 'json';
    const url = this.buildUrl(path, opts.params ?? {});
    const ttlMs = opts.ttlMs ?? this.config.cacheTtlMs;

    if (ttlMs > 0 && responseType === 'json') {
      const hit = this.cache.get(url);
      if (hit) return { ...hit, fromCache: true } as ClientResponse<T>;
    }

    const attempts = Math.max(1, this.config.maxRetries + 1);
    let lastError: MarketClientError | undefined;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.limiter.acquire();
      this._requests += 1;
      try {
        const res = await this.fetchOnce<T>(url, responseType, opts);
        if (ttlMs > 0 && responseType === 'json') this.cache.set(url, res, ttlMs);
        return res;
      } catch (err) {
        const e = err as MarketClientError;
        lastError = e;
        const retryable = this.isRetryable(e);
        if (!retryable || attempt === attempts) throw e;
        this._retries += 1;
        // 429: obey the server's own cool-down and back off; everything else: exponential.
        if (e instanceof RateLimitError && e.retryAfterMs) this.limiter.cooldown(e.retryAfterMs);
        const backoff = Math.min(
          this.config.backoffMaxMs,
          this.config.backoffBaseMs * Math.pow(2, attempt - 1),
        );
        await this.sleep(Math.max(backoff, e instanceof RateLimitError && e.retryAfterMs ? e.retryAfterMs : 0));
      }
    }
    throw lastError ?? new MarketClientError('request failed', 'network_error', { url });
  }

  /** One HTTP attempt. Returns a typed ClientResponse or throws a typed error. */
  private async fetchOnce<T>(
    url: string,
    responseType: 'json' | 'text',
    opts: RequestOptions,
  ): Promise<ClientResponse<T>> {
    const timeoutMs = this.config.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(url, timeoutMs)), Math.max(1, timeoutMs));
    const onAbort = () => controller.abort();
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', onAbort, { once: true });
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: responseType === 'json' ? 'application/json' : 'text/html',
          'user-agent': this.config.userAgent,
          ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
          ...(opts.headers ?? {}),
        },
      });
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (controller.signal.aborted || e?.name === 'AbortError' || e?.name === 'TimeoutError') {
        throw new TimeoutError(url, timeoutMs);
      }
      throw new NetworkError(`Network failure for ${url}: ${e?.message ?? String(err)}`, { url, cause: err });
    } finally {
      clearTimeout(timer);
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    }

    const contentType = res.headers?.get?.('content-type') ?? '';
    const bodyText = await res.text();

    if (!res.ok) {
      const retryAfter = parseRetryAfter(res.headers?.get?.('retry-after') ?? undefined, this.now());
      let parsed: unknown = bodyText;
      try {
        parsed = bodyText ? JSON.parse(bodyText) : undefined;
      } catch {
        /* keep raw text */
      }
      throw httpErrorFor(res.status, url, parsed, retryAfter);
    }

    if (responseType === 'text') {
      return { data: bodyText as unknown as T, status: res.status, contentType, url, fromCache: false };
    }

    if (!bodyText) throw new ParseError(url, 'empty body');
    let data: T;
    try {
      data = JSON.parse(bodyText) as T;
    } catch (err) {
      throw new ParseError(url, (err as Error).message, bodyText.slice(0, 200));
    }
    return { data, status: res.status, contentType, url, fromCache: false };
  }

  private isRetryable(e: MarketClientError): boolean {
    if (e instanceof RateLimitError) return true;
    if (e instanceof TimeoutError || e instanceof NetworkError) return true;
    // 5xx only; other 4xx (404/401/403) are deterministic — fail fast.
    if (e instanceof HttpError) return (e.status ?? 0) >= 500;
    return false;
  }

  // ------------------------------------------------------------------ public API

  /** `get_market(pair)` — the typed market descriptor for one symbol (reference: ANIMEIDR). */
  async getMarket(pair: string): Promise<ClientResponse<TickerResponse>> {
    return this.getMarketSubresource('ticker', pair);
  }

  /**
   * `get_market_subresource(pair, subresource, params)` — one generic entry point for
   * every templated route. `subresource` accepts a friendly alias (ticker, depth,
   * trades, klines, depth_chart, ...).
   */
  async getMarketSubresource<K extends SubresourceId>(
    subresource: K,
    pair?: string,
    params: Record<string, unknown> = {},
  ): Promise<ClientResponse<SubresourceResponseMap[K]>> {
    const spec = SUBRESOURCES[subresource];
    if (!spec) throw new ConfigError(`Unknown sub-resource: ${subresource}`);
    const { path, params: resolved } = this.resolveTemplate(spec, pair, params);
    return this.request<SubresourceResponseMap[K]>(path, {
      params: resolved as Record<string, string | number>,
      responseType: spec.responseType,
      // config.cacheTtlMs === 0 is a global kill switch; otherwise each route uses its
      // own observed server-side TTL (see config.ts).
      ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0,
    });
  }

  /** The HTML page route for one pair (primary scope: /market/{pair}). */
  async getMarketPage(pair: string): Promise<ClientResponse<string>> {
    const spec = PAGE_ROUTES.pair;
    const { path } = this.resolveTemplate(spec, pair, {});
    return this.request<string>(path, { responseType: 'text', ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0 });
  }

  /** The /market/depth_chart/{pair} page route. */
  async getDepthChartPage(pair: string): Promise<ClientResponse<string>> {
    const spec = PAGE_ROUTES.depth_chart;
    const { path } = this.resolveTemplate(spec, pair, {});
    return this.request<string>(path, { responseType: 'text', ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0 });
  }

  /** `list_markets()` — the symbol list the /market page hydrates from. */
  async listMarkets(): Promise<ClientResponse<PairsResponse>> {
    return this.getMarketSubresource('pairs');
  }

  /** Typed convenience wrappers (thin; no per-pair duplication). */
  async getTrades(pair: string, limit = 50): Promise<ClientResponse<TradesResponse>> {
    return this.getMarketSubresource('trades', pair, { limit });
  }

  async getKlines(pair: string, interval = '15m', limit = 100): Promise<ClientResponse<KlinesResponse>> {
    return this.getMarketSubresource('klines', pair, { interval, limit });
  }

  async getDepth(pair: string, limit = 20): Promise<ClientResponse<DepthResponse>> {
    return this.getMarketSubresource('depth', pair, { limit });
  }

  /**
   * Client-side pagination over a newest-first window. The upstream has no offset
   * cursor (see config.PAGINATION), so `total` is the size of the fetched window.
   */
  async paginate<T>(items: T[], opts: PaginateOptions): Promise<PaginatedResult<T>> {
    const pageSize = Math.max(1, Math.floor(opts.pageSize));
    const maxPages = Math.max(1, Math.floor(opts.maxPages ?? 1));
    const window = items.slice(0, pageSize * maxPages);
    const pages: T[][] = [];
    for (let i = 0; i < window.length; i += pageSize) pages.push(window.slice(i, i + pageSize));
    return { pages, items: window, truncated: items.length > window.length, total: items.length };
  }

  /** Fetch the trade window once and hand back paged slices. */
  async iterateTrades(pair: string, opts: PaginateOptions & { limit?: number } = { pageSize: 50 }): Promise<PaginatedResult<unknown>> {
    const limit = opts.limit ?? Math.max(opts.pageSize * (opts.maxPages ?? 1), opts.pageSize);
    const res = await this.getTrades(pair, limit);
    return this.paginate((res.data.trades ?? []) as unknown[], opts);
  }

  /** Resolve a spec by id (either a subtresource or a page route). */
  getSpec(id: string): SubresourceSpec | undefined {
    return SUBRESOURCES[id] ?? PAGE_ROUTES[id];
  }

  get stats(): {
    requests: number;
    retries: number;
    cache: { size: number; hits: number; misses: number };
    limiter: { waits: number; waitedMs: number };
  } {
    return {
      requests: this._requests,
      retries: this._retries,
      cache: this.cache.stats,
      limiter: this.limiter.stats,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/** Small factory so callers can do createMarketClient({ baseUrl }) without importing config. */
export function createMarketClient(
  overrides: Partial<MarketClientConfig> = {},
  deps: MarketClientDeps = {},
): MarketClient {
  return new MarketClient(loadConfig(process.env, overrides), deps);
}
