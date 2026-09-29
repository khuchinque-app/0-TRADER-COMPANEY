'use client';

// Simulated news feed (reference: market-monitor.css .nrow / .src).
// Headlines are DERIVED from live reference tickers — no external news API
// in Rung 0. Every row is explicitly simulated (SIMULASI honesty rule).

import { useEffect, useState } from 'react';
import type { TickerLite } from '../../lib/use-tickers';

interface NewsRow {
  id: string;
  time: string;
  headline: string;
  source: string;
}

const SOURCES = ['DESK', 'WIRE', 'SIM', 'TAPE'];
const TEMPLATES: Array<(sym: string, chg: string, vol: string) => string> = [
  (s, chg) => `${s} ${chg} over 24h — simulated desk flow notes elevated interest`,
  (s, chg, vol) => `Simulated tape: ${s} notional $${vol} in 24h, price ${chg}`,
  (s, chg) => `Monitor model flags ${s} momentum ${chg} (rules-based, simulated)`,
  (s) => `${s} holds the tape — paper-market chatter elevated (simulated)`,
];

export default function NewsFeed({ tickers }: { tickers: Record<string, TickerLite> }) {
  const [rows, setRows] = useState<NewsRow[]>([]);

  useEffect(() => {
    const list = Object.values(tickers)
      .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
      .slice(0, 8)
      .map((t, i) => {
        const chg = `${t.priceChangePercent >= 0 ? '+' : ''}${t.priceChangePercent.toFixed(2)}%`;
        const vol = t.quoteVolume.toLocaleString(undefined, { maximumFractionDigits: 0 });
        return {
          id: `${t.symbol}-${t.timestamp}`,
          time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          headline: TEMPLATES[i % TEMPLATES.length](t.symbol.replace('USDT', ''), chg, vol),
          source: SOURCES[i % SOURCES.length],
        };
      });
    setRows(list);
  }, [tickers]);

  return (
    <div className="h-full overflow-auto min-h-0">
      <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--faint)] border-b border-[var(--border)] bg-[var(--panel)]">
        simulated news · derived from live reference data · not real reporting
      </div>
      {rows.length === 0 && (
        <div className="p-4 text-center text-[10px] text-[var(--text-muted)]">No simulated headlines yet</div>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-baseline gap-2 px-3 py-1.5 border-b border-[var(--line-soft)] hover:bg-[var(--raised)] transition-colors"
        >
          <span className="font-mono text-[9px] text-[var(--faint)] shrink-0">{r.time}</span>
          <span className="text-[11.5px] leading-relaxed">{r.headline}</span>
          <span className="ml-auto font-mono text-[8px] tracking-[0.08em] text-[var(--muted)] border border-[var(--line)] rounded-sm px-1 py-px uppercase shrink-0">
            {r.source}
          </span>
        </div>
      ))}
    </div>
  );
}
