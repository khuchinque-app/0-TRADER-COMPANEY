#!/usr/bin/env node
/**
 * tools/generate-endpoints.mjs — build endpoints.json programmatically.
 *
 * Mandate: "Generate the endpoint inventory programmatically based on the discovered route
 * templates and symbol list." Deliberately NOT ~500 hand-written records — the symbol list
 * comes from the service's own route manifest (packages/indodax-routes/routes.json, 478 pairs)
 * and the records are expanded from templates in src/config.ts.
 *
 * Output: packages/market-client/endpoints.json
 *
 * Usage: node tools/generate-endpoints.mjs [--manifest <path>] [--out <path>]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');
const REPO = resolve(PKG, '..', '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const MANIFEST_PATH = resolve(opt('manifest', join(REPO, 'packages', 'indodax-routes', 'routes.json')));
const OUT_PATH = resolve(opt('out', join(PKG, 'endpoints.json')));
const BASE_URL = process.env.MARKET_CLIENT_BASE_URL || 'http://187.127.178.20:22221';

// ---------------------------------------------------------------- live samples
// Captured verbatim from the running service during discovery (read-only GETs).
// Only endpoints we actually sampled carry a sample_response; the rest are {} and are
// marked inferred in discovery-report.md.
const SAMPLES = {
  health: {
    ok: true,
    mexc: 'up',
    mexcLatencyMs: 142,
    pairs: 478,
    live: 363,
    manifestGeneratedAt: '2026-10-09T03:00:29.919Z',
    manifestStale: false,
    simulasi: true,
    timestamp: '2026-10-09T09:46:25.413Z',
  },
  'ticker/ANIMEIDR': {
    slug: 'ANIMEIDR',
    base: 'ANIME',
    quote: 'IDR',
    inMarket: true,
    inDepth: true,
    inChart: true,
    mexcSymbol: 'ANIMEUSDT',
    state: 'LIVE',
    tradable: true,
    lastPrice: 49.87125,
    indicative: true,
    priceChangePercent: -0.021,
    highPrice: 51.17125,
    lowPrice: 47.2225,
    quoteVolume: 843641635.2,
    openPrice: 50.94375,
    bidPrice: 49.855,
    askPrice: 49.8875,
    stale: false,
    staleSince: null,
    simulasi: true,
  },
  'ticker/NO_FEED': {
    slug: 'ACSIDR',
    base: 'ACS',
    quote: 'IDR',
    inMarket: true,
    inDepth: true,
    inChart: true,
    mexcSymbol: null,
    state: 'NO_FEED',
    tradable: false,
    dataState: 'no-feed',
    message: 'no live feed in simulation',
    simulasi: true,
  },
};

const RESPONSE_SCHEMA = {
  ticker: {
    type: 'object',
    required: ['slug', 'base', 'quote', 'state', 'simulasi'],
    properties: {
      slug: 'string', base: 'string', quote: 'IDR|USDT', state: 'LIVE|NO_FEED',
      mexcSymbol: 'string|null', tradable: 'boolean', lastPrice: 'number?', indicative: 'boolean?',
      priceChangePercent: 'number?', highPrice: 'number?', lowPrice: 'number?',
      quoteVolume: 'number?', openPrice: 'number?', bidPrice: 'number?', askPrice: 'number?',
      stale: 'boolean?', staleSince: 'string|null', simulasi: 'boolean',
    },
    notes: 'Price fields are absent on NO_FEED; IDR-quoted pairs are indicative (USDT price x USDT/IDR rate).',
  },
  orderbook: {
    type: 'object',
    required: ['bids', 'asks', 'simulasi'],
    properties: { bids: '[number,number][]', asks: '[number,number][]', stale: 'boolean?', simulasi: 'boolean' },
    notes: 'Levels are [price, quantity] tuples, best-first.',
  },
  trades: {
    type: 'object',
    required: ['count', 'trades', 'simulasi'],
    properties: {
      count: 'number',
      trades: '{id:number|string,time:number(ms),price:number,qty:number,side:buy|sell}[]',
      stale: 'boolean?', simulasi: 'boolean',
    },
    notes: 'Newest first. `limit` caps the window; no offset cursor exists.',
  },
  candles: {
    type: 'object',
    required: ['interval', 'klines', 'simulasi'],
    properties: {
      interval: 'string',
      klines: '{time:number(ms),open:number,high:number,low:number,close:number,volume:number}[]',
      stale: 'boolean?', simulasi: 'boolean',
    },
    notes: 'Interval coerces to 1m when not in the allowed set.',
  },
  list: { type: 'object', notes: 'Array-bearing envelope; see sample_response.' },
  stats: { type: 'object', notes: 'Scalar status object; see sample_response.' },
  history: {
    type: 'object',
    required: ['open', 'history', 'fills'],
    properties: { open: 'Order[]', history: 'Order[]', fills: 'Fill[]', simulasi: 'boolean' },
    notes: 'Requires Authorization: Bearer <jwt> — OUT of read-only scope.',
  },
  unknown: { type: 'object', notes: 'text/html SPA shell, not JSON.' },
};

const PAGINATION = { server_side: false, strategy: 'client-window' };

// ---------------------------------------------------------------- template table
// Single source of truth for route templates. `expand` marks routes instantiated per pair.
const PRIMARY_TEMPLATES = [
  {
    template: '/market',
    category: 'list',
    expand: false,
    content_type: 'text/html',
    status_codes: [200],
    notes: 'Market listing page. SPA shell; rows hydrate client-side from /api/market/pairs.',
  },
  {
    template: '/market/{pair}',
    category: 'unknown',
    expand: true,
    content_type: 'text/html',
    status_codes: [200, 404],
    notes:
      'Trading pair page (PRIMARY reference endpoint: /market/ANIMEIDR). 200 when the slug is in the ' +
      'route manifest, real 404 when it is not. React app renders client-side.',
  },
  {
    template: '/market/depth_chart/{pair}',
    category: 'orderbook',
    expand: true,
    content_type: 'text/html',
    status_codes: [200, 404],
    notes: 'Depth-chart view. Same manifest slug validation as /market/{pair}.',
  },
];

const NETWORK_TEMPLATES = [
  { id: 'health', template: '/api/market/health', category: 'stats', auth: 'none', status_codes: [200], params: {}, streaming: false, sample: SAMPLES.health },
  { id: 'pairs', template: '/api/market/pairs', category: 'list', auth: 'none', status_codes: [200], params: {}, streaming: false },
  { id: 'tickers', template: '/api/market/tickers', category: 'list', auth: 'none', status_codes: [200, 502], params: {}, streaming: false },
  { id: 'ticker', template: '/api/market/ticker/{pair}', category: 'ticker', auth: 'none', status_codes: [200, 404, 502], params: {}, streaming: false, sample: SAMPLES['ticker/ANIMEIDR'] },
  { id: 'depth', template: '/api/market/depth/{pair}', category: 'orderbook', auth: 'none', status_codes: [200, 404, 502], params: { limit: { type: 'number', required: false, default: 20, min: 1, max: 500 } }, streaming: false },
  { id: 'trades', template: '/api/market/trades/{pair}', category: 'trades', auth: 'none', status_codes: [200, 404, 502], params: { limit: { type: 'number', required: false, default: 50, min: 1, max: 1000 } }, streaming: false, pagination: { ...PAGINATION, max_limit: 1000 } },
  { id: 'klines', template: '/api/market/klines/{pair}', category: 'candles', auth: 'none', status_codes: [200, 404, 502], params: { interval: { type: 'string', required: false, default: '1m', enum: ['1m', '5m', '15m', '30m', '60m', '4h', '1d', '1M'], aliases: { '1h': '60m' }, notes: 'The exchange UI sends 1h, which the API coerces to 1m; client normalises 1h -> 60m (finding F3).' }, limit: { type: 'number', required: false, default: 100, min: 1, max: 1000 } }, streaming: false },
  { id: 'manifest', template: '/api/market/manifest', category: 'list', auth: 'none', status_codes: [200], params: {}, streaming: false },
  { id: 'universe', template: '/api/market/universe', category: 'list', auth: 'none', status_codes: [200], params: {}, streaming: false },
  { id: 'myorders', template: '/api/market/myorders/{pair}', category: 'history', auth: 'apiKey', status_codes: [200, 401], params: {}, streaming: false, notes: 'Bearer JWT required -> out of read-only scope; documented only.' },
];

const rateLimitNote =
  'No rate-limit headers observed on responses. The service enforces a global 100 req/min ' +
  'limit on /api/* (backend) and this client self-limits to 1 req/s.';

function record(base) {
  return {
    method: 'GET',
    path: base.path,
    template: base.template,
    scope: base.scope,
    category: base.category,
    params: base.params ?? {},
    response_schema: base.response_schema ?? RESPONSE_SCHEMA[base.category] ?? RESPONSE_SCHEMA.unknown,
    auth: base.auth ?? 'none',
    rate_limit: base.rate_limit ?? rateLimitNote,
    sample_response: base.sample_response ?? {},
    content_type: base.content_type ?? 'application/json; charset=utf-8',
    status_codes: base.status_codes ?? [200],
    pagination: base.pagination ?? PAGINATION,
    streaming: base.streaming ?? false,
    ...(base.pair ? { pair: base.pair } : {}),
    notes: base.notes ?? '',
  };
}

// ---------------------------------------------------------------- main
if (!existsSync(MANIFEST_PATH)) {
  console.error(`manifest not found: ${MANIFEST_PATH}`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const pairs = manifest.pairs ?? [];
if (!pairs.length) {
  console.error('manifest has no pairs; refusing to emit an empty inventory');
  process.exit(2);
}

const endpoints = [];

// 1) primary scope: /market/* expanded per pair
for (const t of PRIMARY_TEMPLATES) {
  if (!t.expand) {
    endpoints.push(record({ ...t, path: t.template, scope: 'primary' }));
    continue;
  }
  for (const p of pairs) {
    endpoints.push(
      record({
        ...t,
        path: t.template.replace('{pair}', p.slug),
        scope: 'primary',
        pair: p.slug,
        sample_response: t.template === '/market/{pair}' && p.slug === 'ANIMEIDR'
          ? { note: 'text/html SPA shell; DATA from GET /api/market/ticker/ANIMEIDR', ticker: SAMPLES['ticker/ANIMEIDR'] }
          : {},
      }),
    );
  }
}

// 2) the JSON endpoints the /market/* pages call
for (const t of NETWORK_TEMPLATES) {
  endpoints.push(
    record({
      ...t,
      path: t.template,
      scope: 'page-network-call',
      response_schema: RESPONSE_SCHEMA[t.category] ?? RESPONSE_SCHEMA.unknown,
      sample_response: t.sample ?? {},
      notes: t.notes ?? '',
    }),
  );
}

const byScope = endpoints.reduce((a, e) => ({ ...a, [e.scope]: (a[e.scope] || 0) + 1 }), {});
const byCategory = endpoints.reduce((a, e) => ({ ...a, [e.category]: (a[e.category] || 0) + 1 }), {});

const out = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  generator: 'packages/market-client/tools/generate-endpoints.mjs',
  symbolSource: {
    file: 'packages/indodax-routes/routes.json',
    manifestGeneratedAt: manifest.generatedAt ?? null,
    pairs: pairs.length,
    quotes: pairs.reduce((a, p) => ({ ...a, [p.quote]: (a[p.quote] || 0) + 1 }), {}),
  },
  scope: {
    primary: '/market/* (HTML page routes)',
    pageNetworkCall: '/api/market/* (the JSON the /market pages fetch)',
    excluded: 'See out-of-scope.md',
  },
  counts: { total: endpoints.length, byScope, byCategory },
  paginationPolicy: {
    serverSide: false,
    note: 'No upstream offset/cursor params. Routes expose `limit` (capped) selecting a newest-first window.',
  },
  endpoints,
};

writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${OUT_PATH}`);
console.log(`  total=${out.counts.total}  primary=${byScope.primary || 0}  page-network-call=${byScope['page-network-call'] || 0}`);
console.log(`  pairs=${pairs.length}  byCategory=${JSON.stringify(byCategory)}`);
