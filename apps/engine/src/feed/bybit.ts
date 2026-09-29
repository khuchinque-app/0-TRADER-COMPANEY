// Bybit Feed Adapter — fallback/alternative to Binance
// Implements FeedAdapter interface using Bybit public market data APIs

import type {
  TickEvent,
  Candle,
  OrderBook,
  Ticker,
} from '@trading/shared';
import { FEED_URLS } from '@trading/shared';
import type { FeedAdapter } from './feed';

interface BybitTickerResponse {
  retCode: number;
  result: {
    list: Array<{
      symbol: string;
      lastPrice: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
      volume24h: string;
      turnover24h: string;
      timestamp: number;
    }>;
  };
}

interface BybitKlineResponse {
  retCode: number;
  retMsg?: string;
  result: {
    list: Array<string[]>;
  };
}

interface BybitDepthResponse {
  retCode: number;
  retMsg?: string;
  result: {
    s: string;
    b: Array<string[]>;
    a: Array<string[]>;
  };
}

export class BybitFeed implements FeedAdapter {
  private ws: WebSocket | null = null;
  private eventSubscribers: Array<(event: TickEvent) => void> = [];
  private baseUrl: string;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || FEED_URLS.bybit.rest;
  }

  async fetchKlines(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
    // Bybit uses different symbol format (BTCUSDT vs BTC/USDT)
    const bybitSymbol = symbol.replace('USDT', 'USDT');
    const intervalMap: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1D': 'D',
    };
    const bybitInterval = intervalMap[interval] || '1';
    
    const url = `${this.baseUrl}/v5/market/klines?category=spot&symbol=${bybitSymbol}&interval=${bybitInterval}&limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit klines fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as BybitKlineResponse;
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data.result.list.map(row => ({
      openTime: parseInt(row[0]),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
      quoteVolume: parseFloat(row[6]),
      trades: 0, // Bybit doesn't provide trade count in klines
    }));
  }

  async fetchTicker(symbol: string): Promise<Ticker> {
    const url = `${this.baseUrl}/v5/market/tickers?category=spot&symbol=${symbol}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit ticker fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as BybitTickerResponse;
    
    if (data.retCode !== 0 || !data.result.list.length) {
      throw new Error('Bybit ticker not found');
    }
    
    const ticker = data.result.list[0];
    
    return {
      symbol: symbol,
      lastPrice: parseFloat(ticker.lastPrice),
      priceChange: parseFloat(ticker.lastPrice) * parseFloat(ticker.price24hPcnt),
      priceChangePercent: parseFloat(ticker.price24hPcnt) * 100,
      highPrice: parseFloat(ticker.highPrice24h),
      lowPrice: parseFloat(ticker.lowPrice24h),
      volume: parseFloat(ticker.volume24h),
      quoteVolume: parseFloat(ticker.turnover24h),
      timestamp: Number(ticker.timestamp),
    };
  }

  async fetchOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const url = `${this.baseUrl}/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${depth}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit orderbook fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as BybitDepthResponse;
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return {
      symbol,
      asks: data.result.a.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      bids: data.result.b.map(([price, quantity]) => ({
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
    
    return () => {
      this.eventSubscribers = this.eventSubscribers.filter(sub => sub !== callback);
      
      if (this.eventSubscribers.length === 0) {
        this.close();
      }
    };
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private connect(): void {
    const wsUrl = FEED_URLS.bybit.ws;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[BybitFeed] Connected to WebSocket');
      // Subscribe to trade topics
      this.ws?.send(JSON.stringify({
        op: 'subscribe',
        args: [{ topic: 'publicTrade.spot' }]
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        
        // Handle trade events
        if (data.topic === 'publicTrade.spot' && data.data) {
          const trade = data.data[0];
          const tickEvent: TickEvent = {
            symbol: trade.s,
            price: parseFloat(trade.p),
            quantity: parseFloat(trade.v),
            timestamp: parseInt(trade.T),
            isBuyerMaker: trade.M === 'False',
          };
          
          this.eventSubscribers.forEach(sub => sub(tickEvent));
        }
      } catch (error) {
        console.error('[BybitFeed] Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[BybitFeed] WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('[BybitFeed] Connection closed, attempting reconnect...');
      this.reconnectTimeout = setTimeout(() => {
        if (this.eventSubscribers.length > 0) {
          this.connect();
        }
      }, 5000);
    };
  }
}
