// apps/exchange/server.mjs — serves the exchange SPA on :22221 with 1:1 indodax.com path mirroring.
// Rules honored here:
//  - robots.txt -> Disallow: /  (never index a simulation mirror)
//  - every page: <meta name="robots" content="noindex,nofollow"> + non-dismissible SIMULASI banner
//  - slug NOT in manifest -> real 404; manifest pair with no MEXC feed -> 200 SPA (NO_FEED render)
//  - server-side calls to backend :11110 only; the browser never talks to MEXC.
import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHollaexAdapter } from './lib/hollaex-adapter.mjs';
import { createMarketClient } from './lib/market-client.mjs';
import { buildPairIndex } from './lib/pair-resolver.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));   // .../apps/exchange
const ROOT = HERE;                                          // app dir
const PROJ = path.resolve(ROOT, '..', '..');                // repo root
const DIST = path.join(ROOT, 'dist');
const PORT = parseInt(process.env.PORT_EXCHANGE || '22221');
const BACKEND = process.env.API_INTERNAL_URL || 'http://localhost:11110';
const COOKIE_NAME = process.env.EXCHANGE_COOKIE_NAME || 'sx_exchange_session';

// manifest for slug validation
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(path.join(PROJ, 'packages', 'indodax-routes', 'routes.json'), 'utf8'));
} catch {}

const pairSlugs = new Set((manifest?.pairs || []).map((p) => p.slug));
const staticRoutes = new Set((manifest?.static || []).filter(Boolean));

// Server-rendered SIMULASI strip (also client-rendered by the SPA; identical look).
// Spec hard rule: persistent banner present in the raw HTML of EVERY page.
const SERVER_BANNER_HTML = `<div class="banner">SIMULASI &mdash; dana virtual, bukan Indodax, bukan bursa sungguhan &middot; <small>SIMULATION &mdash; virtual funds, not Indodax, not a real exchange &middot; ChinQue Exchange</small></div>`;

const app = express();
app.disable('x-powered-by');

// robots: simulation site must never be crawled
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /\n');
});

// ---------------------------------------------------------------------------
// HollaEx Kit adapter routes (server-side only).
// The browser calls THESE; these call HollaEx /v2/public/*. HollaEx credentials
// never leave this process (see lib/hollaex-adapter.mjs).
//   GET /api/hx/market/list                     -> pair list
//   GET /api/hx/market/:pair                    -> ticker   (404 unknown | 200 NO_FEED)
//   GET /api/hx/market/:pair/orderbook          -> orderbook
//   GET /api/hx/market/:pair/trades             -> trades
//   GET /api/hx/health                          -> adapter reachability
// ---------------------------------------------------------------------------
const hxAdapter = createHollaexAdapter();
const hxClient = createMarketClient({
  adapter: hxAdapter,
  index: buildPairIndex({ slugs: [...pairSlugs] }),
});

app.get('/api/hx/market/list', (_req, res) => {
  const { status, body } = hxClient.list();
  res.status(status).json(body);
});

app.get('/api/hx/market/:pair/orderbook', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const { status, body } = await hxClient.orderbook(req.params.pair, limit);
  res.status(status).json(body);
});

app.get('/api/hx/market/:pair/trades', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const { status, body } = await hxClient.trades(req.params.pair, limit);
  res.status(status).json(body);
});

app.get('/api/hx/market/:pair', async (req, res) => {
  const { status, body } = await hxClient.ticker(req.params.pair);
  res.status(status).json(body);
});

// Adapter health: reports whether the HollaEx bulk ticker endpoint is reachable.
app.get('/api/hx/health', async (_req, res) => {
  const r = await hxAdapter.get('ticker');
  res.status(200).json({
    ok: !r.noFeed,
    stale: r.stale,
    source: r.source,
    pairs: [...pairSlugs].length,
    upstream: hxAdapter.config.apiURL,
    simulasi: true,
  });
});

// small proxy for frontend-only needs (keeps browser -> exchange -> backend 11110)
app.use('/api', async (req, res) => {
  try {
    const r = await fetch(`${BACKEND}/api${req.url}`, {
      method: req.method,
      headers: {
        accept: 'application/json',
        // forward auth + content-type so POST /api/market/orders (JWT) works through the proxy
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...(req.method !== 'GET' && req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
      },
      ...(req.method !== 'GET' ? { body: await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      }) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    res.status(r.status).type(r.headers.get('content-type') || 'application/json');
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'backend_unreachable', message: String(e.message), simulasi: true });
  }
});

// state helper for a given path
function routeState(p) {
  // /trade/{COIN} — full MEXC universe trading page (any listed coin)
  let m = p.match(/^\/trade\/([A-Za-z0-9]+)$/);
  if (m) return { code: 200, state: 'trade', slug: m[1].toUpperCase() };
  // static manifest routes
  if (staticRoutes.has(p)) return { code: 200, state: 'live' };
  // market pair routes
  m = p.match(/^\/market\/([A-Z0-9]+)$/);
  if (m) {
    if (!pairSlugs.has(m[1])) return { code: 404, state: 'not-found' };
    return { code: 200, state: 'pair', slug: m[1] };
  }
  m = p.match(/^\/market\/depth_chart\/([A-Z0-9]+)$/);
  if (m) {
    if (!pairSlugs.has(m[1])) return { code: 404, state: 'not-found' };
    return { code: 200, state: 'depth', slug: m[1] };
  }
  m = p.match(/^\/chart\/([A-Z0-9]+)$/);
  if (m) {
    if (!pairSlugs.has(m[1])) return { code: 404, state: 'not-found' };
    return { code: 200, state: 'chart', slug: m[1] };
  }
  // SPA app routes (neutral account paths + help) -> 200 always
  return { code: 200, state: 'app' };
}

// vite build output — MUST be served before the SPA catch-all, with real MIME
// types; otherwise the browser gets html for the module script and never mounts
// the React app (symptom: only the server banner is visible).
app.use(express.static(DIST, { index: false, maxAge: '1h' }));

// serve SPA with correct status codes. The SIMULASI banner is INSERTED BEFORE the
// React mount point — never replace <div id="root"> (devtool.md finding: missing
// mounting point => SPA renders nothing).
app.get('*', (req, res) => {
  const p = req.path;
  const { code, state, slug } = routeState(p);
  const indexPath = path.join(DIST, 'index.html');
  if (code === 404) {
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf8')
        .replace('__STATE__', JSON.stringify({ state: 'not-found', path: p }))
        .replace('<div id="root"></div>', SERVER_BANNER_HTML + '<div id="root"></div>');
      return res.status(404).type('html').send(html);
    }
    return res.status(404).type('html').send('<h1>404</h1><a href="/">Beranda</a>');
  }
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8')
      .replace('__STATE__', JSON.stringify({ state, path: p, slug: slug || null }))
      .replace('<div id="root"></div>', SERVER_BANNER_HTML + '<div id="root"></div>');
    return res.status(code).type('html').send(html);
  }
  res.status(503).send('exchange: build missing (run: npm run build -w apps/exchange)');
});

app.listen(PORT, () => {
  console.log(`[exchange] listening on :${PORT} | backend ${BACKEND} | cookie ${COOKIE_NAME} | pairs ${pairSlugs.size}`);
});
