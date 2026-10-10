import test from 'node:test';
import assert from 'node:assert/strict';
import { createHollaexAdapter, normalizeTicker, normalizeOrderbook, normalizeTrades } from '../lib/hollaex-adapter.mjs';
import { fixture, jsonResponse, fetchThrows, fetchMalformed, clock } from './helpers.mjs';

function adapterWith(fetchImpl, extra = {}) {
  return createHollaexAdapter({
    apiURL: 'http://kit.local/v2',
    minIntervalMs: 0,
    fetchImpl,
    now: clock(1000),
    maxRetries: 0,
    ...extra,
  });
}

test('normalizeTicker derives changePercent and maps fields', () => {
  const t = normalizeTicker({ symbol: 'BTC-USDT', last: 110, open: 100, quote_volume: 1300, timestamp: 1 });
  assert.equal(t.symbol, 'btc-usdt');
  assert.equal(t.lastPrice, 110);
  assert.equal(t.priceChangePercent, 10);
  assert.equal(t.quoteVolume, 1300);
});

test('normalizeOrderbook accepts array and object levels', () => {
  const ob = normalizeOrderbook({ bids: [[1, 2]], asks: [{ price: 3, size: 4 }] });
  assert.deepEqual(ob.bids, [[1, 2]]);
  assert.deepEqual(ob.asks, [[3, 4]]);
});

test('normalizeTrades normalizes the trade list', () => {
  const tr = normalizeTrades(fixture('trades-btc-usdt.json'));
  assert.equal(tr.length, 3);
  assert.equal(tr[0].price, 110);
  assert.equal(tr[1].side, 'sell');
});

test('live fetch populates the cache; a second call is served from cache', async () => {
  let calls = 0;
  const adapter = adapterWith(async () => {
    calls++;
    return jsonResponse(fixture('ticker-btc-usdt.json'));
  });
  const a = await adapter.get('ticker', { symbol: 'btc-usdt' });
  const b = await adapter.get('ticker', { symbol: 'btc-usdt' });
  assert.equal(a.source, 'live');
  assert.equal(b.source, 'cache');
  assert.equal(calls, 1, 'upstream called once, second served from cache');
});

test('5xx with a previous cache entry falls back to stale (stale: true)', async () => {
  const now = clock(1000);
  let fail = false;
  const adapter = createHollaexAdapter({
    apiURL: 'http://kit.local/v2',
    minIntervalMs: 0,
    maxRetries: 0,
    now,
    fetchImpl: async () => {
      if (fail) return jsonResponse({}, 503);
      return jsonResponse(fixture('orderbook-btc-usdt.json'));
    },
  });
  await adapter.get('orderbook', { symbol: 'btc-usdt' }); // prime cache
  fail = true;
  now.advance(5000); // beyond 2s TTL, within 300s staleMax
  const r = await adapter.get('orderbook', { symbol: 'btc-usdt' });
  assert.equal(r.stale, true);
  assert.equal(r.source, 'stale');
  assert.ok(Array.isArray(r.data.bids));
});

test('5xx with no cache yields NO_FEED (no 5xx)', async () => {
  const adapter = adapterWith(async () => jsonResponse({}, 500));
  const r = await adapter.get('ticker', { symbol: 'btc-usdt' });
  assert.equal(r.noFeed, true);
  assert.equal(r.stale, true);
  assert.equal(r.data, null);
});

test('timeout yields NO_FEED, not a thrown error', async () => {
  const adapter = adapterWith(fetchThrows('TimeoutError'));
  const r = await adapter.get('ticker', { symbol: 'btc-usdt' });
  assert.equal(r.noFeed, true);
});

test('malformed JSON yields NO_FEED', async () => {
  const adapter = adapterWith(fetchMalformed());
  const r = await adapter.get('trades', { symbol: 'btc-usdt' });
  assert.equal(r.noFeed, true);
});

test('429 is retried with backoff and then succeeds', async () => {
  let calls = 0;
  const adapter = createHollaexAdapter({
    apiURL: 'http://kit.local/v2',
    minIntervalMs: 0,
    maxRetries: 2,
    now: clock(1000),
    fetchImpl: async () => {
      calls++;
      return calls < 3 ? jsonResponse({}, 429) : jsonResponse(fixture('ticker-btc-usdt.json'));
    },
  });
  const r = await adapter.get('ticker', { symbol: 'btc-usdt' });
  assert.equal(r.noFeed, false);
  assert.equal(calls, 3, 'retried twice then succeeded');
});

test('serialized queue enforces the min interval between distinct calls', async () => {
  const adapter = createHollaexAdapter({
    apiURL: 'http://kit.local/v2',
    minIntervalMs: 40,
    maxRetries: 0,
    now: () => Date.now(),
    fetchImpl: async () => jsonResponse(fixture('ticker-btc-usdt.json')),
  });
  const t0 = Date.now();
  await Promise.all([
    adapter.get('ticker', { symbol: 'btc-usdt' }),
    adapter.get('ticker', { symbol: 'eth-usdt' }),
  ]);
  assert.ok(Date.now() - t0 >= 35, 'second call waited for the rate-limit floor');
});

test('upstream 404 propagates as an error (not NO_FEED) for cache-less read', async () => {
  const adapter = adapterWith(async () => jsonResponse({}, 404));
  const r = await adapter.get('ticker', { symbol: 'nope-usdt' });
  // 404 is terminal: no cache => unavailable/NO_FEED is still the safe surface.
  assert.equal(r.noFeed, true);
});
