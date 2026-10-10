// apps/exchange/lib/market-client.mjs
// SERVER-SIDE ONLY. Thin HTTP-ready layer over the HollaEx adapter.
//
// Every function returns `{ status, body }` so the Express route handlers stay
// trivial and the 404 / NO_FEED / stale semantics are unit-testable without a
// running server. Response bodies follow the project convention
// `{ error: { code, message } }` for failures (AGENTS.md review checklist #6).

import { normalizeTicker, normalizeOrderbook, normalizeTrades, normalizeTickerList } from './hollaex-adapter.mjs';
import { buildPairIndex, normalizeSlug, toHollaexSymbol } from './pair-resolver.mjs';

const SIMULASI = true;

function err(status, code, message) {
  return { status, body: { error: { code, message } } };
}

/**
 * @param {object} deps
 * @param {ReturnType<import('./hollaex-adapter.mjs').createHollaexAdapter>} deps.adapter
 * @param {import('./pair-resolver.mjs').PairIndex} deps.index
 */
export function createMarketClient({ adapter, index }) {
  function resolve(pairSlug) {
    const slug = normalizeSlug(pairSlug);
    if (!slug) return null;
    // When the manifest index has slugs, membership is required: an unknown
    // slug is a 404, never a fabricated NO_FEED. When the index is empty the
    // resolution rule is applied directly (HollaEx is the source of truth).
    if (index.slugs.size > 0) {
      const symbol = index.slugToSymbol.get(slug);
      return symbol ? { slug, symbol } : null;
    }
    const symbol = toHollaexSymbol(slug);
    return symbol ? { slug, symbol } : null;
  }

  function list() {
    const pairs = [...index.slugToSymbol.entries()].map(([slug, symbol]) => ({
      slug,
      symbol,
      base: slug.replace(/(USDT|IDR)$/, ''),
      quote: slug.endsWith('USDT') ? 'USDT' : 'IDR',
    }));
    return { status: 200, body: { pairs, simulasi: SIMULASI } };
  }

  async function ticker(pairSlug) {
    const r = resolve(pairSlug);
    if (!r) return err(404, 'unknown_pair', `pair ${pairSlug} is not in the manifest`);
    const res = await adapter.get('ticker', { symbol: r.symbol });
    const t = res.noFeed ? null : normalizeTicker(Array.isArray(res.data) ? res.data[0] : res.data) || null;
    if (res.noFeed || !t || t.lastPrice == null) {
      return {
        status: 200,
        body: { state: 'NO_FEED', slug: r.slug, symbol: r.symbol, stale: true, simulasi: SIMULASI },
      };
    }
    return {
      status: 200,
      body: {
        state: 'LIVE',
        slug: r.slug,
        symbol: r.symbol,
        stale: res.stale,
        source: res.source,
        simulasi: SIMULASI,
        ...t,
      },
    };
  }

  async function orderbook(pairSlug, limit = 50) {
    const r = resolve(pairSlug);
    if (!r) return err(404, 'unknown_pair', `pair ${pairSlug} is not in the manifest`);
    const res = await adapter.get('orderbook', { symbol: r.symbol });
    const ob = res.noFeed ? null : normalizeOrderbook(res.data);
    if (!ob || (!ob.bids.length && !ob.asks.length)) {
      return {
        status: 200,
        body: { state: 'NO_FEED', slug: r.slug, symbol: r.symbol, bids: [], asks: [], stale: true, simulasi: SIMULASI },
      };
    }
    return {
      status: 200,
      body: {
        state: res.stale ? 'STALE' : 'LIVE',
        slug: r.slug,
        symbol: r.symbol,
        stale: res.stale,
        bids: ob.bids.slice(0, limit),
        asks: ob.asks.slice(0, limit),
        simulasi: SIMULASI,
      },
    };
  }

  async function trades(pairSlug, limit = 30) {
    const r = resolve(pairSlug);
    if (!r) return err(404, 'unknown_pair', `pair ${pairSlug} is not in the manifest`);
    const res = await adapter.get('trades', { symbol: r.symbol });
    const list = res.noFeed ? [] : normalizeTrades(res.data);
    if (!list.length) {
      return {
        status: 200,
        body: { state: 'NO_FEED', slug: r.slug, symbol: r.symbol, trades: [], stale: true, simulasi: SIMULASI },
      };
    }
    return {
      status: 200,
      body: { state: res.stale ? 'STALE' : 'LIVE', slug: r.slug, symbol: r.symbol, stale: res.stale, trades: list.slice(0, limit), simulasi: SIMULASI },
    };
  }

  return { resolve, list, ticker, orderbook, trades };
}

/**
 * Bootstrap a market client from the manifest slug list plus (optionally) a live
 * HollaEx pair list. Kept separate so tests can inject a fixture pair list.
 * @param {object} opts
 * @param {string[]} opts.slugs
 * @param {string[]} [opts.symbols] verified HollaEx symbols
 * @param {string} [opts.quote]
 * @param {object} opts.adapter
 */
export function createMarketClientFromSlugs({ slugs, symbols, quote, adapter }) {
  const index = buildPairIndex({ slugs, symbols, quote });
  return createMarketClient({ adapter, index });
}
