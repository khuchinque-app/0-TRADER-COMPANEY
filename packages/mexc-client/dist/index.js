"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mexc = void 0;
// @trading/mexc-client — thin wrapper over MEXC PUBLIC spot market-data REST API.
// HARD RULE: public endpoints ONLY. No apiKey/apiSecret parameters exist anywhere
// in this module. Orders are matched by OUR engine against ledger.db.
const BASE = process.env.MEXC_BASE_URL || "https://api.mexc.com/api/v3";
async function get(path, params, timeoutMs = 8000) {
    let qs = "";
    if (params) {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined)
                usp.set(k, String(v));
        }
        qs = usp.toString();
        if (qs)
            qs = "?" + qs;
    }
    const url = `${BASE}${path}${qs}`;
    try {
        const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!r.ok) {
            return { ok: false, status: r.status, data: null, error: `HTTP ${r.status}` };
        }
        return { ok: true, status: 200, data: (await r.json()) };
    }
    catch (e) {
        return { ok: false, status: 0, data: null, error: e?.message || "network_error" };
    }
}
// ---------- public endpoint wrapper ----------
exports.mexc = {
    /** GET /ping — health */
    ping: () => get("/ping"),
    /** GET /time — server time */
    time: () => get("/time"),
    /** GET /exchangeInfo — pair universe */
    exchangeInfo: (symbols) => get("/exchangeInfo", symbols ? { symbols: JSON.stringify(symbols) } : undefined, 12000),
    /** GET /ticker/24hr — bulk or single */
    ticker24hr: (symbol) => get("/ticker/24hr", { symbol }),
    /** GET /ticker/price — last price bulk or single */
    tickerPrice: (symbol) => get("/ticker/price", { symbol }),
    /** GET /ticker/bookTicker — best bid/ask bulk or single */
    bookTicker: (symbol) => get("/ticker/bookTicker", { symbol }),
    /** GET /depth — order book */
    depth: (symbol, limit = 100) => get("/depth", { symbol, limit: Math.min(Math.max(limit, 1), 5000) }),
    /** GET /trades — recent trade tape (limit <= 1000) */
    trades: (symbol, limit = 50) => get("/trades", { symbol, limit: Math.min(Math.max(limit, 1), 1000) }),
    /** GET /aggTrades */
    aggTrades: (symbol, limit = 50) => get("/aggTrades", { symbol, limit: Math.min(Math.max(limit, 1), 1000) }),
    /** GET /klines — candles */
    klines: (symbol, interval, limit = 100) => get("/klines", { symbol, interval, limit: Math.min(Math.max(limit, 1), 1000) }),
    /** GET /avgPrice */
    avgPrice: (symbol) => get("/avgPrice", { symbol }),
};
exports.default = exports.mexc;
