'use client';

import { useEffect, useState, useRef } from 'react';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import { cssVar, cssVarAlpha } from '../../lib/css-var';
type LcModule = typeof import('lightweight-charts');

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface ChartProps {
  pair: string;
  userId: string;
}

export default function PriceChart({ pair }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Latest fetched dataset, replayed when chart init finishes (the dynamic
  // import can resolve AFTER the first fetch -> setData on null refs is lost
  // and the pane stays blank until the next 30s poll).
  const latestDataRef = useRef<{ candles: CandlestickData[]; volumes: HistogramData[]; ma20: any[] } | null>(null);
  const [klines, setKlines] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let chart: IChartApi | null = null;

    (async () => {
      // Load the chart lib client-side only; importing during SSR breaks canvas globals.
      const mod: LcModule = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      try {
        chart = mod.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          layout: {
            background: { color: cssVar('--bg-primary', '#000000') },
            textColor: cssVar('--text-muted', '#8f8f8f'),
            fontSize: 11,
          },
          grid: {
            vertLines: { color: cssVar('--grid-line', 'rgba(48, 128, 255, 0.08)') },
            horzLines: { color: cssVar('--grid-line', 'rgba(48, 128, 255, 0.08)') },
          },
          crosshair: {
            mode: 0,
            vertLine: { color: cssVarAlpha('--cyan', '#3080ff', 0.4), width: 1, style: 2 },
            horzLine: { color: cssVarAlpha('--cyan', '#3080ff', 0.4), width: 1, style: 2 },
          },
          rightPriceScale: {
            borderColor: cssVar('--border', '#2e2e2e'),
            scaleMargins: { top: 0.1, bottom: 0.2 },
          },
          timeScale: {
            borderColor: cssVar('--border', '#2e2e2e'),
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 8,
          },
        });

        const candleSeries = chart.addCandlestickSeries({
          upColor: cssVar('--gain', '#00bb7f'),
          downColor: cssVar('--loss', '#fb2c36'),
          borderUpColor: cssVar('--gain', '#00bb7f'),
          borderDownColor: cssVar('--loss', '#fb2c36'),
          wickUpColor: cssVar('--gain', '#00bb7f'),
          wickDownColor: cssVar('--loss', '#fb2c36'),
        });

        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

        const maSeries = chart.addLineSeries({
          color: cssVar('--cyan', '#3080ff'),
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        maSeriesRef.current = maSeries;
        // Replay data that arrived before this async init finished (dev-mode
        // race: first fetch resolves while the dynamic import is still in
        // flight -> that dataset was dropped -> blank pane for 30s).
        const pending = latestDataRef.current;
        if (pending) {
          candleSeries.setData(pending.candles);
          volumeSeries.setData(pending.volumes);
          if (pending.ma20.length) maSeries.setData(pending.ma20);
        }
        setChartReady(true);
      } catch (error) {
        console.error('[Chart] Failed to initialize:', error);
      }
    })();

    return () => {
      cancelled = true;
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRef.current = null;
      setChartReady(false);
      if (chart) {
        chart.remove();
      }
    };
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current && entries[0]) {
        chartRef.current.resize(entries[0].contentRect.width, entries[0].contentRect.height);
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${ENGINE_URL}/api/market/${pair}`);
        const data = await res.json();
        
        const candles: CandlestickData[] = (data.klines || []).map((k: any) => ({
          time: Math.floor(k.openTime / 1000),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        })); // engine sends ASCENDING openTime; lightweight-charts requires
             // asc order and throws (silently blanking the chart) if reversed.

        const volumes: HistogramData[] = (data.klines || []).map((k: any) => ({
          time: Math.floor(k.openTime / 1000),
          value: k.volume,
          color: k.close >= k.open
            ? cssVarAlpha('--gain', '#00bb7f', 0.25)
            : cssVarAlpha('--loss', '#fb2c36', 0.25),
        }));

        setKlines(candles);

        // MA20 (computed always — kept in latestDataRef so a late chart init
        // can replay the complete dataset)
        let ma20: any[] = [];
        if (candles.length >= 20) {
          for (let i = 19; i < candles.length; i++) {
            const slice = candles.slice(i - 19, i + 1);
            const avg = slice.reduce((s, c) => s + c.close, 0) / 20;
            ma20.push({ time: candles[i].time, value: avg });
          }
        }

        latestDataRef.current = { candles, volumes, ma20 };
        if (candleSeriesRef.current) candleSeriesRef.current.setData(candles);
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumes);
        if (ma20.length && maSeriesRef.current) maSeriesRef.current.setData(ma20);
      } catch (err) {
        console.error('[Chart] Fetch failed:', err);
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [pair]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{pair}</span>
          <ChartInfoHeader pair={pair} />
        </div>
        <TimeframeSelector />
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {loading && !chartReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--cyan)] rounded-full animate-spin" style={{ boxShadow: '0 0 8px rgba(48, 128, 255, 0.3)' }} />
              <span className="text-[var(--text-muted)] text-xs">Loading chart...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)] z-10">
            <div className="text-center">
              <div className="text-[var(--loss)] text-xs mb-1">⚠ {error}</div>
              <button 
                onClick={() => window.location.reload()}
                className="text-[var(--text-muted)] text-xs hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer - Stats */}
      <ChartFooter klines={klines} pair={pair} />
    </div>
  );
}

function ChartInfoHeader({ pair }: { pair: string }) {
  const [ticker, setTicker] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTicker = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${ENGINE_URL}/api/market/${pair}`);
        const data = await res.json();
        setTicker(data.ticker);
      } catch { /* skip */ }
      finally { setLoading(false); }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 30000);
    return () => clearInterval(interval);
  }, [pair]);

  if (loading || !ticker) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-[var(--text-muted)] animate-pulse">Loading...</span>
      </div>
    );
  }

  const isUp = ticker.priceChange >= 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`text-base font-bold font-mono ${isUp ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
        ${ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className={`px-1.5 py-0.5 text-[10px] font-semibold ${isUp ? 'bg-[var(--gain-dim)] text-[var(--gain)]' : 'bg-[var(--loss-dim)] text-[var(--loss)]'}`}>
        {isUp ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
      </span>
      <span className="text-[var(--text-muted)]">
        Vol {ticker.volume.toFixed(0)}
      </span>
    </div>
  );
}

function TimeframeSelector() {
  const [selected, setSelected] = useState('1h');
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="flex gap-1 bg-[var(--bg-primary)]">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => setSelected(tf)}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
            selected === tf
              ? 'bg-[var(--bg-hover)] text-[var(--cyan)]'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

function ChartFooter({ klines, pair }: { klines: CandlestickData[], pair: string }) {
  if (klines.length < 2) return null;

  const last = klines[klines.length - 1];
  const prev = klines[klines.length - 2];
  const change = last.close - prev.close;
  const changePct = (change / prev.close) * 100;
  const isUp = change >= 0;

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-[10px]">
      <div className="flex items-center gap-4">
        <span className="text-[var(--text-muted)]">O</span>
        <span className="font-mono text-white">{last.open.toFixed(2)}</span>
        <span className="text-[var(--text-muted)] ml-2">H</span>
        <span className="font-mono text-white">{last.high.toFixed(2)}</span>
        <span className="text-[var(--text-muted)] ml-2">L</span>
        <span className="font-mono text-white">{last.low.toFixed(2)}</span>
        <span className="text-[var(--text-muted)] ml-2">C</span>
        <span className={`font-mono font-semibold ${isUp ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
          {last.close.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-mono ${isUp ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}`}>
          {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
        </span>
        <span className="text-[var(--text-muted)]">{new Date(Number(last.time) * 1000).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
