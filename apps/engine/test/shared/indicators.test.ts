// Indicator ports — numeric pins for the pine-spec TS ports in
// packages/shared/src/indicators.ts. Pure functions → deterministic tests.
import { describe, it, expect } from 'vitest';
import {
  sma,
  stdev,
  emaSeries,
  rsi,
  macd,
  emaBbSignal,
  computeSignalRead,
  type CandleInput,
} from '@trading/shared';

const rising = (n: number) => Array.from({ length: n }, (_, i) => 100 + i);
const falling = (n: number) => Array.from({ length: n }, (_, i) => 100 - i);
const flat = (n: number) => Array.from({ length: n }, () => 100);

// Uniform candles around a base price (deterministic wiggle via sine-free
// alternating offsets so tests stay exact).
function candles(closes: number[]): CandleInput[] {
  return closes.map((c, i) => ({
    openTime: 1_700_000_000_000 + i * 60_000,
    open: i === 0 ? c : closes[i - 1],
    high: Math.max(c, closes[i - 1] ?? c) + 0.5,
    low: Math.min(c, closes[i - 1] ?? c) - 0.5,
    close: c,
    volume: 10,
  }));
}

describe('primitives', () => {
  it('sma: window mean, undefined when short', () => {
    expect(sma([1, 2, 3], 3)).toBe(2);
    expect(sma([1, 2, 3, 4], 3)).toBe(3);
    expect(sma([1, 2], 3)).toBeUndefined();
    expect(sma([], 1)).toBeUndefined();
    expect(sma([1, 2, 3], 0)).toBeUndefined();
  });

  it('stdev: population sd over last window', () => {
    // [1,2,3] mean 2 -> sqrt(((1)^2+0+(1)^2)/3)
    expect(stdev([1, 2, 3], 3)).toBeCloseTo(Math.sqrt(2 / 3), 12);
    expect(stdev(flat(5), 4)).toBe(0);
    expect(stdev([1], 2)).toBeUndefined();
  });

  it('emaSeries: SMA-seeded, stable on flat input', () => {
    const e = emaSeries(flat(10), 5);
    expect(e).toHaveLength(6); // n - period + 1
    expect(e.every((v) => v === 100)).toBe(true);
    expect(emaSeries([1, 2], 5)).toHaveLength(0);
  });

  it('emaSeries: rising input converges upward', () => {
    const e = emaSeries(rising(30), 10);
    const last = e[e.length - 1];
    expect(last).toBeGreaterThan(100);
    expect(last).toBeLessThan(129); // lags the spot price 129
  });
});

describe('rsi (pine 01, Wilder, len 21)', () => {
  it('flat market = exactly 50 (no movement)', () => {
    expect(rsi(flat(40), 21)).toBe(50);
  });

  it('all-gain market = 100, all-loss = 0', () => {
    expect(rsi(rising(40), 21)).toBe(100);
    expect(rsi(falling(40), 21)).toBe(0);
  });

  it('returns undefined until period+1 bars', () => {
    expect(rsi(flat(21), 21)).toBeUndefined();
    expect(rsi(flat(22), 21)).toBe(50);
  });

  it('mid-series reversal lands between extremes', () => {
    const up = rising(25);
    const mixed = [...up, ...falling(15)];
    const v = rsi(mixed, 21);
    expect(v).toBeDefined();
    expect(v!).toBeGreaterThan(0);
    expect(v!).toBeLessThan(100);
  });
});

describe('macd (pine 03, 12/26/9)', () => {
  it('rejects invalid lengths', () => {
    expect(macd(rising(50), 0, 26, 9)).toBeUndefined();
    expect(macd(rising(50), 26, 12, 9)).toBeUndefined(); // fast >= slow
  });

  it('undefined before slow seed exists', () => {
    expect(macd(flat(10))).toBeUndefined();
  });

  it('flat market: macd 0, signal 0, hist 0, no cross', () => {
    const m = macd(flat(80));
    expect(m).toBeDefined();
    expect(m!.macd).toBeCloseTo(0, 9);
    expect(m!.signal).toBeCloseTo(0, 9);
    expect(m!.histogram).toBeCloseTo(0, 9);
    expect(m!.cross).toBeNull();
  });

  it('steady uptrend: macd positive, no spurious cross', () => {
    const m = macd(rising(120));
    expect(m).toBeDefined();
    expect(m!.macd).toBeGreaterThan(0);
    expect(m!.cross).toBeNull();
  });

  it('detects a bullish cross on a V-shaped series', () => {
    const vShape = [...falling(40), ...rising(40)];
    // Find any bullish cross flag across the tail evaluation. The cross
    // lands at the V bottom (end=41: falling linear series pins hist at 0,
    // first rising bar pushes it positive), so the scan must start right
    // after the macd warm-up floor (34 closes), not at 50.
    let sawBull = false;
    for (let end = 35; end <= vShape.length; end++) {
      const m = macd(vShape.slice(0, end));
      if (m?.cross === 'bullish') sawBull = true;
    }
    expect(sawBull).toBe(true);
  });
});

describe('emaBbSignal (pine 02 core, 20x3/75x4/100x4.25, NW h=6)', () => {
  it('undefined until long-period bars exist', () => {
    expect(emaBbSignal(candles(flat(99)))).toBeUndefined();
  });

  it('flat market: %B pinned at 50, trend neutral', () => {
    const b = emaBbSignal(candles(flat(150)));
    expect(b).toBeDefined();
    expect(b!.percentB).toBeCloseTo(50, 6);
    expect(b!.trend).toBe('neutral');
  });

  it('steady uptrend: bullish per the 40/60 zone', () => {
    const b = emaBbSignal(candles(rising(150)));
    expect(b).toBeDefined();
    expect(b!.trend).toBe('bullish');
    expect(b!.percentB).toBeGreaterThan(60);
  });

  it('steady downtrend: bearish per the 40/60 zone', () => {
    const b = emaBbSignal(candles(falling(150)));
    expect(b).toBeDefined();
    expect(b!.trend).toBe('bearish');
    expect(b!.percentB).toBeLessThan(40);
  });
});

describe('computeSignalRead (AiPanel composite)', () => {
  it('cold start: honest summary, no fabricated numbers', () => {
    const s = computeSignalRead('BTCUSDT', candles(flat(30)));
    expect(s.bars).toBe(30);
    expect(s.rsi21).toBeUndefined();
    expect(s.macd).toBeUndefined();
    expect(s.bb).toBeUndefined();
    expect(s.summary).toMatch(/Not enough kline history/i);
    expect(s.disclaimer).toMatch(/simulated/);
  });

  it('warm market: populated fields and deterministic output', () => {
    const cs = candles(rising(150));
    const a = computeSignalRead('BTCUSDT', cs);
    const b = computeSignalRead('BTCUSDT', cs);
    // pure function -> identical reads (computedAt excluded: it timestamps)
    const { computedAt: _ta, ...ra } = a;
    const { computedAt: _tb, ...rb } = b;
    expect(ra).toEqual(rb);
    expect(a.trend).toBe('bullish');
    expect(a.rsi21).toBe(100);
    expect(a.macd!.macd).toBeGreaterThan(0);
    expect(a.summary).toContain('RSI(21)');
  });
});
