'use client';

// Shared all-pair ticker hook — one poll of /api/tickers feeds the tape,
// watchlist, gainers strip and symbol header (no per-pair polling storms).

import { useEffect, useState } from 'react';

export interface TickerLite {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  timestamp: number;
}

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

export function useTickers(intervalMs = 5000, trigger = 0): {
  tickers: Record<string, TickerLite>;
  lastUpdate: number;
  ok: boolean;
} {
  const [tickers, setTickers] = useState<Record<string, TickerLite>>({});
  const [lastUpdate, setLastUpdate] = useState(0);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/tickers`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setTickers(data);
        setLastUpdate(Date.now());
        setOk(true);
      } catch {
        if (!cancelled) setOk(false);
      }
    };
    poll();
    const t = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [intervalMs, trigger]);

  return { tickers, lastUpdate, ok };
}
