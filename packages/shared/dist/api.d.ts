import type { Ticker, OrderBook, Candle, Fill, Order, DemoAccount, FxRate, Pair, OrderSide, OrderType } from './domain';
export interface MarketSnapshot {
    pair: Pair;
    book: OrderBook;
    ticker: Ticker | null;
    klines: Candle[];
    recentFills: Fill[];
}
export type LedgerResponse = DemoAccount;
import type { JournalEntry } from './domain';
export type JournalResponse = JournalEntry[];
export interface FxResponse {
    rate: FxRate;
}
export type WsInboundType = 'order' | 'cancel' | 'resume' | 'ping';
export interface WsInboundOrder {
    type: 'order';
    seq?: number;
    payload: {
        userId: string;
        pair: Pair;
        side: OrderSide;
        type: OrderType;
        price: number;
        quantity: number;
    };
}
export interface WsInboundCancel {
    type: 'cancel';
    seq?: number;
    payload: {
        userId: string;
        orderId: string;
    };
}
export interface WsInboundResume {
    type: 'resume';
    payload: {
        lastSeq: number;
    };
}
export interface WsInboundPing {
    type: 'ping';
    payload?: Record<string, never>;
}
export type WsInbound = WsInboundOrder | WsInboundCancel | WsInboundResume | WsInboundPing;
export type WsOutboundType = 'ticker' | 'trade' | 'order' | 'fill' | 'cancel_ack' | 'ack' | 'replay' | 'snapshot' | 'pong' | 'error';
export interface WsEnvelope<T = unknown> {
    type: WsOutboundType;
    seq?: number;
    payload: T;
}
export interface TickerPayload {
    symbol: string;
    price: number;
    timestamp: number;
}
export interface TradePayload {
    symbol: string;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    timestamp: number;
}
export interface ReplayPayload {
    messages: WsEnvelope[];
    nextSeq: number;
}
export type WsOutbound = WsEnvelope<TickerPayload> | WsEnvelope<TradePayload> | WsEnvelope<Order> | WsEnvelope<Fill> | WsEnvelope<{
    orderId: string;
}> | WsEnvelope<{
    seq: number;
}> | WsEnvelope<ReplayPayload> | WsEnvelope<unknown> | WsEnvelope<{
    serverSeq: number;
}> | WsEnvelope<{
    message: string;
}>;
export interface TickEvent {
    symbol: string;
    price: number;
    quantity: number;
    timestamp: number;
    isBuyerMaker: boolean;
}
//# sourceMappingURL=api.d.ts.map