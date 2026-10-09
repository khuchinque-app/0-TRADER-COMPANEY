// scripts/cdp-verify.mjs — headless CDP acceptance check for the exchange SPA.
//
// Why this exists: HTTP smoke tests only prove routes return bytes. They cannot catch a
// React render crash (task.md acceptance criterion: "CDP-render successfully renders SL/TP
// visible"). This drives real Chrome over the DevTools Protocol and asserts on the live DOM.
// Zero npm dependencies — Chrome is launched as a child process and we speak CDP over
// Node's built-in WebSocket.
//
// NOTE: Chrome 154 in this environment never replies to Page.navigate (it only emits
// frameStartedNavigating/Loading), so this harness launches Chrome directly on the target
// URL instead of navigating. Verified empirically, see ops/evidence/.
//
// Usage:  node scripts/cdp-verify.mjs [--base http://localhost:22221] [--pair BTCIDR]
// Exit:   0 = all checks passed, 1 = a check failed, 2 = harness error.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const BASE = arg('base', 'http://localhost:22221');
const PAIR = arg('pair', 'BTCIDR');
const BASE_PORT = parseInt(arg('port', '9333'), 10);
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const profile = mkdtempSync(join(tmpdir(), 'cdp-verify-'));
const cleanup = () => { try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

// ---------- open one page in a fresh Chrome, attached over CDP ----------
// Returns { evaluate, pageErrors, consoleErrors, close }.
async function openPage(url, port) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, url,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  chrome.stderr.on('data', (b) => { stderr += b.toString(); });

  // wait for the target for our URL to appear
  let wsUrl = null;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl && (t.url || '').startsWith('http'));
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(250);
  }
  if (!wsUrl) {
    console.error('harness error: no debuggable page target');
    console.error(stderr.slice(-600));
    process.exit(2);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const pageErrors = [];
  const consoleErrors = [];

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
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
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      const e = m.params.entry;
      consoleErrors.push(`[${e.source}] ${e.text}${e.url ? ' ' + e.url : ''}`);
    }
  };

  const send = (method, params = {}, timeoutMs = 15000) =>
    new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (pending.delete(id)) rej(new Error(`${method} timed out`)); }, timeoutMs);
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  // wait for React to paint into #root
  for (let i = 0; i < 60; i++) {
    try {
      const painted = await evaluate("!!document.querySelector('#root') && document.querySelector('#root').children.length > 0");
      if (painted) break;
    } catch {}
    await sleep(250);
  }
  await sleep(1000); // let the first data fetch land

  return {
    evaluate,
    pageErrors,
    consoleErrors,
    close: async () => {
      try { ws.close(); } catch {}
      chrome.kill('SIGKILL');
      await sleep(700); // release the profile lock before the next launch
    },
  };
}

// ============ phase 1: pair page (chart + order form) ============
console.log(`\n=== phase 1: ${BASE}/market/${PAIR} ===`);
const p1 = await openPage(`${BASE}/market/${PAIR}`, BASE_PORT);

const shell = await p1.evaluate(`(() => ({
  banner: !!document.querySelector('.banner'),
  rootKids: document.querySelector('#root')?.children.length ?? 0,
  hasOrderForm: !!document.querySelector('form.form'),
  hasSvg: !!document.querySelector('svg'),
  text: (document.querySelector('#root')?.innerText || '').slice(0, 70),
}))()`);
check('pair page mounts React (not a blank/error screen)', shell.rootKids > 0 && shell.hasOrderForm, JSON.stringify(shell).slice(0, 150));
check('simulation banner present', shell.banner === true);

const inputs = await p1.evaluate(`(() => {
  const byPh = (p) => [...document.querySelectorAll('input')].find((i) => i.placeholder === p);
  return { sl: !!byPh('Trigger price'), tp: !!byPh('Target price') };
})()`);
check('order form exposes Stop Loss + Take Profit inputs', inputs.sl && inputs.tp, JSON.stringify(inputs));

// Set SL/TP relative to the live last price, then assert the SVG gained dashed price lines.
const chart = await p1.evaluate(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const byPh = (p) => [...document.querySelectorAll('input')].find((i) => i.placeholder === p);
  const slEl = byPh('Trigger price'), tpEl = byPh('Target price');
  if (!slEl || !tpEl) return { ok: false, why: 'inputs not found' };

  for (let i = 0; i < 60 && !document.querySelector('svg rect'); i++) await wait(250);

  const live = await fetch('/api/market/ticker/${PAIR}').then((r) => r.json()).then((d) => d.lastPrice).catch(() => null);
  const sl = live ? Math.round(live * 0.98) : 900;
  const tp = live ? Math.round(live * 1.02) : 1200;
  setNative(slEl, String(sl));
  setNative(tpEl, String(tp));
  await wait(800);

  const describe = (sel) => {
    const g = document.querySelector(sel);
    if (!g) return null;
    const line = g.querySelector('line'), text = g.querySelector('text');
    return {
      dash: line && line.getAttribute('stroke-dasharray'),
      stroke: line && line.getAttribute('stroke'),
      y1: line && line.getAttribute('y1'),
      label: text && text.textContent,
    };
  };
  return {
    ok: true, live, sl, tp, inputsEcho: { sl: slEl.value, tp: tpEl.value },
    stopLoss: describe('g.price-line.stop-loss'),
    takeProfit: describe('g.price-line.take-profit'),
  };
})()`);

const slLine = chart.stopLoss, tpLine = chart.takeProfit;
check('Stop Loss line drawn as a dashed horizontal rule', chart.ok && slLine && !!slLine.dash, chart.ok ? `dash=${slLine?.dash} y=${slLine?.y1}` : chart.why);
check('Take Profit line drawn as a dashed horizontal rule', chart.ok && tpLine && !!tpLine.dash, chart.ok ? `dash=${tpLine?.dash} y=${tpLine?.y1}` : chart.why);
check('Stop Loss line carries an inline label', /stop loss/i.test(slLine?.label || ''), slLine?.label);
check('Take Profit line carries an inline label', /take profit/i.test(tpLine?.label || ''), tpLine?.label);
check('SL and TP render at distinct prices (different y)', !!slLine && !!tpLine && slLine.y1 !== tpLine.y1, `${slLine?.y1} vs ${tpLine?.y1}`);

// stash a guest JWT for phase 2 (same profile => localStorage survives)
const auth = await p1.evaluate(`(async () => {
  const g = await fetch('/api/auth/guest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    .then((r) => r.json()).catch(() => null);
  if (g && g.token) { localStorage.setItem('sx_jwt', g.token); return { ok: true }; }
  return { ok: false };
})()`);
check('guest session obtainable through the SPA proxy', auth.ok);

check('no uncaught page exceptions on the pair page', p1.pageErrors.length === 0, p1.pageErrors.slice(0, 1).join(' | ').slice(0, 160));
await p1.close();

// ============ phase 2: order history columns ============
console.log(`\n=== phase 2: ${BASE}/akun/order ===`);
const p2 = await openPage(`${BASE}/akun/order`, BASE_PORT + 1);

const hist = await p2.evaluate(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const box = document.querySelector('input[placeholder="BTCIDR"]');
  if (!box) return { ok: false, why: 'slug input missing' };
  setNative(box, 'BTCUSDT');
  for (let i = 0; i < 40; i++) { await wait(300); if (document.querySelectorAll('table').length >= 3) break; }
  const headers = [...document.querySelectorAll('thead th')].map((t) => (t.textContent || '').trim().toLowerCase());
  return { ok: true, tables: document.querySelectorAll('table').length, headers };
})()`);
const hdr = hist.headers || [];
check('order history table rendered', hist.ok && hist.tables >= 3, `tables=${hist.tables} ${hist.why || ''}`);
check('order history header includes stop_loss column', hdr.includes('stop_loss'), `headers: ${hdr.join(',')}`);
check('order history header includes take_profit column', hdr.includes('take_profit'), `headers: ${hdr.join(',')}`);

const realErrors = p2.consoleErrors.filter((e) => e && !/favicon/i.test(e));
check('no console errors on the order page', realErrors.length === 0, realErrors.slice(0, 2).join(' | ').slice(0, 200));
check('no uncaught page exceptions on the order page', p2.pageErrors.length === 0, p2.pageErrors.slice(0, 1).join(' | ').slice(0, 160));
await p2.close();

// ---------- report ----------
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log(`pair=${PAIR} base=${BASE}`);
process.exit(failed.length ? 1 : 0);
