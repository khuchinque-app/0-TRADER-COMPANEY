export type Asset = 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'XRP' | 'LINK' | 'AAVE';
export type Pair = `${Asset}USDT`;
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export interface Candle {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    quoteVolume: number;
    trades: number;
}
export interface BookLevel {
    price: number;
    quantity: number;
    /** Set when this level is a resting user limit order (not synthetic depth) */
    orderId?: string;
    userId?: string;
}
export interface OrderBook {
    symbol: string;
    asks: BookLevel[];
    bids: BookLevel[];
    timestamp: number;
}
export interface Ticker {
    symbol: string;
    lastPrice: number;
    priceChange: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    quoteVolume: number;
    timestamp: number;
}
export interface Order {
    id: string;
    userId: string;
    pair: Pair;
    side: OrderSide;
    type: OrderType;
    price: number;
    quantity: number;
    filledQuantity: number;
    status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
    createdAt: number;
    updatedAt: number;
}
export interface Fill {
    id: string;
    orderId: string;
    userId: string;
    pair: Pair;
    side: OrderSide;
    price: number;
    quantity: number;
    fee: number;
    feeAsset: Asset;
    /** Set when the fill matched another user's resting order (enables conservation checks) */
    counterOrderId?: string;
    timestamp: number;
}
export interface Balance {
    asset: Asset | 'USDT';
    available: number;
    locked: number;
}
export interface Position {
    pair: Pair;
    asset: Asset;
    quantity: number;
    avgEntryPrice: number;
}
export interface DemoAccount {
    userId: string;
    balances: Balance[];
    positions: Position[];
    totalValueUsdt: number;
}
export interface FxRate {
    usdToIdr: number;
    fetchedAt: number;
}
export interface FxUsdtIdrResponse {
    rate: number;
    source: string;
    ts: number;
    stale?: boolean;
}
export interface JournalEntry {
    id: string;
    timestamp: number;
    description: string;
    debits: JournalLine[];
    credits: JournalLine[];
}
export interface JournalLine {
    accountId: string;
    asset: Asset | 'USDT';
    amount: number;
}
export type LedgerState = {
    account: string;
    balances: Record<string, number>;
    journal: JournalEntry[];
};
//# sourceMappingURL=domain.d.ts.map