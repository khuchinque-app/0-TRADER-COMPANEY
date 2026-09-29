// REST and WebSocket message contracts between engine and terminal.
// TRUTH SOURCE: apps/engine/src/server/ws.ts + rest.ts — update this file
// to match the engine, never the other way around. (This file used to be
// fiction: zero importers, types the engine never sent. It is now imported
// by ws.ts itself so drift fails at compile time.)

import type { Ticker, OrderBook, Candle, Fill, Order, DemoAccount, FxRate, Pair, OrderSide, OrderType } from './domain';

// ===== REST Response Types (shapes rest.ts actually returns) =====

// GET /api/market/:pair — { pair, book, ticker, klines, recentFills }
export interface MarketSnapshot {
  pair: Pair;
  book: OrderBook;
  ticker: Ticker | null;
  klines: Candle[];
  recentFills: Fill[];
}

// GET /api/ledger/:userId — bare DemoAccount (auto-created on first call)
export type LedgerResponse = DemoAccount;

// GET /api/ledger/:userId/journal?limit= — bare JournalEntry[]
import type { JournalEntry } from './domain';
export type JournalResponse = JournalEntry[];

// GET /api/fx — { rate: { usdToIdr, fetchedAt } }
export interface FxResponse {
  rate: FxRate;
}

// ===== WebSocket envelope (ws.ts: every frame is {type, seq?, payload}) =====

export type WsInboundType = 'order' | 'cancel' | 'resume' | 'ping';

export interface WsInboundOrder {
  type: 'order';
  seq?: number;
  payload: {
    userId: string;
    pair: Pair;
    side: OrderSide;
    type: OrderType;
    price: number;      // 0 for market
    quantity: number;
  };
}

export interface WsInboundCancel {
  type: 'cancel';
  seq?: number;
  payload: { userId: string; orderId: string };
}

export interface WsInboundResume {
  type: 'resume';
  payload: { lastSeq: number };
}

export interface WsInboundPing {
  type: 'ping';
  payload?: Record<string, never>;
}

export type WsInbound =
  | WsInboundOrder
  | WsInboundCancel
  | WsInboundResume
  | WsInboundPing;

export type WsOutboundType =
  | 'ticker'        // feed tick: { symbol, price, timestamp }
  | 'trade'         // feed print: { symbol, price, quantity, side, timestamp }
  | 'order'         // Order placed/updated (broadcast on accept + per fill state)
  | 'fill'          // Fill (one per leg)
  | 'cancel_ack'    // { orderId }
  | 'ack'           // { seq } echo for inbound frames carrying seq
  | 'replay'        // { messages: Envelope[], nextSeq }
  | 'snapshot'      // full book state on reconnect before replay
  | 'pong'          // { serverSeq }
  | 'error';        // { message }

export interface WsEnvelope<T = unknown> {
  type: WsOutboundType;
  seq?: number;
  payload: T;
}

export interface TickerPayload { symbol: string; price: number; timestamp: number; }
export interface TradePayload { symbol: string; price: number; quantity: number; side: 'buy' | 'sell'; timestamp: number; }
export interface ReplayPayload { messages: WsEnvelope[]; nextSeq: number; }

export type WsOutbound =
  | WsEnvelope<TickerPayload>
  | WsEnvelope<TradePayload>
  | WsEnvelope<Order>
  | WsEnvelope<Fill>
  | WsEnvelope<{ orderId: string }>
  | WsEnvelope<{ seq: number }>
  | WsEnvelope<ReplayPayload>
  | WsEnvelope<unknown>            // snapshot
  | WsEnvelope<{ serverSeq: number }>
  | WsEnvelope<{ message: string }>;

// ===== Tick Event (feed layer, binance.ts -> index.ts) =====

export interface TickEvent {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  isBuyerMaker: boolean;
}
