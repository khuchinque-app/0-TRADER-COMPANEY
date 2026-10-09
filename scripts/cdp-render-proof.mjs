#!/usr/bin/env node
/**
 * scripts/cdp-render-proof.mjs — prove the exchange SPA actually RENDERS, in real Chrome.
 *
 * Why offline: Chrome on this host cannot open any http(s) URL — it hangs indefinitely
 * (verified: `--dump-dom http://127.0.0.1:11110/api/health` times out at 25s while
 * `--dump-dom data:text/html,...` returns in 0.75s; Chrome's network service never
 * connects). So instead of serving the app over HTTP we render the built bundle from a
 * local file with `fetch` and `localStorage` stubbed before the module executes.
 *
 * What this proves that an HTTP smoke test cannot:
 *   - the React app MOUNTS (a render crash such as an undefined component variable
 *     leaves #root empty — invisible to curl)
 *   - SL/TP render as dashed <line> elements with inline <text> labels
 *   - the order-history table carries stop_loss / take_profit columns
 *   - no uncaught exceptions
 *
 * Usage: node scripts/cdp-render-proof.mjs [--repo <path>] [--port 9366]
 * Exit:  0 = all checks passed, 1 = a check failed, 2 = harness error.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REPO = resolve(opt('repo', resolve(HERE, '..')));
const PORT = parseInt(opt('port', '9366'), 10);
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const PAIR = opt('pair', 'BTCIDR');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// ---------------------------------------------------------------- fixtures
// Deterministic candle series so the chart always has a price scale.
const BASE = 1_100_000_000; // ~BTC/IDR
const klines = Array.from({ length: 90 }, (_, i) => {
  const drift = Math.sin(i / 7) * 0.012 + i * 0.0004;
  const open = BASE * (1 + drift);
  const close = BASE * (1 + drift + Math.sin(i / 3) * 0.002);
  const high = Math.max(open, close) * 1.004;
  const low = Math.min(open, close) * 0.996;
  return { time: 1791500000000 + i * 900000, open, high, low, close, volume: 10 + i };
});

const FIXTURES = {
  '/api/brand': { name: 'ChinQue Exchange', logoText: 'ChinQue', logoAccent: 'Exchange', tagline: 'Simulasi', simulasi: true },
  [`/api/market/ticker/${PAIR}`]: {
    slug: PAIR, base: 'BTC', quote: 'IDR', inMarket: true, inDepth: true, inChart: true,
    mexcSymbol: 'BTCUSDT', state: 'LIVE', tradable: true,
    lastPrice: klines[klines.length - 1].close, indicative: true, priceChangePercent: 1.23,
    highPrice: BASE * 1.02, lowPrice: BASE * 0.98, quoteVolume: 9.9e12, stale: false, simulasi: true,
  },
  [`/api/market/klines/${PAIR}`]: { slug: PAIR, state: 'LIVE', interval: '15m', klines, simulasi: true },
  [`/api/market/depth/${PAIR}`]: {
    slug: PAIR, state: 'LIVE', simulasi: true,
    bids: Array.from({ length: 15 }, (_, i) => [BASE - i * 1000, 0.5 + i * 0.1]),
    asks: Array.from({ length: 15 }, (_, i) => [BASE + i * 1000, 0.5 + i * 0.1]),
  },
  [`/api/market/trades/${PAIR}`]: {
    slug: PAIR, state: 'LIVE', count: 5, simulasi: true,
    trades: Array.from({ length: 5 }, (_, i) => ({ id: i, time: Date.now() - i * 1000, price: BASE + i, qty: 1 + i, side: i % 2 ? 'buy' : 'sell' })),
  },
  [`/api/market/myorders/${PAIR}`]: {
    open: [{
      id: 'lmt_demo_1', pair: 'BTCUSDT', side: 'buy', type: 'limit', price: BASE * 0.97, quantity: 0.01,
      filled_quantity: 0, status: 'open', stop_loss: 1_050_000_000, take_profit: 1_200_000_000,
    }],
    history: [{
      id: 'ord_demo_1', pair: 'BTCUSDT', side: 'sell', type: 'market', price: BASE * 0.99, quantity: 0.02,
      filled_quantity: 0.02, status: 'filled', stop_loss: 1_040_000_000, take_profit: 1_220_000_000,
    }],
    fills: [], simulasi: true,
  },
};

// ---------------------------------------------------------------- harness html
const distDir = join(REPO, 'apps', 'exchange', 'dist');
if (!existsSync(distDir)) { console.error(`harness error: no build at ${distDir}`); process.exit(2); }
const assets = readdirSync(join(distDir, 'assets')).filter((f) => f.endsWith('.js'));
if (!assets.length) { console.error('harness error: no built JS bundle'); process.exit(2); }
const bundle = readFileSync(join(distDir, 'assets', assets[0]), 'utf8');

const harness = `<!doctype html>
<html lang="id" data-theme="dark"><head><meta charset="utf-8"/>
<script>
// --- localStorage stub (Chrome blocks storage on file:// origins) ---
var __STORE = {};
try {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(__STORE, k) ? __STORE[k] : null; },
      setItem: function (k, v) { __STORE[k] = String(v); },
      removeItem: function (k) { delete __STORE[k]; },
      clear: function () { __STORE = {}; },
    },
  });
} catch (e) { window.__LS_ERR = String(e); }

// --- the SPA reads its route from window.__EXCHANGE_STATE__ ---
window.__EXCHANGE_STATE__ = ${JSON.stringify(JSON.stringify({ state: 'pair', path: `/market/${PAIR}`, slug: PAIR }))};

// --- offline fetch stub: canned fixtures for exactly the routes the page calls ---
window.__FETCH_LOG = [];
var FIX = ${JSON.stringify(FIXTURES)};
window.fetch = function (url, opts) {
  var key = String(url).split('?')[0];
  window.__FETCH_LOG.push(key);
  var body = FIX[key];
  var ok = body !== undefined;
  return Promise.resolve({
    ok: ok,
    status: ok ? 200 : 404,
    headers: { get: function () { return 'application/json'; } },
    json: function () { return Promise.resolve(body === undefined ? { error: 'not_found' } : body); },
    text: function () { return Promise.resolve(JSON.stringify(body === undefined ? {} : body)); },
  });
};
</script>
<style>
  :root, [data-theme="dark"] { --up:#00FF88; --down:#FF3366; --bg:#0B0F2B; --panel:#101533; --panel2:#151B3D; --line:#232A55; --text:#EAF0FF; --muted:#8A93C7; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Inter,system-ui,sans-serif}
  .banner{background:#7a2e2e;color:#fff;text-align:center;padding:6px;font-weight:600}
  table{border-collapse:collapse;width:100%} th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;margin-bottom:12px}
  .field{display:flex;gap:8px;align-items:center;background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:0 10px;margin-bottom:8px}
  .field input{flex:1;background:transparent;border:none;color:var(--text);padding:9px 0;outline:none}
  .up{color:var(--up)} .down{color:var(--down)} .muted{color:var(--muted)}
  .row{display:flex;gap:8px} .form{padding:12px}
</style>
</head>
<body><div class="banner">SIMULASI</div><div id="root"></div>
<script type="module">${bundle}</script>
</body></html>`;

const profile = mkdtempSync(join(tmpdir(), 'cdp-proof-'));
const htmlPath = join(profile, 'harness.html');
writeFileSync(htmlPath, harness);

const chrome = spawn(
  CHROME,
  [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `file://${htmlPath}`,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let stderr = '';
chrome.stderr.on('data', (b) => { stderr += b.toString(); });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} });

// ---------------------------------------------------------------- CDP attach
let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
if (!wsUrl) { console.error('harness error: no page target'); console.error(stderr.slice(-500)); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const pageErrors = [];
const consoleErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    pageErrors.push(d.exception?.description || d.text || 'exception');
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
};
const send = (method, params = {}, t = 20000) =>
  new Promise((res, rej) => {
    const id = ++msgId; pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) rej(new Error(`${method} timed out`)); }, t);
  });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send('Runtime.enable');

// wait for React to mount
let mounted = false;
for (let i = 0; i < 60; i++) {
  try {
    mounted = await evaluate("!!document.querySelector('#root') && document.querySelector('#root').children.length > 0");
    if (mounted) break;
  } catch {}
  await sleep(250);
}
await sleep(900);

// ===== 1) the app mounted (catches render crashes an HTTP check cannot see) =====
const shell = await evaluate(`(() => ({
  rootKids: document.querySelector('#root')?.children.length ?? 0,
  hasSvg: !!document.querySelector('svg'),
  hasOrderForm: !!document.querySelector('form.form'),
  lsErr: window.__LS_ERR || null,
  fetched: (window.__FETCH_LOG || []).slice(0, 8),
  text: (document.querySelector('#root')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 90),
}))()`);
check('React app mounts and paints into #root', shell.rootKids > 0, JSON.stringify(shell.text).slice(0, 80));
check('order form rendered (no render crash)', shell.hasOrderForm === true, `rootKids=${shell.rootKids}`);
check('candle chart <svg> rendered', shell.hasSvg === true);

// ===== 2) SL/TP inputs exist =====
const inputs = await evaluate(`(() => {
  const byPh = (p) => [...document.querySelectorAll('input')].find((i) => i.placeholder === p);
  return { sl: !!byPh('Trigger price'), tp: !!byPh('Target price') };
})()`);
check('Stop Loss + Take Profit inputs present', inputs.sl && inputs.tp, JSON.stringify(inputs));

// ===== 3) dashed SL/TP price lines with labels appear on the chart =====
const chart = await evaluate(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const byPh = (p) => [...document.querySelectorAll('input')].find((i) => i.placeholder === p);
  const slEl = byPh('Trigger price'), tpEl = byPh('Target price');
  if (!slEl || !tpEl) return { ok: false, why: 'inputs not found' };
  for (let i = 0; i < 40 && !document.querySelector('svg rect'); i++) await wait(200);

  const sl = ${Math.round(BASE * 0.98)};
  const tp = ${Math.round(BASE * 1.02)};
  setNative(slEl, String(sl));
  setNative(tpEl, String(tp));
  await wait(700);

  const describe = (sel) => {
    const g = document.querySelector(sel);
    if (!g) return null;
    const line = g.querySelector('line'), text = g.querySelector('text');
    return { dash: line && line.getAttribute('stroke-dasharray'), y1: line && line.getAttribute('y1'), label: text && text.textContent };
  };
  return {
    ok: true, sl, tp,
    candles: document.querySelectorAll('svg rect').length,
    stopLoss: describe('g.price-line.stop-loss'),
    takeProfit: describe('g.price-line.take-profit'),
  };
})()`);

const sl = chart.stopLoss, tp = chart.takeProfit;
check('candles rendered in the chart', (chart.candles || 0) > 10, `${chart.candles} candle rects`);
check('Stop Loss renders as a dashed horizontal line', !!(sl && sl.dash), `dash=${sl?.dash} y=${sl?.y1}`);
check('Take Profit renders as a dashed horizontal line', !!(tp && tp.dash), `dash=${tp?.dash} y=${tp?.y1}`);
check('Stop Loss line has an inline label', /stop loss/i.test(sl?.label || ''), sl?.label);
check('Take Profit line has an inline label', /take profit/i.test(tp?.label || ''), tp?.label);
check('SL and TP are drawn at different y positions', !!sl && !!tp && sl.y1 !== tp.y1, `${sl?.y1} vs ${tp?.y1}`);

// ===== 4) order-history table exposes stop_loss / take_profit columns =====
// Header spelling differs per screen: the pair-page panel labels them
// "Stop Loss"/"Take Profit" while /akun/order uses stop_loss/take_profit, so match either.
const SL_LABEL = /stop[\s_]?loss/i;
const TP_LABEL = /take[\s_]?profit/i;
const hist = await evaluate(`(() => {
  const slRe = /stop[\\s_]?loss/i, tpRe = /take[\\s_]?profit/i;
  const tables = [...document.querySelectorAll('table')];
  const headers = [...document.querySelectorAll('th')].map((t) => (t.textContent || '').trim());
  const cells = [...document.querySelectorAll('td')].map((c) => (c.textContent || '').trim());
  const fmt = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  return {
    tables: tables.length,
    slTables: tables.filter((t) => slRe.test(t.textContent || '')).length,
    tpTables: tables.filter((t) => tpRe.test(t.textContent || '')).length,
    headers,
    hasSlHeader: headers.some((h) => slRe.test(h)),
    hasTpHeader: headers.some((h) => tpRe.test(h)),
    slValueVisible: cells.includes(fmt(${1_050_000_000})),
    tpValueVisible: cells.includes(fmt(${1_200_000_000})),
    triggerCells: cells.filter((c) => slRe.test(c) || tpRe.test(c)).slice(0, 6),
  };
})()`);
check('order tables rendered', hist.tables >= 1, `${hist.tables} tables`);
check('a table shows a stop_loss column header', hist.slTables >= 1 && hist.hasSlHeader, `headers: ${hist.headers.join('|')}`);
check('a table shows a take_profit column header', hist.tpTables >= 1 && hist.hasTpHeader, `headers: ${hist.headers.join('|')}`);
check('stop_loss column is populated with the stored trigger', hist.slValueVisible, `cells: ${hist.triggerCells.join(',')}`);
check('take_profit column is populated with the stored trigger', hist.tpValueVisible, `cells: ${hist.triggerCells.join(',')}`);

// ===== 5) no JS errors (the real regression guard) =====
const realConsole = consoleErrors.filter((e) => e && !/favicon/i.test(e));
check('no uncaught page exceptions', pageErrors.length === 0, pageErrors.slice(0, 1).join(' | ').slice(0, 200));
check('no console errors', realConsole.length === 0, realConsole.slice(0, 1).join(' | ').slice(0, 200));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} render checks passed`);
console.log(`bundle=dist/assets/${assets[0]}  route=/market/${PAIR}  (offline harness: fetch+localStorage stubbed)`);
try { ws.close(); } catch {}
process.exit(failed.length ? 1 : 0);
