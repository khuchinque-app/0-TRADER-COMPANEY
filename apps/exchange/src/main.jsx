import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Brand config store: a lightweight frontend JSON (repo-local), NOT a custom
// backend route. Swap values here or via HollaEx admin settings to white-label.
import brand from '../brand.config.json';

const STATE = (() => {
  try { return JSON.parse(window.__EXCHANGE_STATE__ || '{}'); } catch { return {}; }
})();
const path0 = STATE.path || location.pathname;

// ---------------- i18n (id default, en toggle) ----------------
const T = {
  id: {
    banner: 'SIMULASI — dana virtual, bukan Indodax, bukan bursa sungguhan',
    simNote: 'Simulasi — dana virtual',
    nav: { market: 'Pasarkan', tradeApi: 'API Trading', affiliate: 'Afiliasi', privacy: 'Privasi', help: 'Bantuan', login: 'Masuk', register: 'Daftar' },
    home: { h1: 'Trading kripto, cara Indonesia. (Simulasi.)', sub: 'Data pasar live dari MEXC, dana virtual dari ChinQue. Semua fitur bisa diklik — hasil simulasi.', enter: 'Mulai Trading', movers: 'Top Movers 24 Jam', volume: 'Volume Tertinggi' },
    market: { title: 'Semua Pasar', search: 'Cari aset...', quoteAll: 'Semua', vol: 'Vol', last: 'Harga Terakhir', chg: '24 Jam', name: 'Pasangan', feed: 'Feed' },
    pair: { buy: 'Beli', sell: 'Jual', limit: 'Limit', market: 'Market', price: 'Harga', amount: 'Jumlah', total: 'Total', submit: 'Kirim Order', bids: 'Bid', asks: 'Ask', tape: 'Riwayat Trade', open: 'Order Terbuka', hist: 'Riwayat Order', balance: 'Saldo', noFeed: 'Tidak ada live feed di simulasi untuk pair ini. Chart & order dinonaktifkan.', orderPlaced: 'Order simulasi terkirim (mock fill) ✔', needLogin: 'Masuk dulu untuk order (mock)', intervals: ['1m','5m','15m','30m','1h','4h','1d'] },
    notFound: '404 — Pair tidak ada di manifest sitemap.',
    noFeedShort: 'NO FEED',
    live: 'LIVE',
    indicatif: 'indikatif',
  },
  en: {
    banner: 'SIMULATION — virtual funds, not Indodax, not a real exchange',
    simNote: 'Simulation — virtual funds',
    nav: { market: 'Market', tradeApi: 'API Docs', affiliate: 'Affiliate', privacy: 'Privacy', help: 'Help', login: 'Log in', register: 'Sign up' },
    home: { h1: 'Crypto trading, Indonesian style. (Simulated.)', sub: 'Live market data from MEXC, virtual funds from ChinQue. Everything is clickable — results are simulated.', enter: 'Start Trading', movers: 'Top Movers 24h', volume: 'Top Volume' },
    market: { title: 'All Markets', search: 'Search assets...', quoteAll: 'All', vol: 'Vol', last: 'Last Price', chg: '24h', name: 'Pair', feed: 'Feed' },
    pair: { buy: 'Buy', sell: 'Sell', limit: 'Limit', market: 'Market', price: 'Price', amount: 'Amount', total: 'Total', submit: 'Submit Order', bids: 'Bids', asks: 'Asks', tape: 'Trade Tape', open: 'Open Orders', hist: 'Order History', balance: 'Balance', noFeed: 'No live feed in the simulation for this pair. Chart & order form disabled.', orderPlaced: 'Simulated order sent (mock fill) ✔', needLogin: 'Log in first to order (mock)', intervals: ['1m','5m','15m','30m','1h','4h','1d'] },
    notFound: '404 — Pair not in the sitemap manifest.',
    noFeedShort: 'NO FEED',
    live: 'LIVE',
    indicatif: 'indicative',
  },
};

// ---------------- api helpers (browser -> :22221 /api -> backend 11110) ----------------
async function jget(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return r.json();
}

// ---------------- shell ----------------
function Banner() {
  const [lang, setLang] = useState(() => localStorage.getItem('xlang') || 'id');
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('xs_theme'); if (t === 'light' || t === 'dark') return t; } catch {}
    return 'dark';
  });
  window.__setLang = (l) => { localStorage.setItem('xlang', l); renderApp(); };
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('xs_theme', next); } catch {}
    // update both html attr (paint) and any stray inline bg on body
    document.documentElement.setAttribute('data-theme', next);
  };
  const t = T[lang];
  return (
    <>
      <div className="banner">{t.banner} <small>· ChinQue Exchange · {t.simNote}</small></div>
      <header className="nav">
        <a className="logo" href="/">ChinQue<span>Exchange</span></a>
        <a className="item" href="/market">{t.nav.market}</a>
        <a className="item" href="/trade">Universe</a>
        <a className="item" href="/trade_api">{t.nav.tradeApi}</a>
        <a className="item" href="/affiliate">{t.nav.affiliate}</a>
        <a className="item" href="/privacy-policy">{t.nav.privacy}</a>
        <a className="item" href="/help/pengguna-baru">{t.nav.help}</a>
        <span className="lang" onClick={toggleTheme} title="Ganti tema / Toggle theme">
          {theme === 'dark' ? '🌙' : '☀️'}
        </span>
        <span className="lang" style={{ marginLeft: 0 }} onClick={() => window.__setLang(lang === 'id' ? 'en' : 'id')}>
          {lang === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
        </span>
      </header>
    </>
  );
}

function useLang() {
  const [lang] = useState(() => localStorage.getItem('xlang') || 'id');
  return T[lang];
}

// ---------------- pages ----------------
function HomePage() {
  const t = useLang();
  const [tickers, setTickers] = useState({ tickers: [] });
  useEffect(() => { let ok = true;
    const load = () => jget('/api/market/tickers').then((d) => ok && setTickers(d)).catch(() => {});
    load(); const iv = setInterval(load, 4000);
    return () => { ok = false; clearInterval(iv); };
  }, []);
  const list = tickers.tickers || [];
  const movers = [...list].sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0)).slice(0, 10);
  const vols = [...list].sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0)).slice(0, 10);
  const fmt = (n) => n >= 1000 ? n.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : n?.toLocaleString('id-ID', { maximumFractionDigits: 4 });
  return (
    <div className="wrap">
      <div style={{ textAlign: 'center', padding: '42px 0 30px' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 10px' }}>{t.home.h1}</h1>
        <p className="muted" style={{ margin: '0 0 20px' }}>{t.home.sub}</p>
        <a className="btn" href="/market" style={{ display: 'inline-block' }}>{t.home.enter}</a>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel"><h3>▲ {t.home.movers}</h3>
          <table><tbody>
            {movers.map((m) => (
              <tr key={m.slug}><td><a href={`/market/${m.slug}`}><b>{m.slug}</b></a></td>
                <td style={{ textAlign: 'right' }}>{fmt(m.lastPrice)}</td>
                <td style={{ textAlign: 'right' }} className={m.priceChangePercent >= 0 ? 'up' : 'down'}>{m.priceChangePercent?.toFixed(2)}%</td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="panel"><h3>🔥 {t.home.volume}</h3>
          <table><tbody>
            {vols.map((m) => (
              <tr key={m.slug}><td><a href={`/market/${m.slug}`}><b>{m.slug}</b></a></td>
                <td style={{ textAlign: 'right' }}>{fmt(m.lastPrice)}</td>
                <td style={{ textAlign: 'right' }} className="muted">{fmt(m.quoteVolume)}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function MarketPage() {
  const t = useLang();
  const [tickers, setTickers] = useState({ tickers: [] });
  const [pairs, setPairs] = useState({ pairs: [] });
  const [q, setQ] = useState('');
  const [quote, setQuote] = useState('ALL');
  const [sort, setSort] = useState(['vol', -1]);
  useEffect(() => {
    jget('/api/market/pairs').then(setPairs).catch(() => {});
    let ok = true;
    const load = () => jget('/api/market/tickers').then((d) => ok && setTickers(d)).catch(() => {});
    load(); const iv = setInterval(load, 4000);
    return () => { ok = false; clearInterval(iv); };
  }, []);
  const bySlug = useMemo(() => new Map((tickers.tickers || []).map((x) => [x.slug, x])), [tickers]);
  let rows = (pairs.pairs || []);
  if (q) rows = rows.filter((p) => p.slug.toLowerCase().includes(q.toLowerCase()));
  if (quote !== 'ALL') rows = rows.filter((p) => p.quote === quote);
  rows = rows.map((p) => ({ ...p, t: bySlug.get(p.slug) }));
  const sk = sort[0];
  rows.sort((a, b) => {
    const av = sk === 'name' ? a.slug : (a.t?.[sk === 'last' ? 'lastPrice' : sk === 'chg' ? 'priceChangePercent' : 'quoteVolume'] ?? -1);
    const bv = sk === 'name' ? b.slug : (b.t?.[sk === 'last' ? 'lastPrice' : sk === 'chg' ? 'priceChangePercent' : 'quoteVolume'] ?? -1);
    return (av > bv ? 1 : av < bv ? -1 : 0) * sort[1] * (sk === 'name' ? 1 : -1);
  });
  const th = (key, label) => (
    <th onClick={() => setSort([key, sort[0] === key ? -sort[1] : -1])} style={sort[0] === key ? { color: 'var(--text)' } : null}>{label}{sort[0] === key ? (sort[1] > 0 ? ' ↑' : ' ↓') : ''}</th>
  );
  return (
    <div className="wrap">
      <h1 className="crumb">{t.market.title} <span className="muted">· {rows.length}</span></h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="ghost" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.market.search}
          style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 12px', color: 'var(--text)', outline: 'none' }} />
        {['ALL', 'IDR', 'USDT'].map((x) => (
          <button key={x} className={'btn ghost' + (quote === x ? '' : '')} onClick={() => setQuote(x)}
            style={quote === x ? { borderColor: 'var(--up)', color: 'var(--up)' } : null}>{x === 'ALL' ? t.market.quoteAll : x}</button>
        ))}
      </div>
      <table>
        <thead><tr>{th('name', t.market.name)}{th('last', t.market.last)}{th('chg', t.market.chg)}{th('vol', t.market.vol)}<th>{t.market.feed}</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.slug} className={p.state === 'NO_FEED' ? 'no-feed' : ''}>
              <td><a href={`/market/${p.slug}`}><b>{p.slug}</b></a></td>
              <td>{p.t ? fmtNum(p.t.lastPrice) : <span className="muted">—</span>}{p.t?.indicative ? <span className="muted"> ({t.indicatif || p.t.indicative && 'indikatif'})</span> : null}</td>
              <td className={p.t ? (p.t.priceChangePercent >= 0 ? 'up' : 'down') : 'muted'}>{p.t ? `${p.t.priceChangePercent?.toFixed(2)}%` : '—'}</td>
              <td className="muted">{p.t ? fmtNum(p.t.quoteVolume) : '—'}</td>
              <td>{p.state === 'NO_FEED' ? <span className="down">{t.noFeedShort}</span> : <span className="up">{t.live}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  return n >= 1000 ? n.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : n.toLocaleString('id-ID', { maximumFractionDigits: 6 });
}

// ---------- candle chart: tiny SVG candlestick, no deps ----------
// `levels`: [{ price, label, kind: 'sl' | 'tp' }] -> horizontal dashed lines
// with right-aligned labels (Stop Loss / Take Profit), following 3devtool.md.
function CandleChart({ data, height = 320, levels = [] }) {
  if (!data || !data.length) return <div className="muted" style={{ padding: 30, textAlign: 'center' }}>—</div>;
  const W = 900, H = height, pad = 30;
  const n = Math.min(data.length, 90);
  const d = data.slice(-n);
  const hi = Math.max(...d.map((k) => k.high)), lo = Math.min(...d.map((k) => k.low));
  const y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const bw = (W - 2 * pad) / n;
  const active = (levels || []).filter((l) => l && l.price != null && !isNaN(l.price) && l.price >= lo && l.price <= hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {d.map((k, i) => {
        const x = pad + i * bw;
        const up = k.close >= k.open;
        const col = up ? 'var(--up)' : 'var(--down)';
        const top = y(Math.max(k.open, k.close)), bot = y(Math.min(k.open, k.close));
        return (
          <g key={i}>
            <line x1={x + bw / 2} x2={x + bw / 2} y1={y(k.high)} y2={y(k.low)} stroke={col} strokeWidth="1" />
            <rect x={x + 1} y={top} width={Math.max(bw - 2, 1)} height={Math.max(bot - top, 1)} fill={col} />
          </g>
        );
      })}
      {active.map((l, i) => {
        const yy = y(l.price);
        const col = l.kind === 'tp' ? 'var(--up)' : 'var(--down)';
        return (
          <g key={'lvl' + i}>
            <line x1={pad} x2={W - pad} y1={yy} y2={yy} stroke={col} strokeWidth="1" strokeDasharray="6 4" />
            <text x={W - pad - 4} y={yy - 4} fill={col} fontSize="11" textAnchor="end">
              {l.label} {fmtNum(l.price)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PairPage({ slug, trade = false }) {
  const t = useLang();
  const [tick, setTick] = useState(null);
  const [err, setErr] = useState(null);
  const [depth, setDepth] = useState(null);
  const [tape, setTape] = useState(null);
  const [klines, setKlines] = useState(null);
  const [interval, setIntervalSel] = useState('15m');
  const [bs, setBs] = useState('buy');
  const [ot, setOt] = useState('limit');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState(null);
  const [sl, setSl] = useState('');  // stop loss (display-only dashed line)
  const [tp, setTp] = useState('');  // take profit (display-only dashed line)
  useEffect(() => {
    let ok = true;
    const load = async () => {
      try {
        // Market data now comes from the server-side HollaEx adapter (/api/hx/*).
        const tk = await jget(`/api/hx/market/${slug}`); if (ok) setTick(tk);
        if (tk.state === 'LIVE') {
          jget(`/api/hx/market/${slug}/orderbook?limit=15`).then((d) => ok && setDepth(d)).catch(() => {});
          jget(`/api/hx/market/${slug}/trades?limit=30`).then((d) => ok && setTape(d)).catch(() => {});
        }
      } catch (e) { if (ok) setErr(e); }
    };
    load();
    const iv = setInterval(load, 2000);
    return () => { ok = false; clearInterval(iv); };
  }, [slug]);
  useEffect(() => {
    if (!tick || tick.state !== 'LIVE') return;
    let ok = true;
    const load = () => jget(`/api/market/klines/${slug}?interval=${interval}&limit=90`).then((d) => ok && setKlines(d)).catch(() => {});
    load();
    const iv = setInterval(load, interval === '1m' ? 6000 : 20000);
    return () => { ok = false; clearInterval(iv); };
  }, [slug, interval, tick?.state]);

  if (err && err.status === 404) {
    return <div className="wrap"><h1 className="crumb">{t.notFound}</h1><a className="btn ghost" href="/market">{t.nav?.market || '← Market'}</a></div>;
  }
  const noFeed = tick && tick.state === 'NO_FEED';
  const last = tick?.lastPrice;
  // Stop/Take levels drawn as dashed lines on the chart.
  const levels = [];
  if (parseFloat(sl) > 0) levels.push({ price: parseFloat(sl), label: 'SL', kind: 'sl' });
  if (parseFloat(tp) > 0) levels.push({ price: parseFloat(tp), label: 'TP', kind: 'tp' });
  // Order-book mid price + spread (shown between the ask and bid ladders).
  const bestBid = depth?.bids?.[0]?.[0];
  const bestAsk = depth?.asks?.[0]?.[0];
  const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : (bestBid ?? bestAsk ?? last);
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const submit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('sx_jwt') || '';
      const resp = await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({
          slug, side: bs, type: ot,
          price: ot === 'limit' ? parseFloat(price) : undefined,
          quantity: parseFloat(amount),
          stop_loss: parseFloat(sl) > 0 ? parseFloat(sl) : undefined,
          take_profit: parseFloat(tp) > 0 ? parseFloat(tp) : undefined,
        }),
      });
      if (resp.status === 401) { setToast(t.pair.needLogin); setTimeout(() => setToast(null), 3000); location.href = '/akun/masuk'; return; }
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.message || 'HTTP ' + resp.status);
      setToast(`${t.pair.orderPlaced} @ ${fmtNum(d.displayedPrice)} × ${fmtNum(d.quantity)}`); setTimeout(() => setToast(null), 3600);
      setAmount(''); setPrice('');
    } catch (e2) {
      setToast('ERR ' + e2.message); setTimeout(() => setToast(null), 3600);
    }
  };
  return (
    <div className="wrap">
      <h1 className="crumb"><b>{slug}</b> · {tick?.symbol || '—'} <span className="muted">Simulasi</span>{tick?.stale && <span className="muted" style={{ marginLeft: 8 }}>· stale</span>}</h1>
      {noFeed ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⛔ {t.noFeedShort}</div>
          <p className="muted">{t.pair.noFeed}</p>
          <a className="btn ghost" href="/market">← {t.nav.market}</a>
        </div>
      ) : (
        <>
          <div className="ticker-bar">
            <div className="stat">
              <span>{slug}</span>
              <b className={tick?.priceChangePercent >= 0 ? 'up' : 'down'} style={{ fontSize: 30, fontWeight: 800 }}>{fmtNum(last)}</b>
            </div>
            <div className={tick?.priceChangePercent >= 0 ? 'up chg' : 'down chg'} style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
              {tick ? `${tick.priceChangePercent?.toFixed(2)}%` : '—'}
            </div>
            <div className="stat"><span>24h High</span><b>{fmtNum(tick?.highPrice)}</b></div>
            <div className="stat"><span>24h Low</span><b>{fmtNum(tick?.lowPrice)}</b></div>
            <div className="stat"><span>24h Vol</span><b>{fmtNum(tick?.quoteVolume)}</b></div>
            <div className="ticker-actions">
              <a className="btn ghost" href={`/market/depth_chart/${slug}`}>Depth</a>
              <a className="btn ghost" href={`/chart/${slug}`}>Chart ⛶</a>
            </div>
          </div>
          <div className="grid">
            <div>
              <div className="panel" style={{ marginBottom: 12 }}>
                <div className="row" style={{ padding: '6px 10px', gap: 6, borderBottom: '1px solid var(--line)' }}>
                  {t.pair.intervals.map((i) => (
                    <button key={i} className={'btn ghost' } onClick={() => setIntervalSel(i)}
                      style={interval === i ? { borderColor: 'var(--up)', color: 'var(--up)', padding: '4px 10px' } : { padding: '4px 10px', fontSize: 12 }}>{i}</button>
                  ))}
                </div>
                <CandleChart data={klines?.klines} levels={levels} />
              </div>
              <div className="panel">
                <div className="panel-head">
                  <h3>{t.pair.bids} / {t.pair.asks}</h3>
                  <span className="muted" style={{ fontSize: 11 }}>Simulasi</span>
                </div>
                <div className="book">
                  {[...(depth?.asks || [])].slice(0, 10).reverse().map((a, i) => (
                    <div className="brow" key={'a' + i}>
                      <span className="down">{fmtNum(a[0])}</span>
                      <span style={{ textAlign: 'right' }}>{fmtNum(a[1])}</span>
                      <span className="bar down" style={{ width: Math.min(100, (a[1] / (depth.asks[0]?.[1] || 1)) * 100) + '%' }} />
                    </div>
                  ))}
                  <div className="mid">
                    <b className={tick?.priceChangePercent >= 0 ? 'up' : 'down'}>{fmtNum(mid)}</b>
                    <span className="muted" style={{ fontSize: 11 }}>spread {spread == null ? '—' : fmtNum(spread)}</span>
                  </div>
                  {(depth?.bids || []).slice(0, 10).map((b, i) => (
                    <div className="brow" key={'b' + i}>
                      <span className="up">{fmtNum(b[0])}</span>
                      <span style={{ textAlign: 'right' }}>{fmtNum(b[1])}</span>
                      <span className="bar up" style={{ width: Math.min(100, (b[1] / (depth.bids[0]?.[1] || 1)) * 100) + '%' }} />
                    </div>
                  ))}
                  {!(depth?.bids || []).length && !(depth?.asks || []).length && (
                    <div className="muted" style={{ padding: 18, textAlign: 'center' }}>—</div>
                  )}
                </div>
              </div>
              <div className="panel" style={{ marginTop: 12 }}>
                <h3>{t.pair.tape}</h3>
                <table><tbody>
                  {(tape?.trades || []).slice(0, 15).map((tr, i) => (
                    <tr key={i}><td className="muted">{new Date(tr.time).toLocaleTimeString('id-ID')}</td>
                      <td className={tr.side === 'buy' ? 'up' : 'down'}>{fmtNum(tr.price)}</td><td style={{ textAlign: 'right' }}>{fmtNum(tr.qty)}</td></tr>
                  ))}
                </tbody></table>
              </div>
            </div>
            <div className="panel">
              <div className="row" style={{ padding: 12, gap: 8 }}>
                <div className="seg">
                  <button className={bs === 'buy' ? 'on buy' : ''} onClick={() => setBs('buy')}>{t.pair.buy}</button>
                  <button className={bs === 'sell' ? 'on sell' : ''} onClick={() => setBs('sell')}>{t.pair.sell}</button>
                </div>
                <div className="seg">
                  <button className={ot === 'limit' ? 'on' : ''} onClick={() => setOt('limit')}>{t.pair.limit}</button>
                  <button className={ot === 'market' ? 'on' : ''} onClick={() => setOt('market')}>{t.pair.market}</button>
                </div>
              </div>
              <form className="form" onSubmit={submit}>
                <div className="field"><span>{t.pair.price}</span>
                  <input value={ot === 'market' ? (last == null ? '' : String(last)) : price}
                    onChange={(e) => setPrice(e.target.value)} readOnly={ot === 'market'} inputMode="decimal" /></div>
                <div className="field"><span>{t.pair.amount}</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
                <div className="row" style={{ gap: 8 }}>
                  <div className="field" style={{ flex: 1 }}><span>SL</span>
                    <input value={sl} onChange={(e) => setSl(e.target.value)} inputMode="decimal" placeholder="stop loss" /></div>
                  <div className="field" style={{ flex: 1 }}><span>TP</span>
                    <input value={tp} onChange={(e) => setTp(e.target.value)} inputMode="decimal" placeholder="take profit" /></div>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.pair.balance}: <a href="/akun/dompet" style={{ color: 'var(--up)' }}>USB → dompet simulasi</a>
                </div>
                <button type="submit" className={'btn' + (bs === 'sell' ? ' sell' : '')}>{bs === 'buy' ? t.pair.buy : t.pair.sell} {slug?.replace('IDR', '').replace('USDT', '')}</button>
              </form>
              <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{t.pair.open} / {t.pair.hist}</div>
                <OrdersPanel slug={slug} />
              </div>
            </div>
          </div>
        </>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function OrdersPanel({ slug }) {
  const [token] = useState(() => localStorage.getItem('sx_jwt') || '');
  const [orders, setOrders] = useState(null);
  const load = () => fetch(`/api/market/myorders/${slug}`, { headers: { authorization: 'Bearer ' + token, accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null)).then(setOrders).catch(() => setOrders(null));
  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, [slug, token]);
  if (!orders) return <div className="muted" style={{ fontSize: 12 }}>—</div>;
  const open = (orders.open || []).slice(0, 6);
  if (!open.length) return <div className="muted" style={{ fontSize: 12 }}>0 order terbuka</div>;
  const cancel = async (id) => {
    const r = await fetch(`/api/market/orders/${id}`, { method: 'DELETE', headers: { authorization: 'Bearer ' + token } });
    if (r.ok) load();
  };
  return (
    <table style={{ fontSize: 12 }}>
      <tbody>
        {open.map((o) => (
          <tr key={o.id}><td className={o.side === 'buy' ? 'up' : 'down'}>{o.side === 'buy' ? 'B' : 'S'}</td>
            <td>{o.type}</td><td>{fmtNum(o.price)}</td><td>{fmtNum(o.quantity)}</td>
            <td className="muted">{o.stop_loss ? fmtNum(o.stop_loss) : '—'}</td>
            <td className="muted">{o.take_profit ? fmtNum(o.take_profit) : '—'}</td>
            <td className="muted">{o.status}</td>
            <td><button className="btn ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => cancel(o.id)}>✕</button></td></tr>
        ))}
      </tbody>
    </table>
  );
}

function DepthChartPage({ slug }) {
  const t = useLang();
  const [d, setD] = useState(null);
  useEffect(() => {
    let ok = true;
    const load = () => jget(`/api/hx/market/${slug}/orderbook?limit=200`).then((x) => ok && setD(x)).catch(() => {});
    load(); const iv = setInterval(load, 1500);
    return () => { ok = false; clearInterval(iv); };
  }, [slug]);
  const W = 1000, H = 420, pad = 40;
  const bids = d?.bids || [], asks = d?.asks || [];
  const all = [...bids, ...asks];
  const lo = Math.min(...all.map((r) => r[0]), Infinity), hi = Math.max(...all.map((r) => r[0]), 0);
  const mid = (lo + hi) / 2;
  let cum = 0; const bidPts = []; for (const [p, q] of [...bids].reverse()) { cum += q; bidPts.push([p, cum]); }
  cum = 0; const askPts = []; for (const [p, q] of asks) { cum += q; askPts.push([p, cum]); }
  const maxQ = Math.max(...bidPts.map((x) => x[1]), ...askPts.map((x) => x[1]), 1);
  const x = (p) => pad + ((p - lo) / (hi - lo || 1)) * (W - 2 * pad);
  const y = (q) => H - pad - (q / maxQ) * (H - 2 * pad);
  const poly = (pts, rev) => pts.map(([p, q]) => `${x(p)},${y(q)}`).join(' ') + (rev ? '' : '');
  return (
    <div className="wrap">
      <h1 className="crumb"><a className="muted" href={`/market/${slug}`}>← </a><b>{slug}</b> <span className="muted">Depth Chart · Simulasi</span></h1>
      <div className="panel">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          {bids.length > 0 && <polygon points={`${lo},${H - pad} ${poly([...bidPts].reverse())} ${x(bids[0][0])},${H - pad}`} fill="var(--up)" opacity=".35" />}
          {asks.length > 0 && <polygon points={`${x(bids[0]?.[0] || mid)},${H - pad} ${poly(askPts)} ${x(asks[asks.length - 1][0])},${H - pad}`} fill="var(--down)" opacity=".35" />}
          {mid > lo && mid < hi && <line x1={x(mid)} x2={x(mid)} y1={pad} y2={H - pad} stroke="var(--muted)" strokeDasharray="4 4" />}
          <text x={x(mid)} y={pad - 8} fill="var(--muted)" textAnchor="middle" fontSize="12">mid {fmtNum(mid)}</text>
        </svg>
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>Spread: {fmtNum(hi - (bids[0]?.[0] || 0))}</p>
    </div>
  );
}

function ChartOnlyPage({ slug }) {
  const t = useLang();
  const [k, setK] = useState(null);
  const [interval, setIntervalSel] = useState('15m');
  useEffect(() => {
    let ok = true;
    const load = () => jget(`/api/market/klines/${slug}?interval=${interval}&limit=120`).then((d) => ok && setK(d)).catch(() => {});
    load(); const iv = setInterval(load, 10000);
    return () => { ok = false; clearInterval(iv); };
  }, [slug, interval]);
  return (
    <div className="wrap" style={{ maxWidth: '100%' }}>
      <h1 className="crumb"><a className="muted" href={`/market/${slug}`}>← </a><b>{slug}</b> <span className="muted">Simulasi</span></h1>
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        {t.pair.intervals.map((i) => (
          <button key={i} className="btn ghost" onClick={() => setIntervalSel(i)}
            style={interval === i ? { borderColor: 'var(--up)', color: 'var(--up)', padding: '4px 10px' } : { padding: '4px 10px', fontSize: 12 }}>{i}</button>
        ))}
      </div>
      <div className="panel"><CandleChart data={k?.klines} height={560} /></div>
    </div>
  );
}

function NotFound() {
  const t = useLang();
  return <div className="wrap"><h1 className="crumb">{t.notFound}</h1><a className="btn ghost" href="/">← Home</a></div>;
}

function SimplePage({ title, children }) {
  const t = useLang();
  return (
    <div className="wrap">
      <h1 className="crumb"><b>{title}</b></h1>
      <div className="panel" style={{ padding: 20, maxWidth: 720, lineHeight: 1.7 }}>
        {children}
        <p className="muted" style={{ fontSize: 12 }}>{t.banner}</p>
      </div>
    </div>
  );
}

// ---------------- router ----------------
function App() {
  const path = STATE.path || location.pathname;
  let m;
  if (path === '/' || path === '') return <HomePage />;
  if (path === '/market') return <MarketPage />;
  if (path === '/trade') return <UniversePage />;
  if ((m = path.match(/^\/trade\/([A-Za-z0-9]+)$/))) return <PairPage slug={m[1].toUpperCase()} trade />;
  if ((m = path.match(/^\/market\/depth_chart\/([A-Z0-9]+)$/))) return <DepthChartPage slug={m[1]} />;
  if ((m = path.match(/^\/chart\/([A-Z0-9]+)$/))) return <ChartOnlyPage slug={m[1]} />;
  if ((m = path.match(/^\/market\/([A-Z0-9]+)$/))) return <PairPage slug={m[1]} />;
  if (STATE.state === 'not-found') return <NotFound />;
  if (path === '/trade_api') return <SimplePage title="trade_api — Read-only API (Simulasi)">
    <p>Endpoint publik adapter HollaEx (GET): <code>/api/hx/market/list</code>, <code>/api/hx/market/:pair</code>, <code>/api/hx/market/:pair/orderbook</code>, <code>/api/hx/market/:pair/trades</code>, <code>/api/hx/health</code>.</p>
    <p className="muted">Data pasar bersumber dari MEXC public market data. Semua trading adalah simulasi dengan dana virtual.</p>
  </SimplePage>;
  if (path === '/affiliate') return <SimplePage title="Afiliasi"><p>Program afiliasi simulasi — komisi dari temuan trader virtual. Segera hadir.</p></SimplePage>;
  if (path === '/privacy-policy') return <SimplePage title="Kebijakan Privasi (Simulasi)">
    <p>ChinQue Exchange adalah platform simulasi. Tidak ada data pasar uang nyata, tidak ada KYC nyata, tidak ada penyimpanan aset kripto.</p>
    <p>Data yang disimpan: email, saldo virtual, riwayat order simulasi — semua di ledger simulasi.</p>
  </SimplePage>;
  if (path === '/help/pengguna-baru') return <SimplePage title="Bantuan — Pengguna Baru">
    <p>1. Buka <a href="/market" style={{ color: 'var(--up)' }}>/market</a> dan pilih pair.</p>
    <p>2. Masuk lewat <a href="/akun/masuk" style={{ color: 'var(--up)' }}>/akun/masuk</a> untuk dapat saldo virtual.</p>
    <p>3. Tempatkan order (buy/sell, limit/market) — semua terisi mock ke ledger simulasi.</p>
  </SimplePage>;
  if (path === '/help/ketentuan') return <SimplePage title="Ketentuan (Simulasi)">
    <p>ChinQue Exchange = SIMULASI. Semua dana virtual. Bukan bursa sungguhan, bukan nasihat investasi.</p>
  </SimplePage>;
  if (path === '/akun/order') return <MyOrdersPage />;
  if (path === '/akun/admin') return <AdminPage />;
  if (path === '/akun/masuk') return <LoginPage />;
  if (path === '/akun/daftar') return <SimplePage title="Daftar"><p>Gunakan <a href="/akun/masuk" style={{ color: 'var(--up)' }}>/akun/masuk</a> → tombol Guest Demo untuk saldo instan (tanpa KYC).</p></SimplePage>;
  if (path === '/akun/dompet') return <WalletPage />;
  return <NotFound />;
}

function UniversePage() {
  const t = useLang();
  const [pairs, setPairs] = useState([]);
  const [tickers, setTickers] = useState(new Map());
  const [q, setQ] = useState('');
  useEffect(() => {
    let ok = true;
    jget('/api/market/universe').then((d) => { if (ok) setPairs(d.pairs || []); }).catch(() => {});
    const load = () => jget('/api/market/tickers').then((d) => {
      if (!ok) return;
      setTickers(new Map((d.tickers || []).filter((x) => x.quote === 'USDT').map((x) => [x.mexcSymbol, x])));
    }).catch(() => {});
    load(); const iv = setInterval(load, 5000);
    return () => { ok = false; clearInterval(iv); };
  }, []);
  const rows = q ? pairs.filter((p) => p.base.toLowerCase().includes(q.toLowerCase())) : pairs;
  return (
    <div className="wrap">
      <h1 className="crumb"><b>MEXC Universe</b> <span className="muted">· {pairs.length} koin · Simulasi</span></h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="ghost" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.market.search}
          style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 12px', color: 'var(--text)', outline: 'none' }} />
      </div>
      <table>
        <thead><tr><th>{t.market.name}</th><th style={{ textAlign: 'right' }}>{t.market.last}</th><th style={{ textAlign: 'right' }}>{t.market.chg}</th><th style={{ textAlign: 'right' }}>{t.market.vol}</th></tr></thead>
        <tbody>
          {rows.slice(0, 400).map((p) => {
            const tk = tickers.get(p.mexcSymbol);
            return (
              <tr key={p.slug}>
                <td><a href={`/trade/${p.base}`}><b>{p.base}</b>/{p.quote}</a></td>
                <td style={{ textAlign: 'right' }}>{tk ? fmtNum(tk.lastPrice) : '—'}</td>
                <td style={{ textAlign: 'right' }} className={tk ? (tk.priceChangePercent >= 0 ? 'up' : 'down') : 'muted'}>{tk ? tk.priceChangePercent?.toFixed(2) + '%' : '—'}</td>
                <td style={{ textAlign: 'right' }} className="muted">{tk ? fmtNum(tk.quoteVolume) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 400 && <p className="muted" style={{ textAlign: 'center' }}>… {rows.length - 400} lebih — gunakan pencarian</p>}
    </div>
  );
}

function MyOrdersPage() {
  const t = useLang();
  const [token] = useState(() => localStorage.getItem('sx_jwt') || '');
  const [slug, setSlug] = useState(() => (STATE.path === '/akun/order' ? '' : ''));
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!slug) { setData(null); return; }
    fetch(`/api/market/myorders/${slug}`, { headers: { authorization: 'Bearer ' + token, accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
  }, [slug, token]);
  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <h1 className="crumb"><b>Order Saya — Simulasi</b></h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="ghost" value={slug} onChange={(e) => setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="BTCIDR"
          style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 12px', color: 'var(--text)', outline: 'none' }} />
      </div>
      {data ? (
        <>
          <div className="panel" style={{ marginBottom: 12 }}><h3>{t.pair.open}</h3>
            <table><thead><tr><th>pair</th><th>side</th><th>type</th><th>price</th><th>qty</th><th>SL</th><th>TP</th><th>status</th></tr></thead><tbody>
              {(data.open || []).map((o) => (
                <tr key={o.id}><td>{o.pair}</td><td className={o.side === 'buy' ? 'up' : 'down'}>{o.side}</td><td>{o.type}</td>
                  <td>{fmtNum(o.price)}</td><td>{fmtNum(o.quantity)}</td>
                  <td className="muted">{o.stop_loss ? fmtNum(o.stop_loss) : '—'}</td>
                  <td className="muted">{o.take_profit ? fmtNum(o.take_profit) : '—'}</td>
                  <td className="muted">{o.status}</td></tr>
              ))}
              {!(data.open || []).length && <tr><td colSpan={8} className="muted">0 order terbuka</td></tr>}
            </tbody></table>
          </div>
          <div className="panel" style={{ marginBottom: 12 }}><h3>{t.pair.hist}</h3>
            <table><thead><tr><th>pair</th><th>side</th><th>status</th><th>price</th><th>qty</th><th>SL</th><th>TP</th></tr></thead><tbody>
              {(data.history || []).map((o) => (
                <tr key={o.id}><td>{o.pair}</td><td className={o.side === 'buy' ? 'up' : 'down'}>{o.side}</td><td className="muted">{o.status}</td>
                  <td>{fmtNum(o.price)}</td><td>{fmtNum(o.quantity)}</td>
                  <td className="muted">{o.stop_loss ? fmtNum(o.stop_loss) : '—'}</td>
                  <td className="muted">{o.take_profit ? fmtNum(o.take_profit) : '—'}</td></tr>
              ))}
              {!(data.history || []).length && <tr><td colSpan={7} className="muted">riwayat kosong</td></tr>}
            </tbody></table>
          </div>
          <div className="panel"><h3>Fills (ledger)</h3>
            <table><thead><tr><th>time</th><th>side</th><th>price</th><th>qty</th><th>fee</th></tr></thead><tbody>
              {(data.fills || []).map((f) => (
                <tr key={f.id}><td className="muted">{new Date((f.timestamp || 0) * 1000).toLocaleString('id-ID')}</td>
                  <td className={f.side === 'buy' ? 'up' : 'down'}>{f.side}</td>
                  <td>{fmtNum(f.price)}</td><td>{fmtNum(f.quantity)}</td><td className="muted">{fmtNum(f.fee)}</td></tr>
              ))}
              {!(data.fills || []).length && <tr><td colSpan={5} className="muted">belum ada fill</td></tr>}
            </tbody></table>
          </div>
        </>
      ) : (
        <div className="panel" style={{ padding: 20 }}>
          <p className="muted">Ketik slug pair (mis. BTCIDR), atau <a href="/akun/dompet" style={{ color: 'var(--up)' }}>lihat dompet</a> · {t.simNote}</p>
        </div>
      )}
    </div>
  );
}

// ---------------- admin login (SPA, brand config from frontend store) ----------------
// /akun/admin reads white-label branding from ../brand.config.json (a repo-local
// frontend config store). It does NOT call a custom backend route — exchange
// administration itself lives in HollaEx Kit's built-in admin panel.
function AdminPage() {
  const t = useLang();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [msg, setMsg] = useState('');
  const c = brand.colors || {};
  const signIn = (e) => {
    e.preventDefault();
    // Simulation admin gate: no real credentials, no custom backend route.
    if (!user || !pass) { setMsg('Isi pengguna & kata sandi.'); return; }
    setSignedIn(true);
    setMsg('');
  };
  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <h1 className="crumb"><b>{brand.admin?.title || 'Admin Exchange'}</b> <span className="muted">· Simulasi</span></h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: c.primary }}>{brand.logoText}</span>
        <span style={{ fontWeight: 800, fontSize: 18 }}>{brand.logoAccent}</span>
        <span className="muted" style={{ fontSize: 12 }}>{brand.tagline}</span>
      </div>
      {!signedIn ? (
        <div className="panel form">
          <div className="field"><span>user</span>
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin" /></div>
          <div className="field"><span>pass</span>
            <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="••••••" /></div>
          <button className="btn" onClick={signIn}>Masuk Admin (mock)</button>
          {msg && <div className="muted" style={{ fontSize: 12 }}>{msg}</div>}
        </div>
      ) : (
        <div className="panel" style={{ padding: 16 }}>
          <h3>Brand (frontend config store)</h3>
          <table><tbody>
            <tr><td className="muted">Name</td><td>{brand.name}</td></tr>
            <tr><td className="muted">Primary</td><td><span style={{ color: c.primary }}>■</span> {c.primary}</td></tr>
            <tr><td className="muted">Accent</td><td><span style={{ color: c.accent }}>■</span> {c.accent}</td></tr>
            <tr><td className="muted">Up / Down</td><td><span style={{ color: c.up }}>■</span> <span style={{ color: c.down }}>■</span></td></tr>
          </tbody></table>
          {brand.admin?.manageUrl && (
            <p style={{ marginTop: 12 }}>
              <a className="btn ghost" href={brand.admin.manageUrl}>{brand.admin.manageLabel || 'Open admin'}</a>
            </p>
          )}
          <p className="muted" style={{ fontSize: 12 }}>Penyimpanan pengaturan exchange dikelola oleh panel HollaEx Kit. {t.simNote}</p>
        </div>
      )}
    </div>
  );
}

// ---------------- wallet + login (mock, investor-clickable) ----------------
function LoginPage() {
  const t = useLang();
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const go = async (url, body) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
      const d = await r.json();
      if (r.status === 401 || r.status === 400) { setMsg(d.message || 'gagal'); return; }
      localStorage.setItem('sx_jwt', d.token || '');
      location.href = '/akun/dompet';
    } catch (e) { setMsg(String(e.message)); }
  };
  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <h1 className="crumb"><b>Masuk — Simulasi</b></h1>
      <div className="panel form">
        <div className="field"><input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><input placeholder="password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
        <button className="btn" onClick={() => go('/api/auth/login', { email, password: pass })}>Masuk (mock)</button>
        <button className="btn ghost" onClick={() => go('/api/auth/guest')}>Guest Demo — saldo virtual instan 🎁</button>
        {msg && <div className="muted" style={{ fontSize: 12 }}>{msg}</div>}
        <div className="muted" style={{ fontSize: 12 }}>{t.simNote}</div>
      </div>
    </div>
  );
}

function WalletPage() {
  const t = useLang();
  const [bal, setBal] = useState(null);
  const [token] = useState(() => localStorage.getItem('sx_jwt') || '');
  useEffect(() => {
    fetch('/api/wallet/balance', { headers: { authorization: 'Bearer ' + token, accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setBal(d)).catch(() => setBal(null));
  }, [token]);
  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <h1 className="crumb"><b>Dompet Simulasi</b></h1>
      <div className="panel" style={{ padding: 16 }}>
        {bal ? (
          <table><tbody>
            {(bal.balances || []).map((b) => (
              <tr key={b.asset}><td><b>{b.asset}</b></td><td style={{ textAlign: 'right' }}>{fmtNum(b.available)}</td>
                <td className="muted" style={{ textAlign: 'right' }}>locked {fmtNum(b.locked)}</td></tr>
            ))}
          </tbody></table>
        ) : <p className="muted">Belum masuk. <a href="/akun/masuk" style={{ color: 'var(--up)' }}>Login / Guest</a></p>}
        <p className="muted" style={{ fontSize: 12 }}>{t.simNote}</p>
      </div>
    </div>
  );
}

let root = null;
function renderApp() {
  if (!root) root = createRoot(document.getElementById('root'));
  root.render(<><Banner /><App /></>);
}
renderApp();
