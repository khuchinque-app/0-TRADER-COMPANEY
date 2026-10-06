// T04: Reference price feed HTTP routes (USDT quote).
//   GET /api/price/:symbol          -> last cached tick { symbol, pair, quote, price, source, ts }
//   GET /api/price/:symbol/history  -> 1m candle history (>= 30 candles, OHLC)
//   GET /api/book/:symbol           -> T05 synthetic order book (15 bids + 15 asks around the mid)
// Unknown symbols -> 404 { error: { code, message } } (matches project error convention).

import { Router } from "express";
import { SUPPORTED_SYMBOLS, isSymbol } from "../pricefeed/adapter";
import { priceFeed } from "../pricefeed/service";
import { getBook } from "../pricefeed/book";
import { INTERVALS, IntervalId, intervalMs } from "../pricefeed/service";

const router = Router();

router.get("/api/price/:symbol", (req, res) => {
  const raw = String(req.params.symbol || "").toUpperCase();
  if (!isSymbol(raw)) {
    return res.status(404).json({
      error: { code: "unknown_symbol", message: `Unknown symbol: ${raw}. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` },
    });
  }
  const tick = priceFeed.getPrice(raw);
  res.json({ ...tick, simulasi: true });
});

router.get("/api/price/:symbol/history", (req, res) => {
  const raw = String(req.params.symbol || "").toUpperCase();
  if (!isSymbol(raw)) {
    return res.status(404).json({
      error: { code: "unknown_symbol", message: `Unknown symbol: ${raw}. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` },
    });
  }
  const iv = (String(req.query.interval || "1m")).toLowerCase();
  if (!intervalMs(iv)) {
    return res.status(400).json({
      error: { code: "invalid_interval", message: `interval must be one of: ${INTERVALS.join(", ")}` },
    });
  }
  const { candles, source, ts, interval } = priceFeed.getHistory(raw, iv as IntervalId);
  res.json({
    symbol: raw,
    pair: `${raw}USDT`,
    quote: "USDT",
    interval,
    source,
    updatedAt: ts,
    count: candles.length,
    candles,
    simulasi: true,
  });
});

// T05: Synthetic order book around the reference mid (15 bids + 15 asks).
// Accepts a symbol ("BTC") or a full pair ("BTCUSDT", "BTCIDR") and always
// quotes in USDT (the internal ledger quote). Refreshes with the price feed.
router.get("/api/book/:symbol", (req, res) => {
  const raw = String(req.params.symbol || "").toUpperCase();
  const base = raw.endsWith("USDT") || raw.endsWith("IDR") ? raw.slice(0, -4) : raw;
  if (!isSymbol(base)) {
    return res.status(404).json({
      error: { code: "unknown_symbol", message: `Unknown symbol: ${raw}. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` },
    });
  }
  res.json({ ...getBook(base), simulasi: true });
});

export const createPriceRouter = () => router;
