// API Client - Single source of truth for engine communication
// REST endpoints + WebSocket integration

import { PAIRS } from '@trading/shared';
import type { Pair, Ticker, OrderBook, Candle, Fill, JournalEntry, Balance, DemoAccount } from '@trading/shared';

const DEFAULT_ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';
const FETCH_TIMEOUT_MS = 3000;

// Mock data fallback for when engine is unavailable
const MOCK_TICKERS: Record<string, Ticker> = {
  BTCUSDT: { symbol: 'BTCUSDT', lastPrice: 65000, priceChange: 1200, priceChangePercent: 1.88, highPrice: 66500, lowPrice: 64200, volume: 12500, quoteVolume: 812500000, timestamp: Date.now() },
  ETHUSDT: { symbol: 'ETHUSDT', lastPrice: 3500, priceChange: 80, priceChangePercent: 2.34, highPrice: 3580, lowPrice: 3420, volume: 45000, quoteVolume: 157500000, timestamp: Date.now() },
  SOLUSDT: { symbol: 'SOLUSDT', lastPrice: 145, priceChange: -3, priceChangePercent: -2.03, highPrice: 152, lowPrice: 142, volume: 120000, quoteVolume: 17400000, timestamp: Date.now() },
  BNBUSDT: { symbol: 'BNBUSDT', lastPrice: 600, priceChange: 15, priceChangePercent: 2.56, highPrice: 615, lowPrice: 585, volume: 8500, quoteVolume: 5100000, timestamp: Date.now() },
  XRPUSDT: { symbol: 'XRPUSDT', lastPrice: 0.62, priceChange: 0.01, priceChangePercent: 1.64, highPrice: 0.64, lowPrice: 0.60, volume: 5000000, quoteVolume: 3100000, timestamp: Date.now() },
  LINKUSDT: { symbol: 'LINKUSDT', lastPrice: 18, priceChange: 0.5, priceChangePercent: 2.86, highPrice: 18.8, lowPrice: 17.2, volume: 250000, quoteVolume: 4500000, timestamp: Date.now() },
  AAVEUSDT: { symbol: 'AAVEUSDT', lastPrice: 180, priceChange: -5, priceChangePercent: -2.70, highPrice: 190, lowPrice: 175, volume: 15000, quoteVolume: 2700000, timestamp: Date.now() },
};

export class APIClient {
  private engineUrl: string;

  constructor(engineUrl: string = DEFAULT_ENGINE_URL) {
    this.engineUrl = engineUrl;
  }

  // Helper: fetch with timeout
  private async fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  // Market data
  async fetchMarketSnapshot(pair: Pair): Promise<{
    pair: string;
    book: OrderBook;
    ticker: Ticker | null;
    klines: Candle[];
    recentFills: Fill[];
  }> {
    try {
      const res = await this.fetchWithTimeout(`${this.engineUrl}/api/market/${pair}`);
      if (!res.ok) throw new Error(`Failed to fetch market data for ${pair}`);
      return res.json();
    } catch {
      // Return mock data on failure
      const ticker = MOCK_TICKERS[pair as keyof typeof MOCK_TICKERS] || null;
      return {
        pair,
        book: { symbol: pair, asks: [], bids: [], timestamp: Date.now() },
        ticker,
        klines: [],
        recentFills: [],
      };
    }
  }

  async fetchKlines(pair: Pair, interval: string = '1m', limit: number = 100): Promise<Candle[]> {
    // Engine serves klines inline on the market snapshot (no /klines route)
    const res = await fetch(`${this.engineUrl}/api/market/${pair}`);
    if (!res.ok) throw new Error('Failed to fetch klines');
    const data = await res.json();
    return (data.klines || []).slice(-limit);
  }

  async fetchTicker(pair: Pair): Promise<Ticker | null> {
    const res = await fetch(`${this.engineUrl}/api/market/${pair}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ticker;
  }

  async fetchOrderBook(pair: Pair, depth: number = 20): Promise<OrderBook> {
    const res = await fetch(`${this.engineUrl}/api/market/${pair}`);
    if (!res.ok) throw new Error('Failed to fetch order book');
    const data = await res.json();
    return data.book;
  }

  // Account/Ledger
  async fetchAccount(userId: string): Promise<DemoAccount | null> {
    try {
      const res = await fetch(`${this.engineUrl}/api/ledger/${userId}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async fetchJournal(userId: string, limit: number = 50): Promise<JournalEntry[]> {
    try {
      const res = await fetch(`${this.engineUrl}/api/ledger/${userId}/journal?limit=${limit}`);
      if (!res.ok) return [];
      // Engine returns a bare JournalEntry[] (rest.ts), not {journal: [...]}
      const data = await res.json();
      return Array.isArray(data) ? data : (data.journal || []);
    } catch {
      return [];
    }
  }

  // FX Rate
  async fetchFXRate(): Promise<number | null> {
    try {
      const res = await fetch(`${this.engineUrl}/api/fx`);
      if (!res.ok) return null;
      // Engine returns { rate: { usdToIdr, fetchedAt } } — pull the number
      const data = await res.json();
      return typeof data?.rate?.usdToIdr === 'number' ? data.rate.usdToIdr : null;
    } catch {
      return null;
    }
  }

  // All pairs
  async fetchAllTickers(): Promise<Map<Pair, Ticker>> {
    const result = new Map<Pair, Ticker>();
    for (const pair of PAIRS) {
      const ticker = await this.fetchTicker(pair).catch(() => null);
      if (ticker) {
        result.set(pair, ticker);
      }
    }
    return result;
  }

  // Get base URL
  getBaseUrl(): string {
    return this.engineUrl;
  }
}

// Singleton instance
let client: APIClient | null = null;

export function getAPIClient(engineUrl?: string): APIClient {
  if (!client || engineUrl) {
    client = new APIClient(engineUrl);
  }
  return client;
}
