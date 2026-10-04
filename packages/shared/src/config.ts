// Configuration constants for the paper-trading venue
// Single source of truth — imported by both engine and terminal

import { Asset, Pair } from './domain';

// Asset shortlist (verified liquid on Binance + Bybit per data-feasibility.md)
export const ASSET_SHORTLIST: Asset[] = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'LINK', 'AAVE'];

export const PAIRS: Pair[] = ASSET_SHORTLIST.map(a => `${a}USDT`) as Pair[];

// Fee schedule (flat maker/taker)
export const FEE_SCHEDULE = {
  maker: 0.001,  // 0.1%
  taker: 0.002,  // 0.2%
};

// Timeframes supported (in minutes, as string keys for chart lib)
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
export type Timeframe = typeof TIMEFRAMES[number];

// Demo funds constant
export const DEMO_FUNDS_USDT = 100_000;

// Default demo allocation per asset (even split across USDT + all assets)
export const DEMO_ALLOCATION: Record<Asset, number> = {
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
export const COLOR_CONVENTION = 'green-up' as 'green-up' | 'red-up';

// Data provider URLs (keyless, public market data)
export const FEED_URLS = {
  binance: {
    rest: 'https://data-api.binance.vision',
    ws: 'wss://stream.binance.com:9443',
  },
  bybit: {
    rest: 'https://api.bybit.com',
    ws: 'wss://stream.bybit.com/v5/public/spot',
  },
  fx: 'https://open.er-api.com/v6/latest/USD',
} as const;

// WebSocket reconnect settings
export const WS_CONFIG = {
  reconnectDelayMs: 1000,
  maxReconnectDelayMs: 30000,
  heartbeatIntervalMs: 30000,
};

// Reference data disclaimer text (load-bearing per ADR 0002)
export const DISCLAIMER_TEXT = 'Reference data · Demo only · Not a real venue · Not financial advice';

// Server ports
export const ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);
export const TERMINAL_PORT = parseInt(process.env.TERMINAL_PORT || '3000', 10);

// FX cache TTL (seconds)
export const FX_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

// Indodax FX source settings
export const INDODAX_BASE_URL = process.env.INDODAX_BASE_URL || 'https://api.indodax.com';
export const FX_SOURCE = process.env.FX_SOURCE || 'indodax'; // 'indodax' | 'fallback'
export const FX_TTL_MS = parseInt(process.env.FX_TTL_MS || '600000', 10); // 10 minutes
export const FX_STALE_MAX_MS = parseInt(process.env.FX_STALE_MAX_MS || '1800000', 10); // 30 minutes
