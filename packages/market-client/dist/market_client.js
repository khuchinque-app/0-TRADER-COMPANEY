"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketClient = void 0;
exports.normalisePair = normalisePair;
exports.parseRetryAfter = parseRetryAfter;
exports.createMarketClient = createMarketClient;
const config_1 = require("./config");
const errors_1 = require("./errors");
const rate_limiter_1 = require("./rate-limiter");
const cache_1 = require("./cache");
const PAIR_RE = /^[A-Z0-9]{2,20}$/;
/** Normalise a user-supplied symbol: "anime/idr" -> ANIMEIDR. */
function normalisePair(pair) {
    const p = String(pair || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!PAIR_RE.test(p))
        throw new errors_1.ConfigError(`Invalid pair symbol: ${JSON.stringify(pair)}`);
    return p;
}
/** Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds. */
function parseRetryAfter(header, now = Date.now()) {
    if (!header)
        return undefined;
    const raw = String(header).trim();
    if (/^\d+$/.test(raw))
        return Number(raw) * 1000;
    const when = Date.parse(raw);
    if (Number.isFinite(when))
        return Math.max(0, when - now);
    return undefined;
}
class MarketClient {
    config;
    limiter;
    cache;
    fetchImpl;
    sleep;
    now;
    _requests = 0;
    _retries = 0;
    constructor(config = {}, deps = {}) {
        this.config = { ...config_1.DEFAULT_CONFIG, ...config };
        if (!this.config.baseUrl)
            throw new errors_1.ConfigError('baseUrl is required');
        this.now = deps.now ?? (() => Date.now());
        this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
        this.limiter = new rate_limiter_1.RateLimiter({ minIntervalMs: this.config.minIntervalMs, now: this.now, sleep: this.sleep });
        this.cache = new cache_1.TtlCache({ now: this.now });
        const f = deps.fetch ?? globalThis.fetch;
        if (typeof f !== 'function')
            throw new errors_1.ConfigError('global fetch is unavailable; pass deps.fetch');
        this.fetchImpl = f;
    }
    /** Build a fully-qualified URL, dropping undefined params and applying defaults. */
    buildUrl(pathTemplate, params = {}) {
        const origin = this.config.baseUrl.replace(/\/+$/, '');
        const path = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`;
        const url = new URL(origin + path);
        for (const [k, v] of Object.entries(params)) {
            if (v === undefined || v === null || v === '')
                continue;
            url.searchParams.set(k, String(v));
        }
        return url.toString();
    }
    /** Expand "{pair}" in a template and pull in that spec's declared param defaults. */
    resolveTemplate(spec, pair, params = {}) {
        const path = spec.pathTemplate.replace('{pair}', pair ? normalisePair(pair) : '');
        if (spec.pathTemplate.includes('{pair}') && !pair) {
            throw new errors_1.ConfigError(`Route ${spec.id} requires a pair`);
        }
        const merged = {};
        for (const p of spec.params)
            if (p.default !== undefined)
                merged[p.name] = p.default;
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
                throw new errors_1.ConfigError(`Missing required param "${p.name}" for route ${spec.id}`);
            }
            if (v !== undefined && v !== null && p.type === 'number') {
                const n = Number(v);
                if (!Number.isFinite(n))
                    throw new errors_1.ConfigError(`Param "${p.name}" must be a number`);
                if (p.min !== undefined && n < p.min)
                    throw new errors_1.ConfigError(`Param "${p.name}" below min ${p.min}`);
                if (p.max !== undefined && n > p.max)
                    throw new errors_1.ConfigError(`Param "${p.name}" above max ${p.max}`);
                merged[p.name] = n;
            }
            if (v !== undefined && v !== null && p.enum && !p.enum.includes(String(v))) {
                throw new errors_1.ConfigError(`Param "${p.name}" must be one of ${p.enum.join(', ')}`);
            }
        }
        return { path, params: merged };
    }
    /**
     * Generic request with rate limiting, retry/backoff, timeout and caching.
     * This is the single place that talks to the network.
     */
    async request(path, opts = {}) {
        const responseType = opts.responseType ?? 'json';
        const url = this.buildUrl(path, opts.params ?? {});
        const ttlMs = opts.ttlMs ?? this.config.cacheTtlMs;
        if (ttlMs > 0 && responseType === 'json') {
            const hit = this.cache.get(url);
            if (hit)
                return { ...hit, fromCache: true };
        }
        const attempts = Math.max(1, this.config.maxRetries + 1);
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            await this.limiter.acquire();
            this._requests += 1;
            try {
                const res = await this.fetchOnce(url, responseType, opts);
                if (ttlMs > 0 && responseType === 'json')
                    this.cache.set(url, res, ttlMs);
                return res;
            }
            catch (err) {
                const e = err;
                lastError = e;
                const retryable = this.isRetryable(e);
                if (!retryable || attempt === attempts)
                    throw e;
                this._retries += 1;
                // 429: obey the server's own cool-down and back off; everything else: exponential.
                if (e instanceof errors_1.RateLimitError && e.retryAfterMs)
                    this.limiter.cooldown(e.retryAfterMs);
                const backoff = Math.min(this.config.backoffMaxMs, this.config.backoffBaseMs * Math.pow(2, attempt - 1));
                await this.sleep(Math.max(backoff, e instanceof errors_1.RateLimitError && e.retryAfterMs ? e.retryAfterMs : 0));
            }
        }
        throw lastError ?? new errors_1.MarketClientError('request failed', 'network_error', { url });
    }
    /** One HTTP attempt. Returns a typed ClientResponse or throws a typed error. */
    async fetchOnce(url, responseType, opts) {
        const timeoutMs = this.config.timeoutMs;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new errors_1.TimeoutError(url, timeoutMs)), Math.max(1, timeoutMs));
        const onAbort = () => controller.abort();
        if (opts.signal) {
            if (opts.signal.aborted)
                controller.abort();
            else
                opts.signal.addEventListener('abort', onAbort, { once: true });
        }
        let res;
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
        }
        catch (err) {
            const e = err;
            if (controller.signal.aborted || e?.name === 'AbortError' || e?.name === 'TimeoutError') {
                throw new errors_1.TimeoutError(url, timeoutMs);
            }
            throw new errors_1.NetworkError(`Network failure for ${url}: ${e?.message ?? String(err)}`, { url, cause: err });
        }
        finally {
            clearTimeout(timer);
            if (opts.signal)
                opts.signal.removeEventListener('abort', onAbort);
        }
        const contentType = res.headers?.get?.('content-type') ?? '';
        const bodyText = await res.text();
        if (!res.ok) {
            const retryAfter = parseRetryAfter(res.headers?.get?.('retry-after') ?? undefined, this.now());
            let parsed = bodyText;
            try {
                parsed = bodyText ? JSON.parse(bodyText) : undefined;
            }
            catch {
                /* keep raw text */
            }
            throw (0, errors_1.httpErrorFor)(res.status, url, parsed, retryAfter);
        }
        if (responseType === 'text') {
            return { data: bodyText, status: res.status, contentType, url, fromCache: false };
        }
        if (!bodyText)
            throw new errors_1.ParseError(url, 'empty body');
        let data;
        try {
            data = JSON.parse(bodyText);
        }
        catch (err) {
            throw new errors_1.ParseError(url, err.message, bodyText.slice(0, 200));
        }
        return { data, status: res.status, contentType, url, fromCache: false };
    }
    isRetryable(e) {
        if (e instanceof errors_1.RateLimitError)
            return true;
        if (e instanceof errors_1.TimeoutError || e instanceof errors_1.NetworkError)
            return true;
        // 5xx only; other 4xx (404/401/403) are deterministic — fail fast.
        if (e instanceof errors_1.HttpError)
            return (e.status ?? 0) >= 500;
        return false;
    }
    // ------------------------------------------------------------------ public API
    /** `get_market(pair)` — the typed market descriptor for one symbol (reference: ANIMEIDR). */
    async getMarket(pair) {
        return this.getMarketSubresource('ticker', pair);
    }
    /**
     * `get_market_subresource(pair, subresource, params)` — one generic entry point for
     * every templated route. `subresource` accepts a friendly alias (ticker, depth,
     * trades, klines, depth_chart, ...).
     */
    async getMarketSubresource(subresource, pair, params = {}) {
        const spec = config_1.SUBRESOURCES[subresource];
        if (!spec)
            throw new errors_1.ConfigError(`Unknown sub-resource: ${subresource}`);
        const { path, params: resolved } = this.resolveTemplate(spec, pair, params);
        return this.request(path, {
            params: resolved,
            responseType: spec.responseType,
            // config.cacheTtlMs === 0 is a global kill switch; otherwise each route uses its
            // own observed server-side TTL (see config.ts).
            ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0,
        });
    }
    /** The HTML page route for one pair (primary scope: /market/{pair}). */
    async getMarketPage(pair) {
        const spec = config_1.PAGE_ROUTES.pair;
        const { path } = this.resolveTemplate(spec, pair, {});
        return this.request(path, { responseType: 'text', ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0 });
    }
    /** The /market/depth_chart/{pair} page route. */
    async getDepthChartPage(pair) {
        const spec = config_1.PAGE_ROUTES.depth_chart;
        const { path } = this.resolveTemplate(spec, pair, {});
        return this.request(path, { responseType: 'text', ttlMs: this.config.cacheTtlMs > 0 ? spec.ttlMs : 0 });
    }
    /** `list_markets()` — the symbol list the /market page hydrates from. */
    async listMarkets() {
        return this.getMarketSubresource('pairs');
    }
    /** Typed convenience wrappers (thin; no per-pair duplication). */
    async getTrades(pair, limit = 50) {
        return this.getMarketSubresource('trades', pair, { limit });
    }
    async getKlines(pair, interval = '15m', limit = 100) {
        return this.getMarketSubresource('klines', pair, { interval, limit });
    }
    async getDepth(pair, limit = 20) {
        return this.getMarketSubresource('depth', pair, { limit });
    }
    /**
     * Client-side pagination over a newest-first window. The upstream has no offset
     * cursor (see config.PAGINATION), so `total` is the size of the fetched window.
     */
    async paginate(items, opts) {
        const pageSize = Math.max(1, Math.floor(opts.pageSize));
        const maxPages = Math.max(1, Math.floor(opts.maxPages ?? 1));
        const window = items.slice(0, pageSize * maxPages);
        const pages = [];
        for (let i = 0; i < window.length; i += pageSize)
            pages.push(window.slice(i, i + pageSize));
        return { pages, items: window, truncated: items.length > window.length, total: items.length };
    }
    /** Fetch the trade window once and hand back paged slices. */
    async iterateTrades(pair, opts = { pageSize: 50 }) {
        const limit = opts.limit ?? Math.max(opts.pageSize * (opts.maxPages ?? 1), opts.pageSize);
        const res = await this.getTrades(pair, limit);
        return this.paginate((res.data.trades ?? []), opts);
    }
    /** Resolve a spec by id (either a subtresource or a page route). */
    getSpec(id) {
        return config_1.SUBRESOURCES[id] ?? config_1.PAGE_ROUTES[id];
    }
    get stats() {
        return {
            requests: this._requests,
            retries: this._retries,
            cache: this.cache.stats,
            limiter: this.limiter.stats,
        };
    }
    clearCache() {
        this.cache.clear();
    }
}
exports.MarketClient = MarketClient;
/** Small factory so callers can do createMarketClient({ baseUrl }) without importing config. */
function createMarketClient(overrides = {}, deps = {}) {
    return new MarketClient((0, config_1.loadConfig)(process.env, overrides), deps);
}
