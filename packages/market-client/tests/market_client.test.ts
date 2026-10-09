import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MarketClient,
  RateLimiter,
  TtlCache,
  ConfigError,
  NotFoundError,
  ParseError,
  RateLimitError,
  ServerError,
  TimeoutError,
  normalisePair,
  parseRetryAfter,
} from '../src/index';

// All tests use recorded fixtures + a mocked fetch. No live requests are ever made
// (mandate: "Unit tests must use recorded fixtures or mocks, not live requests by default").
const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name: string) => readFileSync(join(FIX, name), 'utf8');

const TICKER_LIVE = fixture('ticker-animeidr.json');
const TICKER_NO_FEED = fixture('ticker-no-feed.json');
const TRADES = fixture('trades-animeidr.json');
const ERR_429 = fixture('error-429.json');

/** Minimal Response stand-in for the client's fetch contract. */
const makeRes = (status: number, body: string, headers: Record<string, string> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: async () => body,
  }) as unknown as Response;

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

/** Deterministic clock so rate-limit waits are recorded instead of slept. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => { sleeps.push(ms); t += ms; },
    sleeps,
    advance: (ms: number) => { t += ms; },
  };
}

function mkClient(fetchImpl: typeof fetch, config: Record<string, unknown> = {}) {
  const clock = fakeClock();
  const client = new MarketClient(
    { baseUrl: 'http://demo.test', minIntervalMs: 1000, cacheTtlMs: 0, maxRetries: 0, ...config },
    { fetch: fetchImpl, now: clock.now, sleep: clock.sleep },
  );
  return { client, clock };
}

describe('MarketClient — successful parsing', () => {
  it('getMarket() normalises the symbol and parses a live ticker fixture', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TICKER_LIVE, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const res = await client.getMarket('anime/idr');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(res.url).toBe('http://demo.test/api/market/ticker/ANIMEIDR');
    expect(res.data.slug).toBe('ANIMEIDR');
    expect(res.data.state).toBe('LIVE');
    expect(res.data.lastPrice).toBeCloseTo(49.87125);
    expect(res.data.simulasi).toBe(true);
    expect(res.fromCache).toBe(false);
  });

  it('parses a NO_FEED ticker without inventing price fields', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TICKER_NO_FEED, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const res = await client.getMarket('ACSIDR');

    expect(res.data.state).toBe('NO_FEED');
    expect(res.data.tradable).toBe(false);
    expect(res.data.lastPrice).toBeUndefined();
    // NO_FEED must be a 200, never a 5xx (task.md: "never returns 5xx")
    expect(res.status).toBe(200);
  });

  it('getMarketPage() fetches the /market/{pair} HTML route as text', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, '<html><div id="root"></div></html>', { 'content-type': 'text/html' }));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const res = await client.getMarketPage('animeidr');

    expect(res.url).toBe('http://demo.test/market/ANIMEIDR');
    expect(res.contentType).toContain('text/html');
    expect(res.data).toContain('id="root"');
  });

  it('expands templates + param defaults generically (no per-endpoint functions)', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, JSON.stringify({ bids: [], asks: [], simulasi: true }), jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    await client.getMarketSubresource('depth', 'ANIMEIDR', {});
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('http://demo.test/api/market/depth/ANIMEIDR?limit=20');

    // the UI spelling `1h` normalises to the API's canonical `60m` (finding F3)
    await client.getMarketSubresource('klines', 'ANIMEIDR', { interval: '1h' });
    expect((fetchImpl.mock.calls[1] as unknown[])[0]).toBe('http://demo.test/api/market/klines/ANIMEIDR?interval=60m&limit=100');

    await client.getDepthChartPage('ANIMEIDR');
    expect((fetchImpl.mock.calls[2] as unknown[])[0]).toBe('http://demo.test/market/depth_chart/ANIMEIDR');
  });

  it('listMarkets() reads the symbol list endpoint', async () => {
    const body = JSON.stringify({ generatedAt: 'x', stale: false, static: ['', '/market'], count: 1, pairs: [{ slug: 'ANIMEIDR', base: 'ANIME', quote: 'IDR', inMarket: true, inDepth: true, inChart: true, mexcSymbol: 'ANIMEUSDT', state: 'LIVE' }], simulasi: true });
    const fetchImpl = vi.fn(async () => makeRes(200, body, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const res = await client.listMarkets();

    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('http://demo.test/api/market/pairs');
    expect(res.data.count).toBe(1);
    expect(res.data.pairs[0].slug).toBe('ANIMEIDR');
  });
});

describe('MarketClient — HTTP error handling', () => {
  it('404 throws NotFoundError and is NOT retried', async () => {
    const fetchImpl = vi.fn(async () => makeRes(404, JSON.stringify({ error: 'not_in_manifest' }), jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch, { maxRetries: 3 });

    await expect(client.getMarket('NOPEIDR')).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('500 is retried with exponential backoff, then surfaces ServerError', async () => {
    const fetchImpl = vi.fn(async () => makeRes(500, '{}', jsonHeaders));
    const { client, clock } = mkClient(fetchImpl as unknown as typeof fetch, { maxRetries: 3, backoffBaseMs: 100 });

    const err = await client.getMarket('ANIMEIDR').catch((e) => e);

    expect(err).toBeInstanceOf(ServerError);
    expect(err.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(4); // 1 + 3 retries
    expect(clock.sleeps.filter((s) => s === 100 || s === 200 || s === 400)).toEqual([100, 200, 400]);
  });

  it('429 honours Retry-After, pushes the limiter out, then surfaces RateLimitError', async () => {
    const fetchImpl = vi.fn(async () => makeRes(429, ERR_429, { ...jsonHeaders, 'retry-after': '2' }));
    const { client, clock } = mkClient(fetchImpl as unknown as typeof fetch, { maxRetries: 1, backoffBaseMs: 50 });

    const err = await client.getMarket('ANIMEIDR').catch((e) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterMs).toBe(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // backoff must respect the server's own cool-down (>= 2000ms), not the 50ms base
    expect(Math.max(...clock.sleeps)).toBeGreaterThanOrEqual(2000);
  });

  it('timeout raises TimeoutError, not a silent hang', async () => {
    const hang = (_u: unknown, init: { signal: AbortSignal }) =>
      new Promise<Response>((_res, rej) => {
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    const { client } = mkClient(hang as unknown as typeof fetch, { timeoutMs: 25, maxRetries: 0 });

    await expect(client.getMarket('ANIMEIDR')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('malformed JSON raises ParseError instead of returning undefined', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, '<html>not json</html>', { 'content-type': 'application/json' }));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const err = await client.getMarket('ANIMEIDR').catch((e) => e);

    expect(err).toBeInstanceOf(ParseError);
    expect(err.bodyPreview).toContain('<html>');
  });

  it('an empty body is a ParseError, not a 200 with undefined data', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, '', jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    await expect(client.getMarket('ANIMEIDR')).rejects.toBeInstanceOf(ParseError);
  });
});

describe('MarketClient — config validation', () => {
  it('rejects an unknown sub-resource', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);
    await expect(client.getMarketSubresource('nope' as 'ticker')).rejects.toBeInstanceOf(ConfigError);
  });

  it('rejects a templated route with no pair', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);
    await expect(client.getMarket(undefined as unknown as string)).rejects.toBeInstanceOf(ConfigError);
  });

  it('rejects an out-of-range limit', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);
    await expect(client.getMarketSubresource('depth', 'ANIMEIDR', { limit: 9999 })).rejects.toBeInstanceOf(ConfigError);
  });

  it('rejects an interval outside the allowed enum', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);
    await expect(client.getMarketSubresource('klines', 'ANIMEIDR', { interval: '7m' })).rejects.toBeInstanceOf(ConfigError);
  });

  it('normalises the `1h` alias to the canonical `60m` and keeps the canonical form', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, '{}', jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch, { minIntervalMs: 0, cacheTtlMs: 0 });

    await client.getMarketSubresource('klines', 'ANIMEIDR', { interval: '1h' });
    await client.getMarketSubresource('klines', 'ANIMEIDR', { interval: '60m' });

    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('http://demo.test/api/market/klines/ANIMEIDR?interval=60m&limit=100');
    expect((fetchImpl.mock.calls[1] as unknown[])[0]).toBe('http://demo.test/api/market/klines/ANIMEIDR?interval=60m&limit=100');
  });

  it('normalises symbols and rejects junk', () => {
    expect(normalisePair('anime/idr')).toBe('ANIMEIDR');
    expect(normalisePair(' btc-usdt ')).toBe('BTCUSDT');
    expect(() => normalisePair('$$$')).toThrow(ConfigError);
  });

  it('parses Retry-After in both seconds and HTTP-date form', () => {
    expect(parseRetryAfter('5')).toBe(5000);
    expect(parseRetryAfter(null)).toBeUndefined();
    const now = Date.UTC(2026, 0, 1, 0, 0, 10);
    const when = new Date(now + 3000).toUTCString();
    expect(parseRetryAfter(when, now)).toBe(3000);
  });
});

describe('RateLimiter', () => {
  it('serialises calls to the configured minimum interval', async () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ minIntervalMs: 1000, now: clock.now, sleep: clock.sleep });

    await rl.acquire();
    expect(clock.sleeps).toEqual([]);

    await rl.acquire();
    await rl.acquire();
    expect(clock.sleeps).toEqual([1000, 1000]);
    expect(rl.stats.waits).toBe(2);
  });

  it('never exceeds 1 request per second across 5 calls', async () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ minIntervalMs: 1000, now: clock.now, sleep: clock.sleep });
    for (let i = 0; i < 5; i++) await rl.acquire();
    // 5 slots at 1000ms spacing => 4 gaps
    expect(clock.sleeps).toEqual([1000, 1000, 1000, 1000]);
  });

  it('cooldown() delays subsequent calls (server 429 push-back)', async () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ minIntervalMs: 0, now: clock.now, sleep: clock.sleep });
    rl.cooldown(4000);
    await rl.acquire();
    expect(clock.sleeps).toEqual([4000]);
  });

  it('the client rate-limits successive requests end to end', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TICKER_LIVE, jsonHeaders));
    const { client, clock } = mkClient(fetchImpl as unknown as typeof fetch, { minIntervalMs: 1000, cacheTtlMs: 0 });

    await client.getMarket('ANIMEIDR');
    await client.getMarket('ACSIDR');

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(clock.sleeps).toContain(1000);
  });
});

describe('Caching', () => {
  it('serves a repeated identical request from cache', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TICKER_LIVE, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch, { cacheTtlMs: 5000 });

    const a = await client.getMarket('ANIMEIDR');
    const b = await client.getMarket('ANIMEIDR');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(b.fromCache).toBe(true);
    expect(client.stats.cache.hits).toBe(1);
  });

  it('does not serve different params from the same key', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TRADES, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch, { cacheTtlMs: 5000, minIntervalMs: 0 });

    await client.getTrades('ANIMEIDR', 5);
    await client.getTrades('ANIMEIDR', 50);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('TtlCache expires entries', () => {
    let t = 0;
    const c = new TtlCache({ now: () => t });
    c.set('k', 1, 100);
    expect(c.get('k')).toBe(1);
    t = 200;
    expect(c.get('k')).toBeUndefined();
    expect(c.stats.misses).toBe(1);
  });
});

describe('Pagination (client-side windowing)', () => {
  it('slices a newest-first window into pages and reports truncation', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);

    const items = Array.from({ length: 10 }, (_, i) => i);
    const paged = await client.paginate(items, { pageSize: 3, maxPages: 2 });

    expect(paged.pages).toEqual([[0, 1, 2], [3, 4, 5]]);
    expect(paged.items).toHaveLength(6);
    expect(paged.total).toBe(10);
    expect(paged.truncated).toBe(true);
  });

  it('is not truncated when the window covers everything', async () => {
    const { client } = mkClient((async () => makeRes(200, '{}')) as unknown as typeof fetch);
    const paged = await client.paginate([1, 2, 3], { pageSize: 5 });
    expect(paged.truncated).toBe(false);
    expect(paged.pages).toEqual([[1, 2, 3]]);
  });

  it('iterateTrades fetches the tape once and pages it', async () => {
    const fetchImpl = vi.fn(async () => makeRes(200, TRADES, jsonHeaders));
    const { client } = mkClient(fetchImpl as unknown as typeof fetch);

    const paged = await client.iterateTrades('ANIMEIDR', { pageSize: 3, maxPages: 2 });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('http://demo.test/api/market/trades/ANIMEIDR?limit=6');
    expect(paged.total).toBe(7);
    expect(paged.pages[0]).toHaveLength(3);
    expect(paged.truncated).toBe(true);
    // newest first, per the service contract
    expect((paged.items[0] as { id: number }).id).toBe(7);
  });
});
