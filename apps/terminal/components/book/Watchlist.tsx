'use client';

// Right-rail watchlist (reference: wlist / wrow / wsearch / wtabs):
// searchable pair list with price, %chg chip, sparkline-free compact rows.

import { useMemo, useState } from 'react';
import { PAIRS } from '@trading/shared';
import type { TickerLite } from '../../lib/use-tickers';
import { formatPrice, formatPercent, shortenNumber } from '../../lib/format';

interface Props {
  tickers: Record<string, TickerLite>;
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

export default function Watchlist({ tickers, selectedPair, onSelectPair }: Props) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'gainers' | 'losers'>('all');

  const rows = useMemo(() => {
    let list = PAIRS.map(p => tickers[p]).filter(Boolean);
    if (tab === 'gainers') list = list.filter(t => t.priceChangePercent >= 0);
    if (tab === 'losers') list = list.filter(t => t.priceChangePercent < 0);
    if (q.trim()) {
      const needle = q.trim().toUpperCase();
      list = list.filter(t => t.symbol.includes(needle));
    }
    return list.sort((a, b) => b.quoteVolume - a.quoteVolume);
  }, [tickers, q, tab]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-2 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search market"
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--cyan)] placeholder:text-[var(--text-muted)]"
        />
        <div className="flex gap-1">
          {(['all', 'gainers', 'losers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-0.5 text-[10px] uppercase tracking-wide rounded cursor-pointer transition-colors ${tab === t ? 'bg-[var(--cyan-dim)] text-cyan' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] shrink-0">
        <span>Market</span><span className="text-right">Last</span><span className="text-right">24h</span>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {rows.length === 0 && (
          <div className="p-3 text-[10px] text-[var(--text-muted)] text-center">No markets match</div>
        )}
        {rows.map(t => {
          const up = t.priceChangePercent >= 0;
          const sel = t.symbol === selectedPair;
          return (
            <button
              key={t.symbol}
              onClick={() => onSelectPair(t.symbol)}
              className={`w-full grid grid-cols-[1fr_auto_auto] gap-x-2 items-center px-2 py-1.5 text-left border-b border-[var(--border)] cursor-pointer transition-colors ${sel ? 'bg-[var(--bg-panel)] border-l-2 border-l-[var(--cyan)]' : 'hover:bg-[var(--bg-hover)]'}`}
            >
              <span className="flex flex-col">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">{t.symbol.replace('USDT', '')}<span className="text-[var(--text-muted)] font-normal">/USDT</span></span>
                <span className="text-[9px] text-[var(--text-muted)] font-mono">Vol {shortenNumber(t.quoteVolume)}</span>
              </span>
              <span className="text-[11px] font-mono text-[var(--text-primary)] text-right tabular-nums">{formatPrice(t.lastPrice)}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded text-right tabular-nums ${up ? 'text-gain bg-[var(--gain-dim)]' : 'text-loss bg-[var(--loss-dim)]'}`}>
                {formatPercent(t.priceChangePercent)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
