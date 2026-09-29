'use client';

// Right rail: selected-symbol strip + portfolio summary + positions.
// Reference: mstat / stk / psum / rlist — compact stat row, then account panels.

import { useEffect, useMemo, useState } from 'react';
import type { TickerLite } from '../../lib/use-tickers';
import { formatPrice, formatPercent, formatNumber, formatQuantityClean, shortenNumber } from '../../lib/format';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

interface Props {
  pair: string;
  ticker: TickerLite | null;
  account: any;
  userId: string;
  refreshKey: number;
}

export function SymbolStrip({ pair, ticker }: { pair: string; ticker: TickerLite | null }) {
  const up = (ticker?.priceChangePercent ?? 0) >= 0;
  return (
    <div className="flex items-center gap-4 px-3 h-12 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 overflow-x-auto">
      <div className="flex items-baseline gap-2 shrink-0">
        <span className="text-sm font-bold text-[var(--text-primary)]">{pair.replace('USDT', '')}<span className="text-[var(--text-muted)] font-normal">/USDT</span></span>
        <span className="rounded text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-[var(--cyan-dim)] text-cyan">Spot</span>
      </div>
      <span className={`text-lg font-mono font-semibold tabular-nums ${up ? 'text-gain' : 'text-loss'}`}>
        {ticker ? formatPrice(ticker.lastPrice) : '—'}
      </span>
      <span className={`text-[11px] font-mono tabular-nums shrink-0 ${up ? 'text-gain' : 'text-loss'}`}>
        {ticker ? `${formatNumber(ticker.priceChange, 2)} (${formatPercent(ticker.priceChangePercent)})` : ''}
      </span>
      <div className="flex items-center gap-4 ml-auto shrink-0 text-[10px] text-[var(--text-muted)]">
        <span>H <b className="font-mono text-[var(--text-secondary)]">{ticker ? formatPrice(ticker.highPrice) : '—'}</b></span>
        <span>L <b className="font-mono text-[var(--text-secondary)]">{ticker ? formatPrice(ticker.lowPrice) : '—'}</b></span>
        <span>Vol <b className="font-mono text-[var(--text-secondary)]">{ticker ? shortenNumber(ticker.quoteVolume) : '—'}</b></span>
      </div>
    </div>
  );
}

export function AccountRail({ account, refreshKey }: { account: any; refreshKey: number }) {
  const [fx, setFx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/fx`);
        if (res.ok) {
          const d = await res.json();
          // Engine returns { rate: { usdToIdr, fetchedAt } } — store the number
          const num = typeof d?.rate?.usdToIdr === 'number' ? d.rate.usdToIdr : null;
          if (!cancelled && num) setFx(num);
        }
      } catch { /* fx optional */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const derived = useMemo(() => {
    if (!account) return null;
    const total = account.totalValueUsdt || 0;
    const usdt = account.balances?.find((b: any) => b.asset === 'USDT')?.available || 0;
    const positions: any[] = account.positions || [];
    return { total, usdt, positions, free: total - usdt };
  }, [account]);

  // Session-local equity trend (sparkline): ring buffer of total-value samples.
  // No engine history endpoint exists yet, so this shows THIS SESSION only.
  const [samples, setSamples] = useState<number[]>([]);
  const totalNow = derived?.total;
  useEffect(() => {
    if (totalNow == null || !Number.isFinite(totalNow)) return;
    setSamples((prev) => {
      const next = [...prev, totalNow];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, [totalNow]);

  if (!derived) {
    return <div className="p-3 text-[10px] text-[var(--text-muted)]">Loading account…</div>;
  }

  const { total, usdt, positions } = derived;

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* equity card */}
      <div className="border border-[var(--border)] rounded bg-[var(--bg-primary)] p-2.5">
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Est. Value (simulated)</div>
        <div className="text-xl font-mono font-semibold text-[var(--text-primary)] tabular-nums leading-none">
          ${formatNumber(total, 2)}
        </div>
        {fx && (
          <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1 tabular-nums">
            Rp {formatNumber(total * fx, 0)}
          </div>
        )}
        <Sparkline samples={samples} />
        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-[var(--border)]">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Available</div>
            <div className="text-[11px] font-mono text-[var(--text-primary)] tabular-nums">{formatNumber(usdt, 2)} USDT</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Positions</div>
            <div className="text-[11px] font-mono text-[var(--text-primary)] tabular-nums">{positions.length}</div>
          </div>
        </div>
      </div>

      {/* holdings list (rlist) */}
      <div className="border border-[var(--border)] rounded bg-[var(--bg-primary)] min-h-0">
        <div className="px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">Holdings</div>
        <div className="max-h-[180px] overflow-auto">
          {(account.balances || [])
            .filter((b: any) => b.asset !== 'USDT' && b.available > 0)
            .map((b: any) => (
              <div key={b.asset} className="grid grid-cols-2 px-2.5 py-1.5 text-[11px] border-b border-[var(--border)] last:border-b-0">
                <span className="text-[var(--text-secondary)] font-semibold">{b.asset}</span>
                <span className="font-mono text-[var(--text-primary)] text-right tabular-nums">{formatQuantityClean(b.available)}</span>
              </div>
            ))}
          {(account.balances || []).filter((b: any) => b.asset !== 'USDT' && b.available > 0).length === 0 && (
            <div className="p-3 text-[10px] text-[var(--text-muted)] text-center">No holdings yet — place a simulated order</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ samples }: { samples: number[] }) {
  if (samples.length < 2) return null;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min;
  const pts = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * 100;
      const y = span === 0 ? 14 : 26 - ((v - min) / span) * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)]">
      <div className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">
        Session trend · simulated
      </div>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-9 block" aria-hidden="true">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
