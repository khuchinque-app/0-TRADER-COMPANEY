'use client';

import { useEffect, useState } from 'react';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface OrderBookProps {
  pair: string;
}

export default function OrderBook({ pair }: OrderBookProps) {
  const [book, setBook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number>(0);

  const fetchBook = async () => {
    try {
      const res = await fetch(`${ENGINE_URL}/api/market/${pair}`);
      const data = await res.json();
      setBook(data.book);
      setTrades(data.recentFills || []);
      
      // Calculate last price from mid-price
      const asks = data.book?.asks || [];
      const bids = data.book?.bids || [];
      if (asks.length > 0 && bids.length > 0) {
        const mid = (asks[0].price + bids[0].price) / 2;
        setLastPrice(mid);
      }
    } catch (e) {
      console.error('[OrderBook] Failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
  }, [pair]);

  useEffect(() => {
    const interval = setInterval(fetchBook, 3000);
    return () => clearInterval(interval);
  }, [pair]);

  if (loading && !book) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
        Loading order book...
      </div>
    );
  }

  if (!book) return null;

  const allAsks = book.asks || [];
  const allBids = book.bids || [];
  const maxAskQty = Math.max(...allAsks.map((a: any) => a.quantity), 1);
  const maxBidQty = Math.max(...allBids.map((b: any) => b.quantity), 1);
  const maxQty = Math.max(maxAskQty, maxBidQty);

  const spread = allAsks[0]?.price && allBids[0]?.price 
    ? allAsks[0].price - allBids[0].price 
    : 0;
  const spreadPercent = lastPrice > 0 ? (spread / lastPrice * 100).toFixed(3) : '0.000';

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--cyan)]" style={{ boxShadow: '0 0 4px var(--cyan)' }}></div>
          <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Order Book</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)]">{pair}</span>
          {lastPrice > 0 && (
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-1 px-3 py-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border)]">
        <span>Price (USDT)</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Total</span>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Asks (Sells) */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
          {allAsks.slice(-10).reverse().map((ask: any, i: number) => {
            const width = (ask.quantity / maxQty) * 100;
            return (
              <div 
                key={`ask-${i}`} 
                className="grid grid-cols-3 gap-1 px-3 py-0.5 text-xs relative hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                {/* Depth bar */}
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-[var(--loss)]" 
                  style={{ width: `${width * 0.25}%`, opacity: 0.15 }} 
                />
                <span className="text-[var(--loss)] font-mono relative z-10 text-xs">
                  {ask.price.toFixed(2)}
                </span>
                <span className="text-right text-[var(--text-secondary)] font-mono relative z-10 text-xs">
                  {ask.quantity.toFixed(4)}
                </span>
                <span className="text-right text-[var(--text-muted)] font-mono relative z-10 text-xs">
                  {(ask.price * ask.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Spread / Mid Price */}
        <div className="py-1.5 text-center border-y border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
              {lastPrice > 0 ? lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Spread: {spread.toFixed(2)} ({spreadPercent}%)
            </span>
          </div>
        </div>

        {/* Bids (Buys) */}
        <div className="flex-1 overflow-hidden">
          {allBids.slice(0, 10).map((bid: any, i: number) => {
            const width = (bid.quantity / maxQty) * 100;
            return (
              <div 
                key={`bid-${i}`} 
                className="grid grid-cols-3 gap-1 px-3 py-0.5 text-xs relative hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                {/* Depth bar */}
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-[var(--gain)]" 
                  style={{ width: `${width * 0.25}%`, opacity: 0.15 }} 
                />
                <span className="text-[var(--gain)] font-mono relative z-10 text-xs">
                  {bid.price.toFixed(2)}
                </span>
                <span className="text-right text-[var(--text-secondary)] font-mono relative z-10 text-xs">
                  {bid.quantity.toFixed(4)}
                </span>
                <span className="text-right text-[var(--text-muted)] font-mono relative z-10 text-xs">
                  {(bid.price * bid.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border)] bg-[var(--bg-primary)]">
            Recent Trades
          </div>
          <div className="max-h-32 overflow-y-auto">
            {trades.slice(-8).reverse().map((trade: any, i: number) => (
              <div 
                key={i} 
                className="grid grid-cols-3 gap-1 px-3 py-0.5 text-xs hover:bg-[var(--bg-hover)]"
              >
                <span className={trade.side === 'buy' ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                  {trade.price.toFixed(2)}
                </span>
                <span className="text-right text-[var(--text-secondary)] font-mono text-xs">
                  {trade.quantity.toFixed(4)}
                </span>
                <span className="text-right text-[var(--text-muted)] font-mono text-xs">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
