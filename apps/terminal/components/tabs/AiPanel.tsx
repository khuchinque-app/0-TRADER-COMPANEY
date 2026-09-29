'use client';

// AI ANALYSIS panel — REAL indicator math now: RSI(21) / MACD(12,26,9) /
// 3-level Bollinger signal zone, ported from the pine specs in
// PLANNING/sitemenu-complete/sitemenu-complete-style-grafik/ into
// @trading/shared (packages/shared/src/indicators.ts).
// Still deterministic rules, no model call — labeled simulated, not advice.

import { useMemo } from 'react';
import type { TickerLite } from '../../lib/use-tickers';
import { computeSignalRead, type CandleInput, type SignalRead } from '@trading/shared';
import { formatPrice, formatPercent } from '../../lib/format';

interface Props {
  pair: string;
  ticker: TickerLite | null;
  book: { bids: any[]; asks: any[] } | null;
  klines?: CandleInput[];
}

export default function AiPanel({ pair, ticker, book, klines }: Props) {
  // Indicator read over the kline array the page already fetches.
  const read: SignalRead | null = useMemo(
    () => (klines && klines.length > 0 ? computeSignalRead(pair, klines) : null),
    [pair, klines]
  );

  // Book imbalance + 24h range position stay local (order-flow context,
  // not part of the pine ports).
  const local = useMemo(() => {
    if (!ticker) return null;
    const hasDepth = !!(book && book.bids?.length && book.asks?.length);
    let imb = 0;
    if (hasDepth) {
      const bidVol = book!.bids.slice(0, 12).reduce((s: number, r: any) => s + (r.quantity || 0), 0);
      const askVol = book!.asks.slice(0, 12).reduce((s: number, r: any) => s + (r.quantity || 0), 0);
      imb = (bidVol - askVol) / (bidVol + askVol || 1);
    }
    const rangePos =
      ticker.highPrice > ticker.lowPrice
        ? (ticker.lastPrice - ticker.lowPrice) / (ticker.highPrice - ticker.lowPrice)
        : 0.5;
    const rangeLabel = rangePos > 0.75 ? 'upper' : rangePos < 0.25 ? 'lower' : 'middle';
    return { hasDepth, imb, rangePos, rangeLabel };
  }, [ticker, book]);

  if (!ticker || !local) {
    return <div className="p-3 text-[10px] text-[var(--text-muted)]">Waiting for data…</div>;
  }

  const toneOf = (t: 'bullish' | 'bearish' | 'neutral'): 'up' | 'down' | 'neutral' =>
    t === 'bullish' ? 'up' : t === 'bearish' ? 'down' : 'neutral';

  return (
    <div className="flex flex-col gap-2 p-2.5 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wide text-[var(--text-primary)]">
          {pair.replace('USDT', '')} · indicator read
        </span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">simulated</span>
      </div>

      {/* Trend from the BB signal zone (pine 02 port) */}
      <Row label="Trend (BB zone)" value={read ? read.trendText : 'warming up'} tone={read ? toneOf(read.trend) : 'neutral'} />

      {/* RSI(21) (pine 01 port: guide lines 40/50/60) */}
      <Row
        label="RSI (21)"
        value={read ? read.rsiText : 'warming up'}
        tone={read?.rsi21 === undefined ? 'neutral' : read.rsi21 > 60 ? 'up' : read.rsi21 < 40 ? 'down' : 'neutral'}
      />

      {/* MACD (pine 03 port: 12/26/9) */}
      <Row
        label="MACD"
        value={read ? read.macdText : 'warming up'}
        tone={read?.macd ? (read.macd.macd > read.macd.signal ? 'up' : 'down') : 'neutral'}
      />

      <Row
        label="Book pressure"
        value={
          !local.hasDepth
            ? 'no depth'
            : local.imb === 0
              ? 'balanced'
              : `${(local.imb * 100).toFixed(0)}% ${local.imb > 0 ? 'bid' : 'ask'}`
        }
        tone={local.imb > 0 ? 'up' : local.imb < 0 ? 'down' : 'neutral'}
      />
      <Row label="24h range" value={`${local.rangeLabel} (${(local.rangePos * 100).toFixed(0)}%)`} tone="neutral" />
      <Row
        label="24h change"
        value={formatPercent(ticker.priceChangePercent)}
        tone={ticker.priceChangePercent >= 0 ? 'up' : 'down'}
      />

      <div className="mt-1 p-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[10px] leading-relaxed text-[var(--text-secondary)]">
        {read ? (
          <>
            {read.summary} Reference price {formatPrice(ticker.lastPrice)}.
          </>
        ) : (
          <>Collecting klines — RSI/MACD/BB warm up as history arrives (need ~100 bars).</>
        )}{' '}
        <span className="text-[var(--text-muted)]">
          Rules-based ports of public pine specs — not a model, not advice.
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'up' | 'down' | 'neutral' }) {
  const cls = tone === 'up' ? 'text-gain' : tone === 'down' ? 'text-loss' : 'text-[var(--text-secondary)]';
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 items-baseline">
      <span className="text-[var(--text-muted)] text-[10px]">{label}</span>
      <span className={`font-mono text-right tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
