#!/usr/bin/env node
/**
 * scripts/cdp-render-proof.mjs — prove the exchange SPA actually RENDERS, in real Chrome.
 *
 * Why offline: Chrome on this host cannot open any http(s) URL — it hangs indefinitely
 * (verified: `--dump-dom http://127.0.0.1:11110/api/health` times out at 25s while
 * `--dump-dom data:text/html,...` returns in 0.75s). So instead of serving the app over
 * HTTP we render the built bundle from a local file with `fetch` and `localStorage`
 * stubbed before the module executes.
 *
 * What this proves that an HTTP smoke test cannot:
 *   - the React app MOUNTS per route (a render crash — e.g. an undeclared variable —
 *     leaves #root empty, which curl cannot see)
 *   - SL/TP render as dashed <line> elements with inline <text> labels
 *   - order tables carry stop_loss / take_profit columns
 *   - the member register / login and the password-gated admin console render their forms
 *   - no uncaught exceptions on any of them
 *
 * Usage: node scripts/cdp-render-proof.mjs [--repo <path>] [--pair BTCIDR] [--port 9366]
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
const BASE_PORT = parseInt(opt('port', '9366'), 10);
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const PAIR = opt('pair', 'BTCIDR');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// ---------------------------------------------------------------- fixtures
const BASE = 1_100_000_000; // ~BTC/IDR
const klines = Array.from({ length: 90 }, (_, i) => {
  const drift = Math.sin(i / 7) * 0.012 + i * 0.0004;
  const open = BASE * (1 + drift);
  const close = BASE * (1 + drift + Math.sin(i / 3) * 0.002);
  return { time: 1791500000000 + i * 900000, open, high: Math.max(open, close) * 1.004, low: Math.min(open, close) * 0.996, close, volume: 10 + i };
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
    open: [{ id: 'lmt_demo_1', pair: 'BTCUSDT', side: 'buy', type: 'limit', price: BASE * 0.97, quantity: 0.01, filled_quantity: 0, status: 'open', stop_loss: 1_050_000_000, take_profit: 1_200_000_000 }],
    history: [{ id: 'ord_demo_1', pair: 'BTCUSDT', side: 'sell', type: 'market', price: BASE * 0.99, quantity: 0.02, filled_quantity: 0.02, status: 'filled', stop_loss: 1_040_000_000, take_profit: 1_220_000_000 }],
    fills: [], simulasi: true,
  },
};

const distDir = join(REPO, 'apps', 'exchange', 'dist');
if (!existsSync(distDir)) { console.error(`harness error: no build at ${distDir}`); process.exit(2); }
const assets = readdirSync(join(distDir, 'assets')).filter((f) => f.endsWith('.js'));
if (!assets.length) { console.error('harness error: no built JS bundle'); process.exit(2); }
const bundle = readFileSync(join(distDir, 'assets', assets[0]), 'utf8');

const profile = mkdtempSync(join(tmpdir(), 'cdp-proof-'));
process.on('exit', () => { try { rmSync(profile, { recursive: true, force: true }); } catch {} });

function harnessHtml(route) {
  const state = JSON.stringify({ state: 'app', path: route, slug: route.startsWith('/market/') ? route.split('/')[2] : null });
  return `<!doctype html>
<html lang="id" data-theme="dark"><head><meta charset="utf-8"/>
<script>
var __STORE = {};
try {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(__STORE, k) ? __STORE[k] : null; },
    setItem: function (k, v) { __STORE[k] = String(v); },
    removeItem: function (k) { delete __STORE[k]; },
    clear: function () { __STORE = {}; }
  } });
} catch (e) { window.__LS_ERR = String(e); }
window.__EXCHANGE_STATE__ = ${JSON.stringify(state)};
window.__FETCH_LOG = [];
var FIX = ${JSON.stringify(FIXTURES)};
window.fetch = function (url) {
  var key = String(url).split('?')[0];
  window.__FETCH_LOG.push(key);
  var body = FIX[key];
  var ok = body !== undefined;
  return Promise.resolve({
    ok: ok, status: ok ? 200 : 404,
    headers: { get: function () { return 'application/json'; } },
    json: function () { return Promise.resolve(ok ? body : { error: 'not_found' }); },
    text: function () { return Promise.resolve(JSON.stringify(ok ? body : {})); },
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
  .row{display:flex;gap:8px} .form{padding:12px} .btn{padding:8px 14px}
</style>
</head>
<body><div class="banner">SIMULASI</div><div id="root"></div>
<script type="module">${bundle}</script>
</body></html>`;
}

/** Launch Chrome on a file:// harness for `route`, attach over CDP, wait for React to paint. */
async function openHarness(route, port) {
  const htmlPath = join(profile, `harness-${port}.html`);
  writeFileSync(htmlPath, harnessHtml(route));
  const chrome = spawn(
    CHROME,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
     '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
     `--remote-debugging-port=${port}`, `--user-data-dir=${join(profile, `ud-${port}`)}`, `file://${htmlPath}`],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  chrome.stderr.on('data', (b) => { stderr += b.toString(); });

  let wsUrl = null;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(250);
  }
  if (!wsUrl) { console.error('harness error: no page target for ' + route); console.error(stderr.slice(-400)); process.exit(2); }

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
  for (let i = 0; i < 60; i++) {
    try { if (await evaluate("!!document.querySelector('#root') && document.querySelector('#root').children.length > 0")) break; } catch {}
    await sleep(250);
  }
  await sleep(700);

  return {
    evaluate, pageErrors, consoleErrors,
    close: async () => { try { ws.close(); } catch {} chrome.kill('SIGKILL'); await sleep(600); },
  };
}

// ============ phase 1: pair page — chart, SL/TP lines, order columns ============
console.log(`\n=== phase 1: /market/${PAIR} ===`);
const p1 = await openHarness(`/market/${PAIR}`, BASE_PORT);

const shell = await p1.evaluate(`(() => ({
  rootKids: document.querySelector('#root')?.children.length ?? 0,
  hasSvg: !!document.querySelector('svg'),
  hasOrderForm: !!document.querySelector('form.form'),
  text: (document.querySelector('#root')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 80),
}))()`);
check('React app mounts and paints into #root', shell.rootKids > 0, JSON.stringify(shell.text).slice(0, 70));
check('order form rendered (no render crash)', shell.hasOrderForm === true, `rootKids=${shell.rootKids}`);
check('candle chart <svg> rendered', shell.hasSvg === true);

const chart = await p1.evaluate(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, v) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const byPh = (p) => [...document.querySelectorAll('input')].find((i) => i.placeholder === p);
  const slEl = byPh('Trigger price'), tpEl = byPh('Target price');
  if (!slEl || !tpEl) return { ok: false, why: 'inputs not found' };
  for (let i = 0; i < 40 && !document.querySelector('svg rect'); i++) await wait(200);
  setNative(slEl, String(${Math.round(BASE * 0.98)}));
  setNative(tpEl, String(${Math.round(BASE * 1.02)}));
  await wait(700);
  const d = (sel) => { const g = document.querySelector(sel); if (!g) return null;
    const l = g.querySelector('line'), tx = g.querySelector('text');
    return { dash: l && l.getAttribute('stroke-dasharray'), y1: l && l.getAttribute('y1'), label: tx && tx.textContent }; };
  return { ok: true, candles: document.querySelectorAll('svg rect').length, stopLoss: d('g.price-line.stop-loss'), takeProfit: d('g.price-line.take-profit') };
})()`);
const sl = chart.stopLoss, tp = chart.takeProfit;
check('candles rendered in the chart', (chart.candles || 0) > 10, `${chart.candles} candle rects`);
check('Stop Loss renders as a dashed horizontal line', !!(sl && sl.dash), `dash=${sl?.dash} y=${sl?.y1}`);
check('Take Profit renders as a dashed horizontal line', !!(tp && tp.dash), `dash=${tp?.dash} y=${tp?.y1}`);
check('Stop Loss line has an inline label', /stop loss/i.test(sl?.label || ''), sl?.label);
check('Take Profit line has an inline label', /take profit/i.test(tp?.label || ''), tp?.label);

const hist = await p1.evaluate(`(() => {
  const slRe = /stop[\\s_]?loss/i, tpRe = /take[\\s_]?profit/i;
  const headers = [...document.querySelectorAll('th')].map((t) => (t.textContent || '').trim());
  const cells = [...document.querySelectorAll('td')].map((c) => (c.textContent || '').trim());
  const fmt = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  return { hasSlHeader: headers.some((h) => slRe.test(h)), hasTpHeader: headers.some((h) => tpRe.test(h)),
    slValueVisible: cells.includes(fmt(${1_050_000_000})), tpValueVisible: cells.includes(fmt(${1_200_000_000})) };
})()`);
check('order table shows a stop_loss column header', hist.hasSlHeader);
check('order table shows a take_profit column header', hist.hasTpHeader);
check('stop_loss column is populated with the stored trigger', hist.slValueVisible);
check('take_profit column is populated with the stored trigger', hist.tpValueVisible);
check('no uncaught exceptions on the pair page', p1.pageErrors.length === 0, p1.pageErrors.slice(0, 1).join(' | ').slice(0, 160));
await p1.close();

// ============ phase 2: member registration ============
console.log(`\n=== phase 2: /akun/daftar ===`);
const p2 = await openHarness('/akun/daftar', BASE_PORT + 1);
const reg = await p2.evaluate(`(() => {
  const text = (document.querySelector('#root')?.innerText || '');
  const ph = [...document.querySelectorAll('input')].map((i) => i.placeholder || '');
  return { text: text.replace(/\\s+/g, ' ').slice(0, 120), inputs: ph,
    passwordInputs: document.querySelectorAll('input[type=password]').length,
    hasNama: ph.includes('Nama tampilan'), hasEmail: ph.includes('nama@email.com'),
    hasSubmit: /daftar/i.test(text) };
})()`);
check('register page mounts', reg.inputs.length >= 4, `${reg.inputs.length} inputs`);
check('register form has name / email fields', reg.hasNama && reg.hasEmail, reg.inputs.join(' | ').slice(0, 90));
check('register form masks both password fields', reg.passwordInputs >= 2, `${reg.passwordInputs} password inputs`);
check('register page offers a submit action', reg.hasSubmit, JSON.stringify(reg.text).slice(0, 80));
check('no uncaught exceptions on register', p2.pageErrors.length === 0, p2.pageErrors.slice(0, 1).join(' | ').slice(0, 140));
await p2.close();

// ============ phase 3: member login ============
console.log(`\n=== phase 3: /akun/masuk ===`);
const p3 = await openHarness('/akun/masuk', BASE_PORT + 2);
const login = await p3.evaluate(`(() => {
  const text = document.querySelector('#root')?.innerText || '';
  return { text: text.replace(/\\s+/g, ' ').slice(0, 140),
    hasEmail: !!document.querySelector('input[placeholder="nama@email.com"]'),
    passwordInputs: document.querySelectorAll('input[type=password]').length,
    linksToRegister: !!document.querySelector('a[href="/akun/daftar"]'),
    hasGuest: /guest/i.test(text) };
})()`);
check('login page mounts with an email field', login.hasEmail);
check('login form masks the password', login.passwordInputs >= 1, `${login.passwordInputs}`);
check('login page links to registration', login.linksToRegister);
check('login page still offers Guest Demo', login.hasGuest);
check('no uncaught exceptions on login', p3.pageErrors.length === 0, p3.pageErrors.slice(0, 1).join(' | ').slice(0, 140));
await p3.close();

// ============ phase 4: admin console (password gate) ============
console.log(`\n=== phase 4: /admin ===`);
const p4 = await openHarness('/admin', BASE_PORT + 3);
const adm = await p4.evaluate(`(() => {
  const text = (document.querySelector('#root')?.innerText || '').replace(/\\s+/g, ' ');
  return { text: text.slice(0, 140),
    title: /admin console/i.test(text),
    passwordField: document.querySelectorAll('input[type=password]').length,
    submit: /masuk sebagai admin/i.test(text),
    leakedConsole: /members\\b.*dashboard|whitelabel & brand/i.test(text) && !/password admin/i.test(text) };
})()`);
check('admin console gate renders', adm.title, JSON.stringify(adm.text).slice(0, 80));
check('admin gate asks for a password', adm.passwordField >= 1, `${adm.passwordField} password input(s)`);
check('admin gate exposes a sign-in action', adm.submit);
check('admin console content is NOT shown before auth', adm.leakedConsole === false);
check('no uncaught exceptions on admin', p4.pageErrors.length === 0, p4.pageErrors.slice(0, 1).join(' | ').slice(0, 140));
await p4.close();

// ---------- report ----------
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} render checks passed`);
console.log(`bundle=dist/assets/${assets[0]}  routes: /market/${PAIR}, /akun/daftar, /akun/masuk, /admin`);
console.log('(offline harness: fetch + localStorage stubbed; Chrome cannot reach http here)');
process.exit(failed.length ? 1 : 0);
