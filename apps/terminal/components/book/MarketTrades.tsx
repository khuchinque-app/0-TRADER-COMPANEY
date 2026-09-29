// MarketTrades component - recent fill "tape"
// Shows recent trades with price, size, time, colored by side

'use client';

import { useEffect, useState } from 'react';
import type { Fill } from '@trading/shared';

interface Props {
  pair: string;
}

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

export default function MarketTrades({ pair }: Props) {
  const [fills, setFills] = useState<Fill[]>([]);

  useEffect(() => {
    // Fetch recent fills
    const fetchFills = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/market/${pair}`);
        const data = await res.json();
        if (data.recentFills) {
          setFills(data.recentFills);
        }
      } catch (e) {
        console.error('Failed to fetch fills:', e);
      }
    };

    fetchFills();

    // Refresh every 5 seconds
    const interval = setInterval(fetchFills, 5000);
    return () => clearInterval(interval);
  }, [pair]);

  if (fills.length === 0) {
    return (
      <div className="p-3 text-[var(--text-muted)] text-xs">No trades yet</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--border)] flex justify-between items-center">
        <span className="text-xs text-[var(--text-secondary)] font-mono">TAPE</span>
        <span className="text-xs text-[var(--text-muted)]">{fills.length} trades</span>
      </div>
      <div className="flex-1 overflow-auto">
        {fills.map((fill) => (
          <div
            key={fill.id}
            className={`px-3 py-1.5 border-b border-[var(--border)] flex justify-between items-center text-xs ${
              fill.side === 'buy' ? 'text-[var(--gain)]' : 'text-[var(--loss)]'
            }`}
          >
            <span className="font-mono">${fill.price.toFixed(2)}</span>
            <span className="font-mono text-[var(--text-secondary)]">{fill.quantity.toFixed(4)}</span>
            <span className="text-[var(--text-muted)]">
              {new Date(fill.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
