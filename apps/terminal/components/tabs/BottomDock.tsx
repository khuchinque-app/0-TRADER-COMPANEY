'use client';

// Bottom dock (reference: rtabs / mrow / prow): tabs for Movers, Open Orders,
// and Fill history. Sortable-ish, compact rows, mono numerics.

import { useEffect, useMemo, useState } from 'react';
import type { TickerLite } from '../../lib/use-tickers';
import { PAIRS } from '@trading/shared';
import { formatPrice, formatPercent, formatNumber, formatTime, shortenNumber } from '../../lib/format';
import HeatGrid from './HeatGrid';
import NewsFeed from './NewsFeed';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

type Tab = 'movers' | 'open' | 'fills' | 'heat' | 'news';

interface Props {
  tickers: Record<string, TickerLite>;
  userId: string;
  refreshKey: number;
  onSelectPair: (pair: string) => void;
}

export default function BottomDock({ tickers, userId, refreshKey, onSelectPair }: Props) {
  const [tab, setTab] = useState<Tab>('movers');
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [fills, setFills] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [oo, fl] = await Promise.all([
          fetch(`${ENGINE_URL}/api/orders/${userId}`).then(r => (r.ok ? r.json() : [])).catch(() => []),
          // Spec: the marketplace trades list is GET /api/fills (rest.ts:110).
          // Fetched SAME-ORIGIN through the Next rewrite so the session cookie
          // rides along when AUTH_ENABLED=1 (the engine then scopes the rows to
          // the caller — no admin role in a paper venue). Guest mode
          // (AUTH_ENABLED=0) gets the venue's recent fills.
          fetch('/api/fills', { credentials: 'include' })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;
        setOpenOrders(Array.isArray(oo) ? oo : []);
        setFills(Array.isArray(fl?.fills) ? fl.fills.slice(0, 30) : []);
      } catch { /* engine offline */ }
    };
    load();
    const t = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, [userId, refreshKey]);

  const movers = useMemo(() => {
    const list = PAIRS.map(p => tickers[p]).filter(Boolean);
    return {
      gainers: [...list].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 5),
      active: [...list].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 5),
    };
  }, [tickers]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[var(--bg-secondary)]">
      {/* tab header */}
      <div className="flex items-center gap-1 px-2 border-b border-[var(--border)] shrink-0 h-7">
        {([['movers', 'Movers'], ['open', `Open Orders (${openOrders.length})`], ['fills', 'Market Trades'], ['heat', 'Heat'], ['news', 'News']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 h-full text-[10px] uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${tab === t ? 'text-cyan border-[var(--cyan)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {tab === 'movers' && (
          <div className="grid grid-cols-2 h-full">
            <MoverCol title="Top Gainers" rows={movers.gainers} onSelectPair={onSelectPair} metric={t => t.priceChangePercent} fmt={t => formatPercent(t.priceChangePercent)} />
            <MoverCol title="Most Active" rows={movers.active} onSelectPair={onSelectPair} metric={t => t.quoteVolume} fmt={t => `$${shortenNumber(t.quoteVolume)}`} />
          </div>
        )}

        {tab === 'heat' && <HeatGrid tickers={tickers} onSelectPair={onSelectPair} />}

        {tab === 'news' && <NewsFeed tickers={tickers} />}

        {tab === 'open' && (
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[var(--text-muted)] uppercase tracking-wide text-left sticky top-0 bg-[var(--bg-secondary)]">
                <th className="px-3 py-1 font-normal">Time</th><th className="px-2 py-1 font-normal">Pair</th>
                <th className="px-2 py-1 font-normal">Side</th><th className="px-2 py-1 text-right font-normal">Price</th>
                <th className="px-2 py-1 text-right font-normal">Qty</th><th className="px-2 py-1 text-right font-normal">Filled</th>
                <th className="px-2 py-1 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-[var(--text-muted)]">No open orders</td></tr>
              )}
              {openOrders.map((o: any) => (
                <tr key={o.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer" onClick={() => onSelectPair(o.pair)}>
                  <td className="px-3 py-1 font-mono text-[var(--text-muted)]">{formatTime(o.timestamp)}</td>
                  <td className="px-2 py-1 text-[var(--text-primary)] font-semibold">{o.pair?.replace?.('USDT', '')}</td>
                  <td className={`px-2 py-1 font-semibold ${o.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{o.side?.toUpperCase()}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{formatPrice(o.price)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{formatNumber(o.quantity, 6)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-muted)]">{formatNumber((o.filledQuantity ?? 0) * 100, 0)}%</td>
                  <td className="px-2 py-1 text-right uppercase text-[var(--text-muted)]">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'fills' && (
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[var(--text-muted)] uppercase tracking-wide text-left sticky top-0 bg-[var(--bg-secondary)]">
                <th className="px-3 py-1 font-normal">Time</th><th className="px-2 py-1 font-normal">Pair</th>
                <th className="px-2 py-1 font-normal">Side</th><th className="px-2 py-1 text-right font-normal">Price</th>
                <th className="px-2 py-1 text-right font-normal">Qty</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--text-muted)]">No simulated fills yet</td></tr>
              )}
              {fills.map((f: any) => (
                <tr key={f.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer" onClick={() => onSelectPair(f.pair)}>
                  <td className="px-3 py-1 font-mono text-[var(--text-muted)]">{formatTime(f.timestamp)}</td>
                  <td className="px-2 py-1 text-[var(--text-primary)] font-semibold">{f.pair?.replace?.('USDT', '')}</td>
                  <td className={`px-2 py-1 font-semibold ${f.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{f.side?.toUpperCase()}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{formatPrice(f.price)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{formatNumber(f.quantity, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MoverCol({ title, rows, onSelectPair, fmt }: {
  title: string;
  rows: TickerLite[];
  onSelectPair: (p: string) => void;
  metric: (t: TickerLite) => number;
  fmt: (t: TickerLite) => string;
}) {
  return (
    <div className="border-r border-[var(--border)] last:border-r-0">
      <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">{title}</div>
      {rows.map(t => (
        <button key={t.symbol} onClick={() => onSelectPair(t.symbol)} className="w-full grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-3 py-1 text-left border-b border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer">
          <span className="text-[10px] font-semibold text-[var(--text-primary)]">{t.symbol.replace('USDT', '')}</span>
          <span className="text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">{formatPrice(t.lastPrice)}</span>
          <span className={`text-[10px] font-mono tabular-nums w-16 text-right ${t.priceChangePercent >= 0 ? 'text-gain' : 'text-loss'}`}>{fmt(t)}</span>
        </button>
      ))}
    </div>
  );
}
