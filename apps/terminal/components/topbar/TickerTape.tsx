'use client';

// Reference-matching ticker tape: scrolling marquee of all pairs with
// up/down flash, pause/resume control, live dot + clock (tape-shell/lane/live-dot).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TickerLite } from '../../lib/use-tickers';
import { formatPrice, formatPercent } from '../../lib/format';

interface Props {
  tickers: Record<string, TickerLite>;
  ok: boolean;
  onSelectPair: (pair: string) => void;
}

export default function TickerTape({ tickers, ok, onSelectPair }: Props) {
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState('');
  const prevRef = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, 'up' | 'down' | ''>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toLocaleTimeString('en-GB', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);

  const entries = useMemo(() => Object.values(tickers), [tickers]);

  // detect flashes on price change
  useEffect(() => {
    const next: Record<string, 'up' | 'down' | ''> = {};
    for (const e of entries) {
      const prev = prevRef.current[e.symbol];
      if (prev !== undefined && e.lastPrice !== prev) {
        next[e.symbol] = e.lastPrice > prev ? 'up' : 'down';
      }
      prevRef.current[e.symbol] = e.lastPrice;
    }
    if (Object.keys(next).length) {
      setFlash(next);
      const t = setTimeout(() => setFlash({}), 600);
      return () => clearTimeout(t);
    }
  }, [entries]);

  const items = entries.length ? entries : [];

  return (
    <div className="h-8 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center shrink-0 overflow-hidden">
      {/* brand + live dot */}
      <div className="flex items-center gap-2 px-3 border-r border-[var(--border)] h-full shrink-0 z-10 bg-[var(--bg-secondary)]">
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'tape-live' : 'tape-dead'}`} />
        <span className="text-xs font-bold tracking-wider text-[var(--text-primary)]">TRADER</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Paper</span>
      </div>

      {/* scrolling tape */}
      <div className="flex-1 overflow-hidden h-full relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {items.length === 0 ? (
          <div className="h-full flex items-center px-3 text-[10px] text-[var(--text-muted)]">Waiting for market data…</div>
        ) : (
          <div className="tape-track flex items-center h-full" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
            {[...items, ...items].map((e, i) => {
              const up = e.priceChangePercent >= 0;
              const fl = i < items.length ? flash[e.symbol] : '';
              return (
                <button
                  key={`${e.symbol}-${i}`}
                  onClick={() => onSelectPair(e.symbol)}
                  className={`flex items-center gap-2 px-4 h-full border-r border-[var(--border)] whitespace-nowrap cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${fl === 'up' ? 'flash-up' : fl === 'down' ? 'flash-down' : ''}`}
                >
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{e.symbol.replace('USDT', '')}</span>
                  <span className="text-[11px] font-mono text-[var(--text-primary)]">{formatPrice(e.lastPrice)}</span>
                  <span className={`text-[10px] font-mono ${up ? 'text-gain' : 'text-loss'}`}>
                    {up ? '▲' : '▼'} {formatPercent(e.priceChangePercent)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* tape control + clock */}
      <div className="flex items-center gap-3 px-3 border-l border-[var(--border)] h-full shrink-0 z-10 bg-[var(--bg-secondary)]">
        <button
          onClick={() => setPaused(p => !p)}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer uppercase tracking-wider"
          title={paused ? 'Resume tape' : 'Pause tape'}
        >
          {paused ? '▶ Resume' : '❚❚ Pause'}
        </button>
        <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">{now}</span>
      </div>
    </div>
  );
}
