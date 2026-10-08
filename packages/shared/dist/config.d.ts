import { Asset, Pair } from './domain';
export declare const ASSET_SHORTLIST: Asset[];
export declare const PAIRS: Pair[];
export declare const FEE_SCHEDULE: {
    maker: number;
    taker: number;
};
export declare const TIMEFRAMES: readonly ["1m", "5m", "15m", "1h", "4h", "1D"];
export type Timeframe = typeof TIMEFRAMES[number];
export declare const DEMO_FUNDS_USDT = 100000;
export declare const DEMO_ALLOCATION: Record<Asset, number>;
export declare const COLOR_CONVENTION: "green-up" | "red-up";
export declare const FEED_URLS: {
    readonly binance: {
        readonly rest: "https://data-api.binance.vision";
        readonly ws: "wss://stream.binance.com:9443";
    };
    readonly bybit: {
        readonly rest: "https://api.bybit.com";
        readonly ws: "wss://stream.bybit.com/v5/public/spot";
    };
    readonly fx: "https://open.er-api.com/v6/latest/USD";
};
export declare const WS_CONFIG: {
    reconnectDelayMs: number;
    maxReconnectDelayMs: number;
    heartbeatIntervalMs: number;
};
export declare const DISCLAIMER_TEXT = "Reference data \u00B7 Demo only \u00B7 Not a real venue \u00B7 Not financial advice";
export declare const ENGINE_PORT: number;
export declare const TERMINAL_PORT: number;
export declare const FX_CACHE_TTL_SECONDS: number;
//# sourceMappingURL=config.d.ts.map