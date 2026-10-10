"use strict";
// Configuration constants for the paper-trading venue
// Single source of truth — imported by both engine and terminal
Object.defineProperty(exports, "__esModule", { value: true });
exports.FX_STALE_MAX_MS = exports.FX_TTL_MS = exports.FX_SOURCE = exports.INDODAX_BASE_URL = exports.FX_CACHE_TTL_SECONDS = exports.TERMINAL_PORT = exports.ENGINE_PORT = exports.DISCLAIMER_TEXT = exports.WS_CONFIG = exports.FEED_URLS = exports.COLOR_CONVENTION = exports.DEMO_ALLOCATION = exports.DEMO_FUNDS_USDT = exports.TIMEFRAMES = exports.FEE_SCHEDULE = exports.PAIRS = exports.ASSET_SHORTLIST = void 0;
// Asset shortlist (verified liquid on Binance + Bybit per data-feasibility.md)
exports.ASSET_SHORTLIST = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'LINK', 'AAVE'];
exports.PAIRS = exports.ASSET_SHORTLIST.map(a => `${a}USDT`);
// Fee schedule (flat maker/taker)
exports.FEE_SCHEDULE = {
    maker: 0.001, // 0.1%
    taker: 0.002, // 0.2%
};
// Timeframes supported (in minutes, as string keys for chart lib)
exports.TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];
// Demo funds constant
exports.DEMO_FUNDS_USDT = 100_000;
// Default demo allocation per asset (even split across USDT + all assets)
exports.DEMO_ALLOCATION = {
    BTC: 0.5,
    ETH: 5,
    SOL: 50,
    BNB: 5,
    XRP: 10000,
    LINK: 100,
    AAVE: 10,
};
// Color convention flag (see CONTEXT.md)
// green-up = Western convention (recommended for crypto parity)
// red-up = Indonesian/Chinese convention
exports.COLOR_CONVENTION = 'green-up';
// Data provider URLs (keyless, public market data)
exports.FEED_URLS = {
    binance: {
        rest: 'https://data-api.binance.vision',
        ws: 'wss://stream.binance.com:9443',
    },
    bybit: {
        rest: 'https://api.bybit.com',
        ws: 'wss://stream.bybit.com/v5/public/spot',
    },
    fx: 'https://open.er-api.com/v6/latest/USD',
};
// WebSocket reconnect settings
exports.WS_CONFIG = {
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
    heartbeatIntervalMs: 30000,
};
// Reference data disclaimer text (load-bearing per ADR 0002)
exports.DISCLAIMER_TEXT = 'Reference data · Demo only · Not a real venue · Not financial advice';
// Server ports
exports.ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);
exports.TERMINAL_PORT = parseInt(process.env.TERMINAL_PORT || '3000', 10);
// FX cache TTL (seconds)
exports.FX_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours
// Indodax FX source settings
exports.INDODAX_BASE_URL = process.env.INDODAX_BASE_URL || 'https://api.indodax.com';
exports.FX_SOURCE = process.env.FX_SOURCE || 'indodax'; // 'indodax' | 'fallback'
exports.FX_TTL_MS = parseInt(process.env.FX_TTL_MS || '600000', 10); // 10 minutes
exports.FX_STALE_MAX_MS = parseInt(process.env.FX_STALE_MAX_MS || '1800000', 10); // 30 minutes
//# sourceMappingURL=config.js.map