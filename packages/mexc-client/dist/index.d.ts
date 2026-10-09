export interface MexcResponse<T> {
    ok: boolean;
    status: number;
    data: T | null;
    error?: string;
}
export interface MexcExchangeInfoSymbol {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed: boolean;
    [k: string]: unknown;
}
export interface MexcExchangeInfo {
    symbols: MexcExchangeInfoSymbol[];
    timezone?: string;
    [k: string]: unknown;
}
export interface MexcTicker24h {
    symbol: string;
    lastPrice: string;
    openPrice: string;
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    [k: string]: unknown;
}
export interface MexcPriceTicker {
    symbol: string;
    price: string;
}
export interface MexcBookTicker {
    symbol: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
}
export interface MexcDepth {
    bids: [string, string][];
    asks: [string, string][];
}
export interface MexcTrade {
    id: string | number;
    price: string;
    qty: string;
    time: number;
    isBuyerMaker: boolean;
    [k: string]: unknown;
}
export interface MexcKline {
    0: number;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    [k: number]: unknown;
}
export declare const mexc: {
    /** GET /ping — health */
    ping: () => Promise<MexcResponse<Record<string, never>>>;
    /** GET /time — server time */
    time: () => Promise<MexcResponse<{
        serverTime: number;
    }>>;
    /** GET /exchangeInfo — pair universe */
    exchangeInfo: (symbols?: string[]) => Promise<MexcResponse<MexcExchangeInfo>>;
    /** GET /ticker/24hr — bulk or single */
    ticker24hr: (symbol?: string) => Promise<MexcResponse<MexcTicker24h | MexcTicker24h[]>>;
    /** GET /ticker/price — last price bulk or single */
    tickerPrice: (symbol?: string) => Promise<MexcResponse<MexcPriceTicker | MexcPriceTicker[]>>;
    /** GET /ticker/bookTicker — best bid/ask bulk or single */
    bookTicker: (symbol?: string) => Promise<MexcResponse<MexcBookTicker | MexcBookTicker[]>>;
    /** GET /depth — order book */
    depth: (symbol: string, limit?: number) => Promise<MexcResponse<MexcDepth>>;
    /** GET /trades — recent trade tape (limit <= 1000) */
    trades: (symbol: string, limit?: number) => Promise<MexcResponse<MexcTrade[]>>;
    /** GET /aggTrades */
    aggTrades: (symbol: string, limit?: number) => Promise<MexcResponse<MexcTrade[]>>;
    /** GET /klines — candles */
    klines: (symbol: string, interval: string, limit?: number) => Promise<MexcResponse<MexcKline[]>>;
    /** GET /avgPrice */
    avgPrice: (symbol: string) => Promise<MexcResponse<{
        mins: number;
        price: string;
    }>>;
};
export default mexc;
