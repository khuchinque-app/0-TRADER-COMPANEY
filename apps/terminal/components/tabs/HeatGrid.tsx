'use client';

// Heat grid (reference: market-monitor.css .heat / .hcell).
// One tile per pair, background tinted by 24h %chg intensity via color-mix,
// click selects the pair. Consumes canonical market-monitor tokens.

import type { TickerLite } from '../../lib/use-tickers';

interface Props {
  tickers: Record<string, TickerLite>;
  onSelectPair: (pair: string) => void;
}

// Intensity steps (k = |%chg| clamped at 3): 0 / 5 / 10 / 18 / 28 % tint.
function tint(pct: number): { bg: string; color: string } {
  const a = Math.abs(pct);
  const step = a === 0 ? 0 : a < 0.5 ? 5 : a < 1 ? 10 : a < 2 ? 18 : 28;
  const pos = pct >= 0;
  return {
    bg: `color-mix(in srgb, var(--${pos ? 'pos' : 'neg'}) ${step}%, var(--panel))`,
    color: step === 0 ? 'var(--muted)' : `var(--${pos ? 'pos' : 'neg'})`,
  };
}

export default function HeatGrid({ tickers, onSelectPair }: Props) {
  const entries = Object.values(tickers);

  return (
    <div className="h-full min-h-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 auto-rows-fr gap-px bg-[var(--line)] border-t border-[var(--line)] overflow-hidden">
      {entries.map((t) => {
        const { bg, color } = tint(t.priceChangePercent);
        return (
          <button
            key={t.symbol}
            onClick={() => onSelectPair(t.symbol)}
            className="min-h-0 flex flex-col justify-between items-start p-2 bg-[var(--panel)] hover:brightness-125 transition-[filter] cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent)]"
            style={{ background: bg }}
            aria-label={`${t.symbol} ${t.priceChangePercent.toFixed(2)} percent`}
          >
            <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--muted)] uppercase">
              {t.symbol.replace('USDT', '')}
            </span>
            <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color }}>
              {t.priceChangePercent >= 0 ? '+' : ''}
              {t.priceChangePercent.toFixed(2)}%
            </span>
          </button>
        );
      })}
      {entries.length === 0 && (
        <div className="col-span-full flex items-center justify-center text-[10px] text-[var(--text-muted)]">
          Waiting for ticker data…
        </div>
      )}
    </div>
  );
}
