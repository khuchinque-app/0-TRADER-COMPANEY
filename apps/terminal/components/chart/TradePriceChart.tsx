"use client";

// T06: Price chart for the trade page, powered by lightweight-charts.
//  - Candles come from the T04 history endpoint: /api/price/:symbol/history?interval=
//  - Intervals 1m / 5m / 1h are switchable (backend aggregates from the 1m store)
//  - A 5s poll refreshes the live last candle (series.update, same cadence as the
//    price feed / order book)
//  - SSR-safe: the chart library is imported dynamically inside useEffect, never at
//    module scope (type-only imports are erased at compile time).

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { cssVar } from "../../lib/css-var";

type LcModule = typeof import("lightweight-charts");

const INTERVALS = ["1m", "5m", "1h"] as const;
type IntervalId = (typeof INTERVALS)[number];

const POLL_MS = 5000;

interface HistoryCandle {
  ts: number; // ms epoch (bucket open)
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradePriceChartProps {
  symbol: string; // shortlisted base asset, e.g. "BTC" (empty/unknown -> history 404 is handled)
  pair: string; // display label, e.g. "BTCUSDT"
}

export default function TradePriceChart({ symbol, pair }: TradePriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // Last dataset seen, replayed if the dynamic import resolves after the first fetch.
  const latestRef = useRef<CandlestickData[] | null>(null);
  const lastTimeRef = useRef<Time | null>(null);

  const [interval, setIv] = useState<IntervalId>("1m");
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "unsupported">("loading");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [chartReady, setChartReady] = useState(false);

  // One-time chart bootstrap (client-side only; must not run during SSR).
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let chart: IChartApi | null = null;

    (async () => {
      const mod: LcModule = await import("lightweight-charts");
      if (cancelled || !containerRef.current) return;
      try {
        chart = mod.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          layout: {
            background: { color: cssVar("--bg-primary", "#0d1117") },
            textColor: cssVar("--text-muted", "#8b949e"),
            fontSize: 11,
          },
          grid: {
            vertLines: { color: cssVar("--grid-line", "rgba(48, 128, 255, 0.06)") },
            horzLines: { color: cssVar("--grid-line", "rgba(48, 128, 255, 0.06)") },
          },
          crosshair: {
            mode: 0,
            vertLine: { color: cssVar("--cyan", "#3080ff"), width: 1, style: 2, labelBackgroundColor: cssVar("--cyan", "#3080ff") },
            horzLine: { color: cssVar("--cyan", "#3080ff"), width: 1, style: 2, labelBackgroundColor: cssVar("--cyan", "#3080ff") },
          },
          rightPriceScale: {
            borderColor: cssVar("--border", "#2e2e2e"),
            scaleMargins: { top: 0.08, bottom: 0.08 },
          },
          timeScale: {
            borderColor: cssVar("--border", "#2e2e2e"),
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 4,
            barSpacing: 8,
          },
        });

        const series = chart.addCandlestickSeries({
          upColor: cssVar("--gain", "#00bb7f"),
          downColor: cssVar("--loss", "#fb2c36"),
          borderUpColor: cssVar("--gain", "#00bb7f"),
          borderDownColor: cssVar("--loss", "#fb2c36"),
          wickUpColor: cssVar("--gain", "#00bb7f"),
          wickDownColor: cssVar("--loss", "#fb2c36"),
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Replay data that arrived while the lib was still loading.
        const pending = latestRef.current;
        if (pending && pending.length) {
          series.setData(pending);
          lastTimeRef.current = pending[pending.length - 1].time;
        }
        setChartReady(true);
      } catch (err) {
        console.error("[TradeChart] init failed:", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      chartRef.current = null;
      seriesRef.current = null;
      lastTimeRef.current = null;
      setChartReady(false);
      if (chart) chart.remove();
    };
  }, []);

  // Container resize -> chart resize.
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (chartRef.current && entries[0]) {
        chartRef.current.resize(entries[0].contentRect.width, entries[0].contentRect.height);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toChartCandle = (c: HistoryCandle): CandlestickData => ({
    time: Math.floor(c.ts / 1000) as Time, // lightweight-charts expects seconds (UTC)
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  });

  // Fetch + render the requested interval; the poll loop then live-updates the tail.
  const load = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/price/${symbol}/history?interval=${interval}`);
      if (!res.ok) {
        if (res.status === 404) setStatus("unsupported");
        else setStatus("error");
        return;
      }
      const data = await res.json();
      const raw: HistoryCandle[] = Array.isArray(data.candles) ? data.candles : [];
      if (!raw.length) {
        setStatus("error");
        return;
      }
      const candles = raw.map(toChartCandle);
      setLastPrice(candles[candles.length - 1].close);
      setStatus("ok");
      const prevCandles = latestRef.current;
      latestRef.current = candles;

      const series = seriesRef.current;
      if (!series) return; // chart lib still loading -> replayed by bootstrap effect

      // Incremental update: append/replace every candle at/after the previous tail so
      // the live candle keeps moving without resetting the visible range. Falls back to
      // a full setData when the dataset was replaced (interval switch, backend restart).
      const lastKnown = lastTimeRef.current;
      let startIdx = -1;
      if (lastKnown !== null && prevCandles && candles.length >= prevCandles.length) {
        startIdx = candles.findIndex((c) => c.time === lastKnown);
      }
      if (startIdx < 0) {
        series.setData(candles);
      } else {
        for (let i = startIdx; i < candles.length; i++) series.update(candles[i]);
      }
      lastTimeRef.current = candles[candles.length - 1].time;
    } catch {
      setStatus("error");
    }
  };

  // Initial load + interval switch (full reload), then poll the live tail.
  useEffect(() => {
    setStatus("loading");
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border border-gray-800 rounded-lg overflow-hidden">
      {/* Header: pair + last price + interval switcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{pair}</span>
          {lastPrice !== null && status === "ok" && (
            <span className="text-sm font-mono text-[var(--cyan)]">
              ${lastPrice.toLocaleString("en-US", { maximumFractionDigits: 6 })}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setIv(iv)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                interval === iv
                  ? "bg-[var(--bg-hover)] text-[var(--cyan)]"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {(!chartReady || status === "loading") && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--bg-primary)]">
            <span className="text-xs text-[var(--text-muted)]">Loading chart…</span>
          </div>
        )}
        {status === "unsupported" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--bg-primary)]">
            <span className="text-xs text-[var(--text-muted)] px-4 text-center">
              Chart history available for shortlisted assets (BTC, ETH, SOL, BNB, XRP, LINK).
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--bg-primary)]">
            <span className="text-xs text-[var(--loss)]">Chart data unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
}
