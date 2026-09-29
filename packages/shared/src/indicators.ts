// Indicators — TS ports of the 3 Pine Script specs in
// PLANNING/sitemenu-complete/sitemenu-complete-style-grafik/:
//   01-rsi-oscillator.pine  (RSI, Wilder, len 21, guide lines 40/50/60)
//   02-ema-bb-signal.pine   (3-level Bollinger on TP + Nadaraya-Watson
//                            smoothing + 40/60 signal zone; fluxchart, MPL-2.0)
//   03-macd.pine            (MACD 12/26/9; mihakralj, MIT)
// Pure functions over candle arrays. No IO, no state. Callers must handle
// `undefined` returns (cold start: not enough bars) — never fabricate values.
//
// Port omissions (documented, per "truthful about being simulated" rule):
// - 02: the k-NN weighted trend filter and multi-timeframe request.security
//   layering are NOT ported; the 40/60 signal zone is applied to %B of the
//   level-1 bands instead (same thresholds the script uses as signal inputs).
// - 03: the embedded-warmup EMA variant is simplified to standard EMA with
//   SMA seed (same steady-state values; different only in the first bars).

export interface CandleInput {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ---------- primitives ----------

/** Simple moving average of the LAST `period` values. */
export function sma(values: number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Population standard deviation over the LAST `period` values (pine ta.stdev). */
export function stdev(values: number[], period: number): number | undefined {
  const n = values.length;
  if (period <= 0 || n < period) return undefined;
  let sum = 0;
  for (let i = n - period; i < n; i++) sum += values[i];
  const mean = sum / period;
  let acc = 0;
  for (let i = n - period; i < n; i++) acc += (values[i] - mean) ** 2;
  return Math.sqrt(acc / period);
}

/** EMA series (SMA-seeded, pine ta.ema convention). Returns full series. */
export function emaSeries(values: number[], period: number): number[] {
  if (period <= 0 || values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = k * (values[i] - prev) + prev;
    out.push(prev);
  }
  return out;
}

// ---------- 1. RSI (01-rsi-oscillator.pine: ta.rsi(close, 21)) ----------

/** Wilder RSI. Returns undefined until `period + 1` closes exist. */
export function rsi(closes: number[], period = 21): number | undefined {
  if (period <= 0 || closes.length < period + 1) return undefined;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d >= 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Label per the pine script's guide lines: high 60 / mid 50 / low 40. */
export function rsiLabel(v: number | undefined): string {
  if (v === undefined) return 'warming up';
  if (v > 60) return `overbought zone (${v.toFixed(1)} > 60)`;
  if (v < 40) return `oversold zone (${v.toFixed(1)} < 40)`;
  return `neutral band 40-60 (${v.toFixed(1)})`;
}

// ---------- 2. MACD (03-macd.pine: 12/26/9 on close) ----------

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
  cross: 'bullish' | 'bearish' | null;
}

/** MACD line = EMA(fast) - EMA(slow); signal = EMA(macdLine, signalLen). */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): MacdResult | undefined {
  if (fast <= 0 || slow <= 0 || signal <= 0 || fast >= slow) return undefined;
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  if (emaFast.length === 0 || emaSlow.length === 0) return undefined;
  // Align to the tail (emaSeries lengths differ by seed offset)
  const offset = emaFast.length - emaSlow.length;
  if (offset < 0) return undefined;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }
  const sigSeries = emaSeries(macdLine, signal);
  if (sigSeries.length < 2) return undefined;
  const m = macdLine[macdLine.length - 1];
  const s = sigSeries[sigSeries.length - 1];
  const histPrev = macdLine[macdLine.length - 2] - sigSeries[sigSeries.length - 2];
  const hist = m - s;
  const cross: 'bullish' | 'bearish' | null =
    histPrev <= 0 && hist > 0 ? 'bullish' : histPrev >= 0 && hist < 0 ? 'bearish' : null;
  return { macd: m, signal: s, histogram: hist, cross };
}

export function macdLabel(v: MacdResult | undefined): string {
  if (!v) return 'warming up';
  const side = v.macd > v.signal ? 'above signal' : 'below signal';
  const zone = v.macd > 0 ? ', zero-line positive' : ', zero-line negative';
  const cross = v.cross ? ` · ${v.cross} cross!` : '';
  return `${side}${zone}${cross} (hist ${v.histogram.toFixed(2)})`;
}

// ---------- 3. EMA+BB signal (02-ema-bb-signal.pine core) ----------

export interface BbLevel {
  upper: number;
  lower: number;
}

export interface EmaBbResult {
  tpSmoothed: number;
  levels: { short: BbLevel; med: BbLevel; long: BbLevel };
  percentB: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

function bollinger(tp: number[], period: number, dev: number): BbLevel | undefined {
  const mean = sma(tp, period);
  const sd = stdev(tp, period);
  if (mean === undefined || sd === undefined) return undefined;
  return { upper: mean + dev * sd, lower: mean - dev * sd };
}

/**
 * Nadaraya-Watson gaussian smoothing of the TP series (h = bandwidth).
 * Uses only PAST+current bars (no repaint), last `lookback` bars max.
 */
function nwSmooth(tp: number[], h: number, lookback = 200): number | undefined {
  if (h <= 0 || tp.length === 0) return undefined;
  const n = Math.min(tp.length, lookback);
  let wSum = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(-(i * i) / (2 * h * h));
    wSum += w;
    acc += w * tp[tp.length - 1 - i];
  }
  return acc / wSum;
}

/**
 * Port of the fluxchart script's computable core: TP=(H+L+C)/3, three
 * Bollinger levels (20x3 / 75x4 / 100x4.25), NW smoothing h=6, and the
 * 40/60 signal zone applied to level-1 %B. k-NN filter NOT ported.
 */
export function emaBbSignal(
  candles: CandleInput[],
  opts?: {
    short?: { period: number; dev: number };
    med?: { period: number; dev: number };
    long?: { period: number; dev: number };
    h?: number;
  }
): EmaBbResult | undefined {
  const short = opts?.short ?? { period: 20, dev: 3 };
  const med = opts?.med ?? { period: 75, dev: 4 };
  const long = opts?.long ?? { period: 100, dev: 4.25 };
  const h = opts?.h ?? 6;
  if (candles.length < long.period) return undefined;

  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const s1 = bollinger(tp, short.period, short.dev);
  const s2 = bollinger(tp, med.period, med.dev);
  const s3 = bollinger(tp, long.period, long.dev);
  const smoothed = nwSmooth(tp, h);
  if (!s1 || !s2 || !s3 || smoothed === undefined) return undefined;

  const width = s1.upper - s1.lower;
  const percentB = width === 0 ? 50 : ((smoothed - s1.lower) / width) * 100;
  const trend: EmaBbResult['trend'] =
    percentB > 60 ? 'bullish' : percentB < 40 ? 'bearish' : 'neutral';

  return { tpSmoothed: smoothed, levels: { short: s1, med: s2, long: s3 }, percentB, trend };
}

// ---------- composite read for the AiPanel ----------

export interface SignalRead {
  pair: string;
  computedAt: number;
  bars: number;
  rsi21: number | undefined;
  rsiText: string;
  macd: MacdResult | undefined;
  macdText: string;
  bb: EmaBbResult | undefined;
  trend: 'bullish' | 'bearish' | 'neutral';
  trendText: string;
  summary: string;
  disclaimer: string;
}

/** One deterministic read over a kline array. No state, no randomness. */
export function computeSignalRead(pair: string, candles: CandleInput[]): SignalRead {
  const closes = candles.map((c) => c.close);
  // Composite cold start: until the longest input (BB long period, 100
  // bars) is warm we report NO numbers — a partial read on sparse history
  // reads as fabricated. Summary then says so plainly.
  const warm = candles.length >= 100;
  const r = warm ? rsi(closes, 21) : undefined;
  const m = warm ? macd(closes) : undefined;
  const b = warm ? emaBbSignal(candles) : undefined;

  const trend: SignalRead['trend'] = b?.trend ?? 'neutral';
  const trendText =
    trend === 'bullish'
      ? `above BB-1 signal zone (%B ${b!.percentB.toFixed(0)})`
      : trend === 'bearish'
        ? `below BB-1 signal zone (%B ${b!.percentB.toFixed(0)})`
        : b
          ? `inside BB-1 signal zone (%B ${b.percentB.toFixed(0)})`
          : 'insufficient history for BB';

  const parts: string[] = [];
  if (r !== undefined) {
    parts.push(`RSI(21) ${r.toFixed(1)} ${r > 60 ? 'stretched up' : r < 40 ? 'stretched down' : 'mid-range'}`);
  }
  if (m) {
    parts.push(
      `MACD ${m.cross ? `${m.cross} cross` : m.histogram > 0 ? 'positive histogram' : 'negative histogram'}`
    );
  }
  if (b) {
    parts.push(`price ${trend === 'bullish' ? 'above' : trend === 'bearish' ? 'below' : 'inside'} the 20x3 band`);
  }

  return {
    pair,
    computedAt: Date.now(),
    bars: candles.length,
    rsi21: r,
    rsiText: rsiLabel(r),
    macd: m,
    macdText: macdLabel(m),
    bb: b,
    trend,
    trendText,
    summary: parts.length ? parts.join('; ') + '.' : 'Not enough kline history yet — signals warm up as data arrives.',
    disclaimer: 'rules-based indicator read (RSI/MACD/BB, pine-spec ports) · simulated · not advice',
  };
}
