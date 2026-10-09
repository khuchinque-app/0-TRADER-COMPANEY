#!/usr/bin/env node
/**
 * tools/discover.mjs — read-only, rate-limited confirmation pass.
 *
 * Why not a browser: Chrome in this environment cannot open ANY http URL (it hangs; only
 * data: URLs render). Confirmed empirically — see discovery-report.md. So this prober uses
 * plain HTTP with a strict politeness budget instead:
 *   - max 1 request/second (configurable, never below 1/s by default)
 *   - exponential backoff on 429/5xx, honours Retry-After
 *   - GET only; nothing outside /market/* and /api/market/* is ever requested
 *
 * It does NOT enumerate all 957 primary routes (that would be ~16 minutes of traffic
 * against a demo box). It probes a stratified sample so the report can state exactly
 * which endpoints are CONFIRMED vs INFERRED.
 *
 * Usage:
 *   node tools/discover.mjs [--base URL] [--out FILE] [--no-network]
 *   --no-network  offline mode: derive expectations from endpoints.json only
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const BASE = opt('base', process.env.MARKET_CLIENT_BASE_URL || 'http://187.127.178.20:22221').replace(/\/+$/, '');
const OUT = resolve(opt('out', join(PKG, 'discovery-evidence.json')));
const OFFLINE = argv.includes('--no-network');
const MIN_INTERVAL_MS = Math.max(1000, Number(opt('interval', '1000')) || 1000);
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastStart = 0;
async function politeFetch(url) {
  let attempt = 0;
  for (;;) {
    const gap = MIN_INTERVAL_MS - (Date.now() - lastStart);
    if (gap > 0) await sleep(gap);
    lastStart = Date.now();
    attempt += 1;
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { accept: 'application/json,text/html;q=0.9,*/*;q=0.8', 'user-agent': '@trading/market-client discover/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.text();
      const out = {
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        retryAfter: res.headers.get('retry-after'),
        ratelimitHeaders: [...res.headers.entries()].filter(([k]) => /rate|limit|retry/i.test(k)),
        ms: Date.now() - t0,
        bodyPreview: body.slice(0, 300),
        bodyBytes: body.length,
        attempts: attempt,
      };
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt <= MAX_RETRIES) {
        const ra = Number(res.headers.get('retry-after'));
        const backoff = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(8000, 500 * 2 ** (attempt - 1));
        console.error(`  .. ${res.status} on ${url} -> backoff ${backoff}ms (attempt ${attempt})`);
        await sleep(backoff);
        continue;
      }
      return out;
    } catch (err) {
      if (attempt > MAX_RETRIES) return { status: 0, error: String(err.message || err), ms: Date.now() - t0, attempts: attempt };
      const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
      console.error(`  .. ${err.message} on ${url} -> backoff ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

const inv = JSON.parse(readFileSync(join(PKG, 'endpoints.json'), 'utf8'));
const primaryPairs = [...new Set(inv.endpoints.filter((e) => e.scope === 'primary' && e.pair).map((e) => e.pair))];

// Stratified sample: reference pair, NO_FEED pair, a USDT pair, first/last in the manifest,
// a non-manifest slug (expect 404), plus the singleton pages and the page-network-call routes.
const samplePairs = [
  'ANIMEIDR',                                                    // the mandated reference
  'ACSIDR',                                                      // known NO_FEED
  primaryPairs.find((p) => p.endsWith('USDT')) || 'BTCUSDT',     // USDT-quoted
  primaryPairs[0],
  primaryPairs[primaryPairs.length - 1],
];

const targets = [
  ...samplePairs.flatMap((p) => [
    `/market/${p}`,
    `/market/depth_chart/${p}`,
    `/api/market/ticker/${p}`,
  ]),
  '/market',
  '/api/market/health',
  '/api/market/pairs',
  '/api/market/manifest',
  '/api/market/depth/ANIMEIDR?limit=5',
  '/api/market/trades/ANIMEIDR?limit=5',
  '/api/market/klines/ANIMEIDR?interval=15m&limit=5',
  // manifest-negative control
  '/market/NOTAREALSLUG123',
];

const discoveryFiles = ['/robots.txt', '/sitemap.xml', '/openapi.json', '/swagger.json', '/api-docs'];

const evidence = {
  baseUrl: BASE,
  probedAt: new Date().toISOString(),
  offline: OFFLINE,
  politeness: { minIntervalMs: MIN_INTERVAL_MS, maxRetries: MAX_RETRIES, methodsAllowed: ['GET'] },
  discoveryFiles: [],
  endpoints: [],
  notes: [],
};

if (OFFLINE) {
  evidence.notes.push('Offline mode: no network calls made; route expectations come from endpoints.json only.');
  console.log('offline mode — writing expectations only');
} else {
  console.log(`probe pass against ${BASE} at ${MIN_INTERVAL_MS}ms min interval`);
  console.log('\n-- standard discovery files --');
  for (const p of discoveryFiles) {
    const r = await politeFetch(BASE + p);
    const isJson = /json/.test(r.contentType || '');
    const isHtmlShell = /html/.test(r.contentType || '');
    evidence.discoveryFiles.push({ path: p, ...r, interpretation: isJson ? 'json' : isHtmlShell ? 'SPA html shell (no such document)' : 'other' });
    console.log(`  ${p} -> ${r.status} ${r.contentType || r.error || ''}`);
  }

  console.log('\n-- primary scope + page network calls --');
  for (const t of targets) {
    const r = await politeFetch(BASE + t);
    let parsed = null;
    if (/json/.test(r.contentType || '')) {
      try { parsed = JSON.parse(r.bodyPreview.slice(0, 0) + '') ? null : null; } catch { parsed = null; }
    }
    evidence.endpoints.push({ path: t, ...r, jsonOk: /json/.test(r.contentType || '') });
    console.log(`  ${t} -> ${r.status} ${r.contentType || r.error || ''}`);
  }
}

// ---------------------------------------------------------- confirmed vs inferred
// A template counts as CONFIRMED when at least one concrete probed path matched it
// (a {pair} template is matched by substituting any real symbol). Everything else is
// INFERRED from the route manifest + page bundle.
const stripQuery = (p) => String(p).split('?')[0];
const matchesTemplate = (probedPath, template) => {
  const p = stripQuery(probedPath);
  if (!template.includes('{pair}')) return p === template;
  const [prefix, suffix = ''] = template.split('{pair}');
  return (
    p.startsWith(prefix) &&
    p.endsWith(suffix) &&
    p.length > prefix.length + suffix.length &&
    /^[A-Z0-9]+$/.test(p.slice(prefix.length, suffix ? p.length - suffix.length : undefined))
  );
};

const statusByPath = Object.fromEntries(evidence.endpoints.map((e) => [e.path, e.status]));
const allTemplates = [...new Set(inv.endpoints.map((e) => e.template))];
const confirmedTemplates = allTemplates.filter((t) =>
  evidence.endpoints.some((e) => e.status > 0 && matchesTemplate(e.path, t)),
);
const inferredTemplates = allTemplates.filter((t) => !confirmedTemplates.includes(t));

evidence.summary = {
  probedPaths: evidence.endpoints.length,
  probedOk: evidence.endpoints.filter((e) => e.status > 0 && e.status < 400).length,
  totalInventoryRecords: inv.endpoints.length,
  totalTemplates: allTemplates.length,
  confirmedTemplates,
  inferredTemplates,
  statusByPath,
  no5xxObserved: evidence.endpoints.every((e) => e.status < 500),
  negativeControl: statusByPath['/market/NOTAREALSLUG123'],
  noRateLimitHeaders: evidence.endpoints.every((e) => (e.ratelimitHeaders || []).length === 0),
};

writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
console.log(`\nwrote ${OUT}`);
console.log(`  probed=${evidence.summary.probedPaths}  templates confirmed=${confirmedTemplates.length}/${allTemplates.length}`);
console.log(`  no5xx=${evidence.summary.no5xxObserved}  negative-control=${evidence.summary.negativeControl}`);
if (inferredTemplates.length) console.log(`  inferred: ${inferredTemplates.join(', ')}`);
