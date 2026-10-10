import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSlug,
  toHollaexSymbol,
  toSlug,
  splitSlug,
  buildPairIndex,
} from '../lib/pair-resolver.mjs';

test('normalizeSlug uppercases and strips separators', () => {
  assert.equal(normalizeSlug('btc-idr'), 'BTCIDR');
  assert.equal(normalizeSlug(' anime/usdt '), 'ANIMEUSDT');
  assert.equal(normalizeSlug(''), '');
});

test('toHollaexSymbol strips one quote suffix and appends -usdt', () => {
  assert.equal(toHollaexSymbol('ANIMEIDR'), 'anime-usdt');
  assert.equal(toHollaexSymbol('BTCUSDT'), 'btc-usdt');
  assert.equal(toHollaexSymbol('btc-idr'), 'btc-usdt');
  assert.equal(toHollaexSymbol('ETHIDR'), 'eth-usdt');
});

test('toHollaexSymbol does not strip a bare quote', () => {
  assert.equal(toHollaexSymbol('IDR'), null);
  assert.equal(toHollaexSymbol('USDT'), null);
  assert.equal(toHollaexSymbol(''), null);
});

test('toSlug mirrors a symbol into the IDR namespace by default', () => {
  assert.equal(toSlug('btc-usdt'), 'BTCIDR');
  assert.equal(toSlug('anime-usdt', 'USDT'), 'ANIMEUSDT');
  assert.equal(toSlug('not-a-symbol'), null);
});

test('splitSlug returns base and quote', () => {
  assert.deepEqual(splitSlug('BTCIDR'), { base: 'BTC', quote: 'IDR' });
  assert.deepEqual(splitSlug('ethusdt'), { base: 'ETH', quote: 'USDT' });
  assert.equal(splitSlug('NOPE'), null);
});

test('buildPairIndex verifies against a live symbol list when provided', () => {
  const idx = buildPairIndex({
    slugs: ['BTCIDR', 'FAKEXYZIDR'],
    symbols: ['btc-usdt', 'eth-usdt'],
  });
  assert.equal(idx.verified, true);
  assert.equal(idx.slugToSymbol.get('BTCIDR'), 'btc-usdt');
  assert.equal(idx.slugToSymbol.has('FAKEXYZIDR'), false, 'unlisted pair is dropped');
  assert.equal(idx.symbolToSlug.get('eth-usdt'), 'ETHIDR');
});

test('buildPairIndex without symbols trusts the manifest slugs', () => {
  const idx = buildPairIndex({ slugs: ['BTCIDR'] });
  assert.equal(idx.verified, false);
  assert.equal(idx.slugToSymbol.get('BTCIDR'), 'btc-usdt');
});
