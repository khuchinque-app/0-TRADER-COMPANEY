// apps/backend/src/market.ts — /api/market/* based on MEXC PUBLIC data + indodax route manifest.
// HARD RULE: MEXC public endpoints only (ping, time, exchangeInfo, depth, trades,
// aggTrades, klines, avgPrice, ticker24hr, tickerPrice, bookTicker). NO private
// endpoints, no API keys. Browser never calls MEXC directly: browser -> :22221 ->
// backend :11110 /api/market/* -> cache -> MEXC.
import express, { Request, Response } from "express";
import { randomBytes } from "crypto";
import Database from "better-sqlite3";
import { mexc } from "@trading/mexc-client";
import routesJson from "@trading/indodax-routes/routes.json";

// ---------- types ----------
interface PairEntry {
  slug: string;
  base: string;
  quote: string;
  inMarket: boolean;
  inDepth: boolean;
  inChart: boolean;
  mexcSymbol?: string | null;
  state?: "LIVE" | "NO_FEED";
}
interface Manifest {
  generatedAt: string;
  stale: boolean;
  static: string[];
  pairs: PairEntry[];
}

const manifest = routesJson as unknown as Manifest;

// ---------- config ----------
const MEXC_TICKER_TTL_MS = parseInt(process.env.MEXC_TICKER_TTL_MS || "2500");
const MEXC_DEPTH_TTL_MS = parseInt(process.env.MEXC_DEPTH_TTL_MS || "1000");
const MEXC_KLINES_TTL_MS = parseInt(process.env.MEXC_KLINES_TTL_MS || "5000");
const MEXC_INFO_TTL_MS = parseInt(process.env.MEXC_INFO_TTL_MS || "600000"); // 10 min
// GRILL ANSWER Q5: EVERYTHING must work / be clickable. All LIVE pairs tradable in the
// simulation (fills are our engine's mock matching against MEXC depth). NO_FEED stays view-only.
const TRADABLE_BASES_OVERRIDE_ALL = process.env.TRADABLE_ALL === "1"; // default: ALL tradable
const DEFAULT_USDT_IDR = parseFloat(process.env.USDT_IDR_RATE || "16250");

// ---------- pair resolution ----------
const pairBySlug = new Map<string, PairEntry>();
for (const p of manifest.pairs) pairBySlug.set(p.slug, p);

// refresh exchangeInfo (cached 10 min) to resolve which slugs exist on MEXC
let infoCache: { symbols: Set<string>; ts: number; ok: boolean } | null = null;
async function exchangeInfoSet(): Promise<Set<string>> {
  const now = Date.now();
  if (infoCache && now - infoCache.ts < MEXC_INFO_TTL_MS && infoCache.ok) return infoCache.symbols;
  const r = await mexc.exchangeInfo();
  if (r.ok && r.data) {
    const syms = new Set<string>();
    for (const s of (r.data as { symbols: Array<{ symbol: string }> }).symbols) syms.add(s.symbol);
    infoCache = { symbols: syms, ts: now, ok: true };
    return syms;
  }
  if (infoCache) return infoCache.symbols; // serve last-good
  return new Set();
}

export async function resolvePairState(): Promise<void> {
  const syms = await exchangeInfoSet();
  for (const p of pairBySlug.values()) {
    const candidate = p.base + "USDT";
    if (p.mexcSymbol === undefined || p.mexcSymbol === candidate || p.mexcSymbol === null) {
      p.mexcSymbol = syms.has(candidate) ? candidate : null;
    }
    p.state = p.mexcSymbol ? "LIVE" : "NO_FEED";
  }
}

// resolve a request param to a pair entry: manifest slug first, then ANY MEXC base (universe ext — user request: robust ALL markets)
async function resolveFlexible(rawRaw: string): Promise<PairEntry | null> {
  const raw = String(rawRaw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = pairBySlug.get(raw);
  if (p) return p;
  // try as raw MEXC base (e.g. DOGE -> DOGEUSDT) or full symbol
  let base = raw;
  if (base.endsWith("USDT")) base = base.slice(0, -4);
  else if (base.endsWith("IDR")) base = base.slice(0, -3);
  if (!base) return null;
  const syms = await exchangeInfoSet();
  const sym = `${base}USDT`;
  if (!syms.has(sym)) return null;
  return { slug: `${base}USDT`, base, quote: raw.endsWith("IDR") ? "IDR" : "USDT", inMarket: false, inDepth: false, inChart: false, mexcSymbol: sym, state: "LIVE" };
}
interface CacheEntry<T> {
  data: T | null;
  ts: number;
  fetching: Promise<T | null> | null;
}
const caches = new Map<string, CacheEntry<unknown>>();
const breaker = new Map<string, { fails: number; openUntil: number }>();

const BREAK_THRESHOLD = 5;
const BREAK_COOLDOWN_MS = 30_000;

function breakerOpen(key: string): boolean {
  const b = breaker.get(key);
  return !!b && b.openUntil > Date.now();
}
function breakerRecord(key: string, ok: boolean) {
  const b = breaker.get(key) || { fails: 0, openUntil: 0 };
  if (ok) {
    b.fails = 0;
  } else {
    b.fails++;
    if (b.fails >= BREAK_THRESHOLD) b.openUntil = Date.now() + BREAK_COOLDOWN_MS;
  }
  breaker.set(key, b);
}

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T | null>): Promise<{ data: T | null; ts: number; stale: boolean }> {
  const now = Date.now();
  let entry = caches.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { data: null, ts: 0, fetching: null };
    caches.set(key, entry);
  }
  if (entry.data !== null && now - entry.ts < ttlMs) {
    return { data: entry.data, ts: entry.ts, stale: false };
  }
  if (!entry.fetching && !breakerOpen(key)) {
    entry.fetching = (async () => {
      try {
        const data = await loader();
        breakerRecord(key, data !== null);
        if (data !== null) {
          entry!.data = data;
          entry!.ts = Date.now();
        }
        return data;
      } finally {
        entry!.fetching = null;
      }
    })();
  }
  // if a fetch is already in flight or breaker open, wait briefly for in-flight result
  const fresh = entry.fetching ? await Promise.race([entry.fetching, new Promise((r) => setTimeout(() => r(null), 1800))]) : null;
  if (fresh !== null) return { data: fresh as T, ts: entry.ts, stale: false };
  return { data: entry.data, ts: entry.ts, stale: entry.data !== null && now - entry.ts > ttlMs };
}

// ---------- IDR display rate ----------
let idrRate: { rate: number; ts: number } = { rate: DEFAULT_USDT_IDR, ts: 0 };
export function getIdrRate(): number {
  void refreshIdrRate();
  return idrRate.rate;
}
async function refreshIdrRate(): Promise<void> {
  const now = Date.now();
  if (now - idrRate.ts < 60_000) return;
  idrRate.ts = now; // prevent stampede
  // MEXC has no IDR market; USDT_IDR_RATE stays config-driven until a public FX
  // source is wired (backend /api/market/fx later). Keep last rate.
}

function isTradable(p: PairEntry): boolean {
  if (!p.mexcSymbol) return false; // NO_FEED stays view-only
  return true; // Q5 (user): ALL pairs clickable/tradable — mock fills via our engine
}
function toQuoteNum(p: PairEntry, usdtPrice: number): { price: number; quote: string; indicative: boolean } {
  if (p.quote === "IDR") {
    return { price: usdtPrice * getIdrRate(), quote: "IDR", indicative: true };
  }
  return { price: usdtPrice, quote: "USDT", indicative: false };
}

function pairView(p: PairEntry): Record<string, unknown> {
  return {
    slug: p.slug,
    base: p.base,
    quote: p.quote,
    inMarket: p.inMarket,
    inDepth: p.inDepth,
    inChart: p.inChart,
    mexcSymbol: p.mexcSymbol ?? null,
    state: p.mexcSymbol ? "LIVE" : "NO_FEED",
    tradable: isTradable(p),
  };
}

// ---------- MEXC full universe (user request: ALL MEXC markets, not just manifest) ----------
// Built from cached exchangeInfo: every USDT-quoted spot symbol -> pseudo-pair entries
// (slug = BASEUSDT, plus IDR-converted variants for display). Cached 10 min alongside resolvePairState.
export function getMexcUniverse(): Array<{ slug: string; base: string; quote: string; mexcSymbol: string; state: "LIVE" }> {
  const out: Array<{ slug: string; base: string; quote: string; mexcSymbol: string; state: "LIVE" }> = [];
  for (const sym of infoCache?.symbols ?? new Set<string>()) {
    if (!sym.endsWith("USDT")) continue;
    const base = sym.slice(0, -4);
    if (!base || base.includes("_") || base.includes("3L") || base.includes("3S") || base.includes("5L") || base.includes("5S")) continue; // skip leveraged tokens
    out.push({ slug: `${base}USDT`, base, quote: "USDT", mexcSymbol: sym, state: "LIVE" });
  }
  return out.sort((a, b) => a.base.localeCompare(b.base));
}

// ---------- router ----------
export function createMarketRouter(): express.Router {
  const router = express.Router();

  // health: ping + latency
  router.get("/health", async (_req: Request, res: Response) => {
    const t0 = Date.now();
    const ping = await mexc.ping();
    const latencyMs = Date.now() - t0;
    void resolvePairState().catch(() => {});
    res.json({
      ok: ping.ok,
      mexc: ping.ok ? "up" : "down",
      mexcLatencyMs: latencyMs,
      pairs: pairBySlug.size,
      live: [...pairBySlug.values()].filter((p) => p.state === "LIVE").length,
      manifestGeneratedAt: manifest.generatedAt,
      manifestStale: manifest.stale,
      simulasi: true,
      timestamp: new Date().toISOString(),
    });
  });

  // all manifest pairs + state
  router.get("/pairs", (_req, res) => {
    void resolvePairState().catch(() => {});
    res.json({
      generatedAt: manifest.generatedAt,
      stale: manifest.stale,
      static: manifest.static,
      count: pairBySlug.size,
      pairs: [...pairBySlug.values()].map(pairView),
      simulasi: true,
    });
  });

  // bulk tickers for every LIVE pair (one cached MEXC call shared by all viewers)
  router.get("/tickers", async (_req, res) => {
    try {
      const c = await cached("ticker24hr:all", MEXC_TICKER_TTL_MS, async () => {
        const r = await mexc.ticker24hr();
        if (!r.ok) return null;
        const arr = Array.isArray(r.data) ? r.data : [r.data];
        const bySym = new Map<string, unknown>();
        for (const t of arr as Array<{ symbol: string }>) bySym.set(t.symbol, t);
        return bySym;
      });
      const tickers: Record<string, unknown>[] = [];
      if (c.data) {
        for (const p of pairBySlug.values()) {
          if (!p.mexcSymbol || p.state !== "LIVE") continue;
          const t = (c.data as Map<string, any>).get(p.mexcSymbol);
          if (!t) continue;
          const q = toQuoteNum(p, parseFloat(t.lastPrice || "0"));
          tickers.push({
            slug: p.slug,
            base: p.base,
            quote: q.quote,
            indicative: q.indicative,
            mexcSymbol: p.mexcSymbol,
            state: "LIVE",
            tradable: isTradable(p),
            lastPrice: q.price,
            priceChangePercent: parseFloat(t.priceChangePercent || "0"),
            highPrice: p.quote === "IDR" ? parseFloat(t.highPrice) * getIdrRate() : parseFloat(t.highPrice),
            lowPrice: p.quote === "IDR" ? parseFloat(t.lowPrice) * getIdrRate() : parseFloat(t.lowPrice),
            quoteVolume: p.quote === "IDR" ? parseFloat(t.quoteVolume) * getIdrRate() : parseFloat(t.quoteVolume),
            stale: c.stale,
            simulasi: true,
          });
        }
      }
      if (!tickers.length && c.stale) {
        return res.status(502).json({ error: "mexc_unavailable", staleSince: c.ts ? new Date(c.ts).toISOString() : null, simulasi: true });
      }
      res.json({ count: tickers.length, tickers, stale: c.stale, staleSince: c.ts ? new Date(c.ts).toISOString() : null, usdtIdrRate: getIdrRate(), simulasi: true });
    } catch (e: any) {
      res.status(502).json({ error: "mexc_error", message: e.message, simulasi: true });
    }
  });

  // single pair ticker
  router.get("/ticker/:slug", async (req, res) => {
    const p = await resolveFlexible(String(req.params.slug));
    if (!p) return res.status(404).json({ error: "not_in_manifest", message: `Unknown pair slug: ${req.params.slug}`, simulasi: true });
    if (!p.mexcSymbol) {
      void resolvePairState().catch(() => {});
      return res.json({ ...pairView(p), state: "NO_FEED", dataState: "no-feed", message: "no live feed in simulation", simulasi: true });
    }
    const c = await cached(`ticker:${p.mexcSymbol}`, MEXC_TICKER_TTL_MS, async () => {
      const r = await mexc.ticker24hr(p.mexcSymbol!);
      return r.ok && !Array.isArray(r.data) && r.data ? (r.data as Record<string, unknown>) : null;
    });
    if (!c.data) {
      return res.status(502).json({ error: "mexc_unavailable", stale: c.stale, dataState: p.mexcSymbol ? "stale" : "no-feed", simulasi: true });
    }
    const t = c.data as any;
    const q = toQuoteNum(p, parseFloat(t.lastPrice || "0"));
    const f = (v: string) => (p.quote === "IDR" ? parseFloat(v) * getIdrRate() : parseFloat(v));
    res.json({
      ...pairView(p),
      tradable: isTradable(p),
      lastPrice: q.price,
      quote: q.quote,
      indicative: q.indicative,
      priceChangePercent: parseFloat(t.priceChangePercent || "0"),
      highPrice: f(t.highPrice),
      lowPrice: f(t.lowPrice),
      quoteVolume: f(t.quoteVolume),
      openPrice: f(t.openPrice),
      bidPrice: f(t.bidPrice),
      askPrice: f(t.askPrice),
      stale: c.stale,
      staleSince: c.stale && c.ts ? new Date(c.ts).toISOString() : null,
      simulasi: true,
    });
  });

  // order book
  router.get("/depth/:slug", async (req, res) => {
    const p = await resolveFlexible(String(req.params.slug));
    if (!p) return res.status(404).json({ error: "not_in_manifest", message: `Unknown pair slug: ${req.params.slug}`, simulasi: true });
    if (!p.mexcSymbol) return res.json({ ...pairView(p), state: "NO_FEED", dataState: "no-feed", bids: [], asks: [], simulasi: true });
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20")) || 20, 1), 500);
    const c = await cached(`depth:${p.mexcSymbol}:${limit}`, MEXC_DEPTH_TTL_MS, async () => {
      const r = await mexc.depth(p.mexcSymbol!, limit);
      return r.ok && r.data ? r.data : null;
    });
    if (!c.data) {
      return res.status(502).json({ error: "mexc_unavailable", stale: c.stale, simulasi: true });
    }
    const d = c.data as { bids: [string, string][]; asks: [string, string][] };
    const conv = (row: [string, string]): number[] => [p.quote === "IDR" ? parseFloat(row[0]) * getIdrRate() : parseFloat(row[0]), parseFloat(row[1])];
    res.json({
      ...pairView(p),
      bids: d.bids.slice(0, limit).map(conv),
      asks: d.asks.slice(0, limit).map(conv),
      stale: c.stale,
      staleSince: c.stale && c.ts ? new Date(c.ts).toISOString() : null,
      simulasi: true,
    });
  });

  // trade tape
  router.get("/trades/:slug", async (req, res) => {
    const p = await resolveFlexible(String(req.params.slug));
    if (!p) return res.status(404).json({ error: "not_in_manifest", message: `Unknown pair slug: ${req.params.slug}`, simulasi: true });
    if (!p.mexcSymbol) return res.json({ ...pairView(p), state: "NO_FEED", dataState: "no-feed", trades: [], simulasi: true });
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50")) || 50, 1), 1000);
    const c = await cached(`trades:${p.mexcSymbol}:${limit}`, MEXC_DEPTH_TTL_MS, async () => {
      const r = await mexc.trades(p.mexcSymbol!, limit);
      return r.ok && r.data ? r.data : null;
    });
    if (!c.data) return res.status(502).json({ error: "mexc_unavailable", stale: c.stale, simulasi: true });
    const trades = (c.data as any[]).map((t) => ({
      id: t.id,
      time: t.time,
      price: p.quote === "IDR" ? parseFloat(t.price) * getIdrRate() : parseFloat(t.price),
      qty: parseFloat(t.qty),
      side: t.isBuyerMaker ? "sell" : "buy", // MEXC: isBuyerMaker true => aggressive seller
    }));
    res.json({ ...pairView(p), count: trades.length, trades, stale: c.stale, simulasi: true });
  });

  // candles
  router.get("/klines/:slug", async (req, res) => {
    const p = await resolveFlexible(String(req.params.slug));
    if (!p) return res.status(404).json({ error: "not_in_manifest", message: `Unknown pair slug: ${req.params.slug}`, simulasi: true });
    if (!p.mexcSymbol) return res.json({ ...pairView(p), state: "NO_FEED", dataState: "no-feed", klines: [], simulasi: true });
    const interval = String(req.query.interval || "1m");
    const allowed = ["1m", "5m", "15m", "30m", "60m", "4h", "1d", "1M"];
    const iv = allowed.includes(interval) ? interval : "1m";
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "100")) || 100, 1), 1000);
    const ttl = iv === "1m" ? 5000 : iv === "5m" || iv === "15m" ? 15000 : 60000;
    const c = await cached(`klines:${p.mexcSymbol}:${iv}:${limit}`, ttl, async () => {
      const r = await mexc.klines(p.mexcSymbol!, iv, limit);
      return r.ok && r.data ? r.data : null;
    });
    if (!c.data) return res.status(502).json({ error: "mexc_unavailable", stale: c.stale, simulasi: true });
    const rate = getIdrRate();
    const klines = (c.data as any[]).map((k) => ({
      time: k[0],
      open: p.quote === "IDR" ? parseFloat(k[1]) * rate : parseFloat(k[1]),
      high: p.quote === "IDR" ? parseFloat(k[2]) * rate : parseFloat(k[2]),
      low: p.quote === "IDR" ? parseFloat(k[3]) * rate : parseFloat(k[3]),
      close: p.quote === "IDR" ? parseFloat(k[4]) * rate : parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
    res.json({ ...pairView(p), interval: iv, klines, stale: c.stale, simulasi: true });
  });

  // manifest static routes (for smoke parity checks)
  router.get("/manifest", (_req, res) => {
    res.json({ generatedAt: manifest.generatedAt, stale: manifest.stale, static: manifest.static, count: pairBySlug.size, simulasi: true });
  });

  // FULL MEXC universe (all tradable USDT spot symbols)
  router.get("/universe", (_req, res) => {
    void resolvePairState().catch(() => {});
    const u = getMexcUniverse();
    res.json({ count: u.length, pairs: u, simulasi: true });
  });

  return router;
}

// ---------- mock fill engine (fills against MEXC depth; ledger writes) ----------
// B8: market orders walk MEXC depth snapshot; every fill posts orders+fills+balances
// + journal_lines to ledger.db (double-entry preserved).
interface DbLike { prepare(sql: string): any; transaction(fn: () => void): () => void }
let _db: DbLike | null = null;
export function setMarketDb(db: DbLike): void { _db = db; }

const FEE_BPS = parseFloat(process.env.FEE_BPS || "10");

export async function fillMarketOrder(expr: {
  userId: string; slug: string; side: "buy" | "sell"; quantity: number;
}): Promise<{ ok: boolean; status: number; body?: Record<string, unknown>; error?: string; message?: string }> {
  if (!_db) return { ok: false, status: 500, error: "no_db", message: "market db not attached" };
  const p = await resolveFlexible(expr.slug);
  if (!p) return { ok: false, status: 404, error: "not_in_manifest", message: `Unknown pair slug: ${expr.slug}` };
  if (!p.mexcSymbol) return { ok: false, status: 409, error: "no_feed", message: "no live feed for this pair" };
  if (!(expr.quantity > 0)) return { ok: false, status: 400, error: "invalid_params", message: "quantity must be > 0" };

  // fresh depth snapshot (small limit is enough for a walk)
  const r = await mexc.depth(p.mexcSymbol, 50);
  if (!r.ok || !r.data) return { ok: false, status: 502, error: "mexc_unavailable", message: r.error };
  const bids = (r.data.bids || []).map((x) => [parseFloat(x[0]), parseFloat(x[1])] as [number, number]);
  const asks = (r.data.asks || []).map((x) => [parseFloat(x[0]), parseFloat(x[1])] as [number, number]);
  const levels = expr.side === "buy" ? asks : bids;
  if (!levels.length) return { ok: false, status: 502, error: "empty_book" };

  // walk the book for average fill price
  let remaining = expr.quantity;
  let cost = 0; // in USDT terms
  for (const [price, qty] of levels) {
    const take = Math.min(remaining, qty);
    cost += take * price;
    remaining -= take;
    if (remaining <= 1e-12) break;
  }
  if (remaining > 1e-9) {
    // shallow book: fill what we can at the last visible level
    const last = levels[levels.length - 1][0];
    cost += remaining * last;
  }
  const avgUsdt = cost / expr.quantity;

  const base = p.base;
  const usdtNotional = cost; // internal quote stays USDT
  const fee = usdtNotional * (FEE_BPS / 10_000);
  const now = Math.floor(Date.now() / 1000);
  const db = _db;
  const orderId = `ord_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const fillId = `fil_${randomBytes(12).toString("hex")}`;

  try {
    // better-sqlite3 transaction wrapper: auto-commit/rollback, no stale open tx (R1)
    db.transaction(() => {
      // order row
      db.prepare("INSERT INTO orders (id, user_id, pair, side, type, price, quantity, filled_quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'market', ?, ?, ?, 'filled', ?, ?)")
        .run(orderId, expr.userId, `${base}USDT`, expr.side, avgUsdt, expr.quantity, expr.quantity, now, now);
      // fill row
      db.prepare("INSERT INTO fills (id, order_id, user_id, pair, side, price, quantity, fee, fee_asset, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USDT', ?)")
        .run(fillId, orderId, expr.userId, `${base}USDT`, expr.side, avgUsdt, expr.quantity, fee, now);
      // ensure account exists
      let acct = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(expr.userId) as { id: string } | undefined;
      if (!acct) {
        const acctId = `acct_${randomBytes(8).toString("hex")}`;
        db.prepare("INSERT INTO accounts (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(acctId, expr.userId, "Simulasi", now, now);
        acct = { id: acctId };
      }
      const accountId = acct.id;

      // balance moves (pre-checked for funds so the whole tx rolls back on refusal)
      const creds = [
        { asset: "USDT", amount: expr.side === "buy" ? -(usdtNotional + fee) : usdtNotional - fee },
        { asset: base, amount: expr.side === "buy" ? expr.quantity : -expr.quantity },
      ];
      for (const c of creds) {
        if (c.amount === 0) continue;
        const row = db.prepare("SELECT id, available FROM balances WHERE account_id = ? AND asset = ?").get(accountId, c.asset) as { id: number; available: number } | undefined;
        if (row) {
          if (row.available + c.amount < 0) {
            throw Object.assign(new Error(`Not enough ${c.asset} (mock fill refused)`), { code: "insufficient_balance" });
          }
          db.prepare("UPDATE balances SET available = available + ? WHERE id = ?").run(c.amount, row.id);
        } else {
          if (c.amount < 0) {
            throw Object.assign(new Error(`No ${c.asset} balance (mock fill refused)`), { code: "insufficient_balance" });
          }
          db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, ?, ?, 0)").run(accountId, c.asset, c.amount);
        }
        // journal
        const jid = `fill_${fillId}_${c.asset}`;
        db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)").run(jid, now, `${expr.side} ${expr.quantity} ${base} @ ${avgUsdt}`, now);
        db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)").run(
          jid, accountId, c.asset, Math.abs(c.amount), c.amount >= 0 ? "debit" : "credit"
        );
      }
    })();
    return {
      ok: true,
      status: 201,
      body: {
        ok: true,
        orderId,
        fillId,
        pair: `${base}USDT`,
        slug: p.slug,
        side: expr.side,
        type: "market",
        quantity: expr.quantity,
        avgFillPriceUsdt: avgUsdt,
        displayedPrice: p.quote === "IDR" ? avgUsdt * getIdrRate() : avgUsdt,
        quote: p.quote,
        indicative: p.quote === "IDR",
        fee,
        simulasi: true,
      },
    };
  } catch (e: any) {
    if (e?.code === "insufficient_balance") return { ok: false, status: 409, error: "insufficient_balance", message: e.message };
    return { ok: false, status: 500, error: "fill_failed", message: e.message };
  }
}

/** Resolve pair states at startup (non-fatal if MEXC unreachable). */
export function startMarketResolution(): void {
  resolvePairState()
    .then(() => {
      const live = [...pairBySlug.values()].filter((p) => p.state === "LIVE").length;
      console.log(`[market] pairs resolved: ${pairBySlug.size} total, ${live} LIVE`);
    })
    .catch((e) => console.error(`[market] pair resolution failed: ${e.message}`));
  setInterval(() => resolvePairState().catch(() => {}), 10 * 60 * 1000);
}
