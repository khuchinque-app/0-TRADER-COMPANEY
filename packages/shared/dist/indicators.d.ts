export interface CandleInput {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
/** Simple moving average of the LAST `period` values. */
export declare function sma(values: number[], period: number): number | undefined;
/** Population standard deviation over the LAST `period` values (pine ta.stdev). */
export declare function stdev(values: number[], period: number): number | undefined;
/** EMA series (SMA-seeded, pine ta.ema convention). Returns full series. */
export declare function emaSeries(values: number[], period: number): number[];
/** Wilder RSI. Returns undefined until `period + 1` closes exist. */
export declare function rsi(closes: number[], period?: number): number | undefined;
/** Label per the pine script's guide lines: high 60 / mid 50 / low 40. */
export declare function rsiLabel(v: number | undefined): string;
export interface MacdResult {
    macd: number;
    signal: number;
    histogram: number;
    cross: 'bullish' | 'bearish' | null;
}
/** MACD line = EMA(fast) - EMA(slow); signal = EMA(macdLine, signalLen). */
export declare function macd(closes: number[], fast?: number, slow?: number, signal?: number): MacdResult | undefined;
export declare function macdLabel(v: MacdResult | undefined): string;
export interface BbLevel {
    upper: number;
    lower: number;
}
export interface EmaBbResult {
    tpSmoothed: number;
    levels: {
        short: BbLevel;
        med: BbLevel;
        long: BbLevel;
    };
    percentB: number;
    trend: 'bullish' | 'bearish' | 'neutral';
}
/**
 * Port of the fluxchart script's computable core: TP=(H+L+C)/3, three
 * Bollinger levels (20x3 / 75x4 / 100x4.25), NW smoothing h=6, and the
 * 40/60 signal zone applied to level-1 %B. k-NN filter NOT ported.
 */
export declare function emaBbSignal(candles: CandleInput[], opts?: {
    short?: {
        period: number;
        dev: number;
    };
    med?: {
        period: number;
        dev: number;
    };
    long?: {
        period: number;
        dev: number;
    };
    h?: number;
}): EmaBbResult | undefined;
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
export declare function computeSignalRead(pair: string, candles: CandleInput[]): SignalRead;
//# sourceMappingURL=indicators.d.ts.map