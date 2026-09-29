// FeedAdapter interface — seam #1
// All providers implement this; engine consumes only TickEvent streams

import type { TickEvent, Candle, OrderBook, Ticker } from '@trading/shared';

export interface FeedAdapter {
  /** Fetch historical klines (candlesticks) */
  fetchKlines(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  
  /** Fetch current 24h ticker stats */
  fetchTicker(symbol: string): Promise<Ticker>;
  
  /** Fetch order book snapshot */
  fetchOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  
  /** Start receiving real-time tick events (trades) */
  onTick(callback: (event: TickEvent) => void): () => void;
  
  /** Cleanly shut down the feed connection */
  close(): void;
}
