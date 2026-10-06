// T07: Market trades tape — the venue's recent-fill scroll.
// Consumes the backend endpoint GET /api/trades/:symbol (Next.js /api rewrite)
// which returns the 50 most recent trades per symbol — synthetic ticks derived
// from the price feed plus real user ledger fills (flagged mine: true).
// Rows: time, price, size, side-colored; scrollable, newest first.

'use client';

import { useEffect, useState } from 'react';
import { fetchTrades, TapeTrade } from '../../app/trade/[pair]/api';

interface Props {
  symbol: string; // base asset, e.g. "BTC"
}

const POLL_MS = 5000;

export default function MarketTrades({ symbol }: Props) {
  const [trades, setTrades] = useState<TapeTrade[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTrades(symbol)
        .then((rows) => !cancelled && setTrades(rows))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol]);

  if (trades.length === 0) {
    return (
      <div className="p-3 text-[var(--text-muted)] text-xs">No trades yet</div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between text-gray-500 px-2 pb-1 text-xs font-medium">
        <span>Price (USDT)</span>
        <span>Amount ({symbol})</span>
        <span>Time</span>
      </div>
      {/* Scrolling tape: newest trade at the top, older rows scroll up/out */}
      <div className="max-h-96 overflow-y-auto space-y-px text-sm">
        {trades.map((t) => (
          <div
            key={t.id}
            className={`flex justify-between px-2 py-0.5 items-center rounded ${
              t.side === 'buy' ? 'text-[var(--gain)]' : 'text-[var(--loss)]'
            } ${t.mine ? 'bg-[#f7931a]/10' : ''}`}
          >
            <span className="font-mono">{t.price.toLocaleString('en-US', { maximumFractionDigits: 8 })}</span>
            <span className="font-mono text-gray-300">
              {t.size.toLocaleString('en-US', { maximumFractionDigits: 8 })}
            </span>
            <span className="text-gray-500 font-mono text-xs">
              {new Date(t.time).toLocaleTimeString('en-US', { hour12: false })}
              {t.mine ? <span className="ml-1 text-[#f7931a] font-bold">MY</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
