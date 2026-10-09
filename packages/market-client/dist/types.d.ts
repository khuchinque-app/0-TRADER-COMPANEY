/**
 * types.ts — typed response models for the endpoints in config.ts.
 *
 * Shapes were derived from live sample responses and from the server implementation
 * (apps/backend/src/market.ts). Fields the service may omit (NO_FEED pairs carry no
 * price) are optional rather than fictional defaults.
 */
export type PairState = 'LIVE' | 'NO_FEED';
export type QuoteCurrency = 'IDR' | 'USDT';
export interface PairDescriptor {
    slug: string;
    base: string;
    quote: QuoteCurrency | string;
    inMarket: boolean;
    inDepth: boolean;
    inChart: boolean;
    mexcSymbol: string | null;
    state: PairState;
    tradable?: boolean;
}
export interface PairsResponse {
    generatedAt: string;
    stale: boolean;
    static: string[];
    count: number;
    pairs: PairDescriptor[];
    simulasi: boolean;
}
export interface TickerResponse extends PairDescriptor {
    tradable: boolean;
    lastPrice?: number;
    indicative?: boolean;
    priceChangePercent?: number;
    highPrice?: number;
    lowPrice?: number;
    quoteVolume?: number;
    openPrice?: number;
    bidPrice?: number;
    askPrice?: number;
    stale?: boolean;
    staleSince?: string | null;
    /** Present on NO_FEED responses. */
    dataState?: 'no-feed' | 'stale';
    message?: string;
    simulasi: boolean;
}
export interface BulkTicker {
    slug: string;
    base: string;
    quote: string;
    indicative: boolean;
    mexcSymbol: string;
    state: PairState;
    tradable: boolean;
    lastPrice: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    quoteVolume: number;
    stale: boolean;
    simulasi: boolean;
}
export interface TickersResponse {
    count: number;
    tickers: BulkTicker[];
    stale: boolean;
    staleSince: string | null;
    usdtIdrRate: number;
    simulasi: boolean;
}
/** [price, quantity] pairs, as arrays (the service returns tuples, not objects). */
export type LevelTuple = [number, number];
export interface DepthResponse extends PairDescriptor {
    bids: LevelTuple[];
    asks: LevelTuple[];
    stale?: boolean;
    staleSince?: string | null;
    simulasi: boolean;
}
export interface TapeTrade {
    id: number | string;
    time: number;
    price: number;
    qty: number;
    side: 'buy' | 'sell';
}
export interface TradesResponse extends PairDescriptor {
    count: number;
    trades: TapeTrade[];
    stale?: boolean;
    simulasi: boolean;
}
export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface KlinesResponse extends PairDescriptor {
    interval: string;
    klines: Candle[];
    stale?: boolean;
    simulasi: boolean;
}
export interface HealthResponse {
    ok: boolean;
    mexc: 'up' | 'down';
    mexcLatencyMs: number;
    pairs: number;
    live: number;
    manifestGeneratedAt: string;
    manifestStale: boolean;
    simulasi: boolean;
    timestamp: string;
}
export interface ManifestResponse {
    generatedAt: string;
    stale: boolean;
    static: string[];
    count: number;
    simulasi: boolean;
}
export interface UniversePair {
    slug: string;
    base: string;
    quote: string;
    mexcSymbol: string;
    state: PairState;
}
export interface UniverseResponse {
    count: number;
    pairs: UniversePair[];
    simulasi: boolean;
}
/** The service's common error envelope. */
export interface ErrorEnvelope {
    error: string | {
        code: string;
        message: string;
    };
    message?: string;
    stale?: boolean;
    simulasi?: boolean;
}
/** Map of sub-resource id -> response model, for typed `getMarketSubresource` overloads. */
export interface SubresourceResponseMap {
    health: HealthResponse;
    pairs: PairsResponse;
    tickers: TickersResponse;
    ticker: TickerResponse;
    depth: DepthResponse;
    trades: TradesResponse;
    klines: KlinesResponse;
    manifest: ManifestResponse;
    universe: UniverseResponse;
    myorders: unknown;
}
export type SubresourceId = keyof SubresourceResponseMap;
/** One record in the generated endpoints.json inventory. */
export interface EndpointRecord {
    method: 'GET';
    path: string;
    /** Route template this record was expanded from. */
    template: string;
    scope: 'primary' | 'page-network-call';
    category: string;
    params: Record<string, {
        type: string;
        required: boolean;
        default?: string | number;
        min?: number;
        max?: number;
    }>;
    response_schema: unknown;
    auth: 'none' | 'apiKey' | 'unknown';
    rate_limit: string;
    sample_response: unknown;
    pair?: string;
    content_type?: string;
    status_codes: number[];
    pagination: {
        server_side: boolean;
        strategy: string;
        max_limit?: number;
    };
    streaming: boolean;
    notes: string;
}
