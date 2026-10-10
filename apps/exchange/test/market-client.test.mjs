import test from 'node:test';
import assert from 'node:assert/strict';
import { createHollaexAdapter } from '../lib/hollaex-adapter.mjs';
import { createMarketClient } from '../lib/market-client.mjs';
import { buildPairIndex } from '../lib/pair-resolver.mjs';
import { fixture, jsonResponse, fetchThrows, clock } from './helpers.mjs';

function client(fetchImpl, { slugs = ['BTCIDR', 'ETHIDR'], symbols } = {}) {
  const adapter = createHollaexAdapter({
    apiURL: 'http://kit.local/v2',
    minIntervalMs: 0,
    maxRetries: 0,
    fetchImpl,
    now: clock(1000),
  });
  return createMarketClient({ adapter, index: buildPairIndex({ slugs, symbols }) });
}

test('list() returns manifest pairs with symbol mapping', () => {
  const c = client(async () => jsonResponse([]));
  const { status, body } = c.list();
  assert.equal(status, 200);
  const btc = body.pairs.find((p) => p.slug === 'BTCIDR');
  assert.equal(btc.symbol, 'btc-usdt');
  assert.equal(btc.base, 'BTC');
  assert.equal(body.simulasi, true);
});

test('ticker() LIVE success maps the fixture', async () => {
  const c = client(async () => jsonResponse(fixture('ticker-btc-usdt.json')));
  const { status, body } = await c.ticker('BTCIDR');
  assert.equal(status, 200);
  assert.equal(body.state, 'LIVE');
  assert.equal(body.lastPrice, 110);
  assert.equal(body.priceChangePercent, 10);
  assert.equal(body.stale, false);
});

test('ticker() unknown pair -> 404 with error shape', async () => {
  const c = client(async () => jsonResponse(fixture('ticker-btc-usdt.json')));
  const { status, body } = await c.ticker('FAKEXYZ');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'unknown_pair');
  assert.ok(body.error.message);
});

test('ticker() empty upstream feed -> 200 NO_FEED with stale: true', async () => {
  const c = client(async () => jsonResponse([]));
  const { status, body } = await c.ticker('BTCIDR');
  assert.equal(status, 200, 'missing feed must not be a 5xx');
  assert.equal(body.state, 'NO_FEED');
  assert.equal(body.stale, true);
});

test('ticker() unreachable upstream (timeout) -> 200 NO_FEED', async () => {
  const c = client(fetchThrows('TimeoutError'));
  const { status, body } = await c.ticker('BTCIDR');
  assert.equal(status, 200);
  assert.equal(body.state, 'NO_FEED');
  assert.equal(body.stale, true);
});

test('orderbook() success returns bids and asks', async () => {
  const c = client(async () => jsonResponse(fixture('orderbook-btc-usdt.json')));
  const { status, body } = await c.orderbook('BTCIDR');
  assert.equal(status, 200);
  assert.equal(body.state, 'LIVE');
  assert.equal(body.bids.length, 3);
  assert.equal(body.asks[0][0], 111);
});

test('orderbook() unknown pair -> 404', async () => {
  const c = client(async () => jsonResponse(fixture('orderbook-btc-usdt.json')));
  const { status, body } = await c.orderbook('NOPEIDR');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'unknown_pair');
});

test('trades() success returns normalized trades', async () => {
  const c = client(async () => jsonResponse(fixture('trades-btc-usdt.json')));
  const { status, body } = await c.trades('BTCIDR');
  assert.equal(status, 200);
  assert.equal(body.trades.length, 3);
  assert.equal(body.trades[0].qty, 0.5);
});

test('trades() upstream failure -> 200 NO_FEED with empty array', async () => {
  const c = client(fetchThrows('AbortError'));
  const { status, body } = await c.trades('BTCIDR');
  assert.equal(status, 200);
  assert.equal(body.state, 'NO_FEED');
  assert.deepEqual(body.trades, []);
});

test('verified index rejects a pair not listed by HollaEx', async () => {
  const c = client(async () => jsonResponse(fixture('ticker-btc-usdt.json')), {
    slugs: ['BTCIDR'],
    symbols: ['eth-usdt'],
  });
  const { status, body } = await c.ticker('BTCIDR');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'unknown_pair');
});
