// T2: Binance Feed Adapter — seam #1
// Implements FeedAdapter interface using Binance public market data APIs
// With resilience: heartbeat, exponential backoff, snapshot cache for REST endpoints

import { WebSocket } from 'ws';
import type {
  TickEvent,
  Candle,
  OrderBook,
  Ticker,
} from '@trading/shared';
import { FEED_URLS } from '@trading/shared';
import type { FeedAdapter } from './feed';

interface BinanceKlineResponse {
  [0]: number;   // open time
  [1]: string;   // open
  [2]: string;   // high
  [3]: string;   // low
  [4]: string;   // close
  [5]: string;   // volume
  [6]: number;   // close time
  [7]: string;   // quote volume
  [8]: number;   // trades
  [9]: string;   // taker base volume
  [10]: string;  // taker quote volume
  [11]: string;  // ignore
}

interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface BinanceOrderBookResponse {
  lastUpdateId: number;
  asks: [string, string][];
  bids: [string, string][];
}

interface BinanceTradeEvent {
  e: string;  // event type: "trade"
  E: number;  // event time
  s: string;  // symbol
  t: number;  // trade id
  p: string;  // price
  q: string;  // quantity
  b: number;  // buyer order id
  a: number;  // seller order id
  T: number;  // trade time
  m: boolean; // is the buyer the market maker?
}

export class BinanceFeed implements FeedAdapter {
  private ws: WebSocket | null = null;
  private eventSubscribers: Array<(event: TickEvent) => void> = [];
  private baseUrl: string;

  // Snapshot caches so REST endpoints always work even when WS is disconnected
  private tickerCache: Map<string, Ticker> = new Map();
  private klinesCache: Map<string, Candle[]> = new Map();

  // Reconnection state
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manuallyClosed = false;
  private readonly maxReconnectDelay = 30_000;
  private readonly baseReconnectDelay = 1_000;

  // Latest tick timestamp per symbol (out-of-order guard)
  private lastTickTs: Map<string, number> = new Map();

  // Heartbeat state
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatInterval = 20_000; // 20s ping interval

  // REST cache refresh state (keeps klines/ticker fresh after boot)
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly refreshInterval = 60_000; // 60s

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || FEED_URLS.binance.rest;
  }

  async fetchKlines(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance klines fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BinanceKlineResponse[];

    return data.map(row => ({
      openTime: row[0],
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
      quoteVolume: parseFloat(row[7]),
      trades: row[8],
    }));
  }

  async fetchTicker(symbol: string): Promise<Ticker> {
    const url = `${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance ticker fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BinanceTickerResponse;

    return {
      symbol: data.symbol,
      lastPrice: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      timestamp: data.closeTime,
    };
  }

  async fetchOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const url = `${this.baseUrl}/api/v3/depth?symbol=${symbol}&limit=${depth}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance orderbook fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BinanceOrderBookResponse;

    return {
      symbol,
      asks: data.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      bids: data.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      timestamp: Date.now(),
    };
  }

  onTick(callback: (event: TickEvent) => void): () => void {
    this.eventSubscribers.push(callback);

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.eventSubscribers = this.eventSubscribers.filter(sub => sub !== callback);

      if (this.eventSubscribers.length === 0) {
        this.close();
      }
    };
  }

  /** Public getters for REST layer — keep cache warm */
  getTicker(symbol: string): Ticker | null {
    return this.tickerCache.get(symbol) ?? null;
  }

  getKlines(symbol: string): Candle[] {
    return this.klinesCache.get(symbol) ?? [];
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null; // we own the shutdown; suppress reconnect path
      ws.close();
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.stopRefreshLoop();
  }

  private connect(): void {
    // Subscribe to all trade streams for the supported symbols
    const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'linkusdt', 'aaveusdt'];
    const streams = symbols.map((s) => `${s}@trade`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      console.log('[BinanceFeed] Connected to WebSocket');
      this.startHeartbeat();
      this.refreshCache();
      this.startRefreshLoop();
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data as string);
        // Combined-stream endpoint wraps events: {stream: "btcusdt@trade", data: {...}}.
        // Unwrap before dispatching, or NO tick ever reaches subscribers
        // (book mid and live price freeze at seed values).
        const data = (raw && raw.data && typeof raw.data === 'object') ? raw.data : raw;

        // Handle trade events
        if (data.e === 'trade') {
          const trade: BinanceTradeEvent = data;
          const price = parseFloat(trade.p);

          // Drop stale/out-of-order ticks: never move the mid backwards in time
          const lastTick = this.lastTickTs.get(trade.s) ?? 0;
          if (trade.E < lastTick) return;
          this.lastTickTs.set(trade.s, trade.E);

          const tickEvent: TickEvent = {
            symbol: trade.s,
            price,
            quantity: parseFloat(trade.q),
            timestamp: trade.E,
            isBuyerMaker: trade.m,
          };

          this.eventSubscribers.forEach(sub => sub(tickEvent));

          // Update ONLY lastPrice on the cached ticker — keep the real 24h
          // stats from refreshCache() (clobbering high/low/volume with a
          // single trade's values was reporting one trade as the 24h volume)
          const cached = this.tickerCache.get(trade.s);
          if (cached) {
            cached.lastPrice = price;
            cached.timestamp = trade.E;
          } else {
            this.tickerCache.set(trade.s, {
              symbol: trade.s,
              lastPrice: price,
              priceChange: 0,
              priceChangePercent: 0,
              highPrice: price,
              lowPrice: price,
              volume: 0,
              quoteVolume: 0,
              timestamp: trade.E,
            });
          }
        }
      } catch (error) {
        console.error('[BinanceFeed] Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[BinanceFeed] WebSocket error:', (error as unknown as Event).type);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.manuallyClosed) {
        console.log('[BinanceFeed] Connection closed (manual).');
        return;
      }
      console.log('[BinanceFeed] Connection closed, attempting reconnect...');
      this.scheduleReconnect();
    };
  }

  /** Start periodic ping to keep connection alive */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Periodic REST cache refresh so served klines never go stale */
  private startRefreshLoop(): void {
    if (this.refreshTimer) return; // reconnects re-enter here; keep one loop
    this.refreshTimer = setInterval(() => {
      this.refreshCache();
    }, this.refreshInterval);
  }

  private stopRefreshLoop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /** Schedule reconnect with exponential backoff */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    if (this.eventSubscribers.length === 0) return; // No subscribers, don't reconnect

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectDelay
    );
    this.reconnectAttempt++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log(`[BinanceFeed] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})...`);
      this.connect();
    }, delay);
  }

  /** Warm up REST caches from Binance API */
  private async refreshCache(): Promise<void> {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'LINKUSDT', 'AAVEUSDT'];
    for (const sym of symbols) {
      try {
        const ticker = await this.fetchTicker(sym);
        this.tickerCache.set(sym, ticker);
      } catch {
        // Ignore cache miss failures
      }
      try {
        const klines = await this.fetchKlines(sym, '1m', 100);
        this.klinesCache.set(sym, klines);
      } catch {
        // Ignore cache miss failures
      }
    }
  }
}
