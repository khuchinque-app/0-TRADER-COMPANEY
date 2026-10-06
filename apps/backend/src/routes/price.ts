// T04: Reference price feed HTTP routes (USDT quote).
//   GET /api/price/:symbol          -> last cached tick { symbol, pair, quote, price, source, ts }
//   GET /api/price/:symbol/history  -> 1m candle history (>= 30 candles, OHLC)
// Unknown symbols -> 404 { error: { code, message } } (matches project error convention).

import { Router } from "express";
import { SUPPORTED_SYMBOLS, isSymbol } from "../pricefeed/adapter";
import { priceFeed } from "../pricefeed/service";

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
  const { candles, source, ts } = priceFeed.getHistory(raw);
  res.json({
    symbol: raw,
    pair: `${raw}USDT`,
    quote: "USDT",
    interval: "1m",
    source,
    updatedAt: ts,
    count: candles.length,
    candles,
    simulasi: true,
  });
});

export const createPriceRouter = () => router;
