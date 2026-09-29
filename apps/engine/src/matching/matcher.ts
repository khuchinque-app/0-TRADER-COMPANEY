// T4: Paper Matching Engine
// Implements price-time priority matching algorithm for the paper venue
// This is seam #3 - where demo becomes real execution

import type { Order, Fill, OrderBook, BookLevel, Pair, Asset, OrderSide, OrderType } from '@trading/shared';
import { createSyntheticBook, updateBookMid } from './synthetic-book';
import { calculateFee, DEFAULT_FEE_SCHEDULE } from './fees';

/** Below this quantity a level is considered exhausted (float dust guard) */
export const QTY_EPSILON = 1e-9;

export interface MatcherConfig {
  /** Minimum order quantity */
  minOrderQty: number;
  /** Max order quantity per transaction */
  maxOrderQty: number;
  /** Price tick size */
  tickSize: number;
  /** Order ID generator */
  orderIdGenerator: () => string;
  /** Fill ID generator */
  fillIdGenerator: () => string;
  /**
   * Optional buying-power check: available balance for (user, asset).
   * When set, market/limit orders are rejected if the taker cannot pay
   * (buys: full sweep cost + fee; sells: base quantity held).
   * When unset (tests/paper sim), no check.
   */
  getBalance?: (userId: string, asset: string) => number;
}

const DEFAULT_CONFIG: MatcherConfig = {
  minOrderQty: 0.0001,
  maxOrderQty: 1000,
  tickSize: 0.01,
  orderIdGenerator: () => `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  fillIdGenerator: () => `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
};

export class Matcher {
  private config: MatcherConfig;
  private orderBook: Map<string, OrderBook> = new Map();
  private openOrders: Map<string, Order> = new Map();
  /** Every order ever placed (settled ones too) — needed to settle maker legs */
  private allOrders: Map<string, Order> = new Map();
  /** Orders with fills produced this session, drained by the settlement caller */
  private pendingSettlement: Map<string, Order> = new Map();
  private fills: Fill[] = [];
  private midPrices: Map<string, number> = new Map();

  constructor(config?: Partial<MatcherConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize a pair with a synthetic book
   */
  initPair(pair: Pair, midPrice: number): void {
    const book = createSyntheticBook(pair, midPrice);
    this.orderBook.set(pair, book);
    this.midPrices.set(pair, midPrice);
  }

  /**
   * Update mid price for a pair (from feed).
   * Only synthetic depth re-prices; resting user orders keep their own price.
   */
  updateMid(pair: Pair, newMid: number): void {
    if (!Number.isFinite(newMid) || newMid <= 0) return;
    const book = this.orderBook.get(pair);
    if (book) {
      const updatedBook = updateBookMid(book, newMid);
      this.orderBook.set(pair, updatedBook);
      this.midPrices.set(pair, newMid);
    } else {
      this.midPrices.set(pair, newMid);
    }
  }

  /** All pairs with an initialized book */
  getPairs(): Pair[] {
    return Array.from(this.orderBook.keys()) as Pair[];
  }

  /** Cached mid price for a pair */
  getMidPrice(pair: Pair): number | undefined {
    return this.midPrices.get(pair);
  }

  /**
   * Place a new order
   */
  placeOrder(userId: string, pair: Pair, side: OrderSide, type: OrderType, price: number, quantity: number): Order {
    // Validate order — reject NaN/Infinity explicitly (NaN fails both < and > checks)
    if (!Number.isFinite(quantity)) {
      throw new Error(`Order quantity must be a finite number, got ${quantity}`);
    }
    if (quantity < this.config.minOrderQty) {
      throw new Error(`Order quantity ${quantity} below minimum ${this.config.minOrderQty}`);
    }
    if (quantity > this.config.maxOrderQty) {
      throw new Error(`Order quantity ${quantity} exceeds maximum ${this.config.maxOrderQty}`);
    }
    if (type === 'limit' && (!Number.isFinite(price) || price <= 0)) {
      throw new Error(`Limit order price must be a positive finite number, got ${price}`);
    }
    if (type === 'market' && price !== 0) {
      price = 0; // market orders carry no price
    }

    const orderId = this.config.orderIdGenerator();
    const now = Date.now();

    const order: Order = {
      id: orderId,
      userId,
      pair,
      side,
      type,
      price,
      quantity,
      filledQuantity: 0,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    this.openOrders.set(orderId, order);
    this.allOrders.set(orderId, order);
    this.pendingSettlement.set(orderId, order);

    // Initialize pair if needed
    if (!this.orderBook.has(pair)) {
      const midPrice = this.midPrices.get(pair) || 50000;
      this.initPair(pair, midPrice);
    }

    // Match order against book; if the gate rejects it, un-register —
    // a rejected order must not linger in allOrders and reserve funds.
    try {
      this.matchOrder(order);
    } catch (e) {
      this.openOrders.delete(orderId);
      this.allOrders.delete(orderId);
      this.pendingSettlement.delete(orderId);
      throw e;
    }

    return order;
  }

  /**
   * Match order against order book (price-time priority)
   */
  private matchOrder(order: Order): void {
    const book = this.orderBook.get(order.pair);
    if (!book) return;

    // Buying-power gate (only when a provider is wired)
    if (this.config.getBalance) {
      this.checkBuyingPower(order, book);
    }

    if (order.type === 'market') {
      // Market order: fill against best available price
      this.fillMarketOrder(order, book);
    } else {
      // Limit order: match crossing levels, then rest the remainder
      this.addLimitOrder(order, book);
    }
  }

  /**
   * Reject orders the taker cannot pay for.
   * Sell: base asset held >= quantity.
   * Buy: worst-case cost across the levels that CAN match (sweep price +
   * taker fee), not just qty*limit.
   */
  private checkBuyingPower(order: Order, book: OrderBook): void {
    const baseAsset = order.pair.replace('USDT', '');
    const getBal = this.config.getBalance!;

    if (order.side === 'sell') {
      const held = getBal(order.userId, baseAsset) - this.reservedFor(order.userId, baseAsset, 'sell', order.id);
      if (held < order.quantity - QTY_EPSILON) {
        throw new Error(`Insufficient ${baseAsset}: have ${held}, need ${order.quantity}`);
      }
      return;
    }

    // Buy: walk the levels that match and accumulate worst-case cost
    let remaining = order.quantity;
    let cost = 0;
    const asks = order.type === 'market'
      ? book.asks
      : book.asks.filter(a => a.price <= order.price);
    for (const ask of asks) {
      if (remaining <= QTY_EPSILON) break;
      if (ask.quantity <= QTY_EPSILON) continue;
      const q = Math.min(ask.quantity, remaining);
      cost += q * ask.price;
      remaining -= q;
    }
    // Unmatched remainder of a limit buy executes at worst at the limit price
    if (remaining > QTY_EPSILON && order.type === 'limit') {
      cost += remaining * order.price;
    }
    // Fee headroom on the full notional (taker rate — conservative upper
    // bound; resting maker legs would pay less, but reserving more is safe)
    cost += cost * DEFAULT_FEE_SCHEDULE.taker + DEFAULT_FEE_SCHEDULE.minFee;

    const have = getBal(order.userId, 'USDT') - this.reservedFor(order.userId, 'USDT', 'buy', order.id);
    if (have < cost - QTY_EPSILON) {
      throw new Error(`Insufficient USDT: have ${have}, need ~${cost.toFixed(2)}`);
    }
  }

  /**
   * Notional already committed by this user's LIVE resting orders.
   * Fills drain synchronously in the same WS handler (settled => balance
   * moved, order terminal), so only non-terminal orders need reserving.
   * Without this, N resting bids could all pass the gate on the same USDT.
   */
  private reservedFor(userId: string, asset: string, kind: 'buy' | 'sell', excludeOrderId?: string): number {
    let reserved = 0;
    for (const o of this.allOrders.values()) {
      if (o.userId !== userId) continue;
      // The order being placed is already in allOrders when the gate runs —
      // don't count it against itself.
      if (excludeOrderId && o.id === excludeOrderId) continue;
      if (o.status !== 'open' && o.status !== 'partially_filled') continue;
      const base = o.pair.replace('USDT', '');
      const remaining = o.quantity - o.filledQuantity;
      if (kind === 'sell' && o.side === 'sell' && asset === base) {
        reserved += remaining;
      } else if (kind === 'buy' && o.side === 'buy' && asset === 'USDT' && o.type === 'limit') {
        // reserve limit notional + fee headroom at the limit price
        reserved += remaining * o.price * 1.01;
      }
    }
    return reserved;
  }

  /**
   * Consume liquidity from the opposite side of the book.
   * Shared by market orders and crossing limit orders.
   * Creates taker fills AND maker fills for resting user levels,
   * charges fees on every fill, updates maker order state.
   */
  private executeAgainstLevels(
    taker: Order,
    levels: BookLevel[],
    matchable: (level: BookLevel) => boolean
  ): void {
    let remaining = taker.quantity - taker.filledQuantity;

    for (const level of levels) {
      if (remaining <= QTY_EPSILON) break;
      if (!matchable(level)) continue;
      // Self-trade prevention: never match the same user's resting order
      if (level.userId && level.userId === taker.userId) continue;
      if (level.quantity <= QTY_EPSILON) continue;

      const fillQty = Math.min(level.quantity, remaining);

      // Taker fill (taker fee); counterOrderId links the user-vs-user trade
      this.createFill(taker, level.price, fillQty, false, level.orderId);

      // Maker fill: resting user level has a real order behind it — settle it too.
      // Guard on the level's identity: the order object must still belong to the
      // level's user (duplicate-ID corruption otherwise settles the wrong order).
      if (level.orderId && level.userId) {
        const makerOrder = this.allOrders.get(level.orderId);
        if (makerOrder && makerOrder.status !== 'cancelled'
            && makerOrder.id === level.orderId && makerOrder.userId === level.userId) {
          this.createFill(makerOrder, level.price, fillQty, true, taker.id);
          this.pendingSettlement.set(makerOrder.id, makerOrder);
          if (level.quantity - fillQty <= QTY_EPSILON) {
            this.finalizeMakerOrder(makerOrder);
          }
        }
      }

      level.quantity -= fillQty;
      remaining -= fillQty;
    }
  }

  /**
   * A maker order whose resting level is exhausted: mark filled and stop tracking
   */
  private finalizeMakerOrder(makerOrder: Order): void {
    makerOrder.updatedAt = Date.now();
    if (makerOrder.filledQuantity >= makerOrder.quantity - QTY_EPSILON) {
      makerOrder.status = 'filled';
      this.openOrders.delete(makerOrder.id);
    } else {
      // Partially consumed but the level is gone — keep it visible as partial
      makerOrder.status = 'partially_filled';
    }
  }

  /**
   * Fill market order against best prices.
   * If the book runs dry, the order is PARTIALLY filled — never a fake full fill.
   */
  private fillMarketOrder(order: Order, book: OrderBook): void {
    const levels = order.side === 'buy' ? book.asks : book.bids;
    this.executeAgainstLevels(order, levels, () => true);

    // Remove exhausted levels (dust guard)
    if (order.side === 'buy') {
      book.asks = book.asks.filter(a => a.quantity > QTY_EPSILON);
    } else {
      book.bids = book.bids.filter(b => b.quantity > QTY_EPSILON);
    }

    // Status reflects ACTUAL filled quantity, not requested quantity
    order.updatedAt = Date.now();
    if (order.filledQuantity >= order.quantity - QTY_EPSILON) {
      order.status = 'filled';
    } else if (order.filledQuantity > 0) {
      order.status = 'partially_filled';
    } else {
      order.status = 'cancelled'; // nothing available at all
    }
    // Unfilled portion of a market order does not rest on the book
    this.openOrders.delete(order.id);
  }

  /**
   * Add limit order to book and try to match
   */
  private addLimitOrder(order: Order, book: OrderBook): void {
    // Try to match against opposite side (price-time priority preserved by
    // array order; crossing boundary: buy fills at ask <= limit, sell at bid >= limit)
    if (order.side === 'buy') {
      this.executeAgainstLevels(order, book.asks, (a) => a.price <= order.price);
      book.asks = book.asks.filter(a => a.quantity > QTY_EPSILON);
    } else {
      this.executeAgainstLevels(order, book.bids, (b) => b.price >= order.price);
      book.bids = book.bids.filter(b => b.quantity > QTY_EPSILON);
    }

    const remaining = order.quantity - order.filledQuantity;
    order.updatedAt = Date.now();

    if (remaining > QTY_EPSILON) {
      // Rest the remainder. NOTE: order.quantity stays the ORIGINAL size;
      // only the unfilled part sits on the book.
      const level: BookLevel = {
        price: order.price,
        quantity: remaining,
        orderId: order.id,
        userId: order.userId,
      };
      if (order.side === 'buy') {
        book.bids.push(level);
        book.bids.sort((a, b) => b.price - a.price); // Descending
      } else {
        book.asks.push(level);
        book.asks.sort((a, b) => a.price - b.price); // Ascending
      }
      order.status = order.filledQuantity > 0 ? 'partially_filled' : 'open';
      this.openOrders.set(order.id, order);
    } else {
      // Fully filled
      order.status = 'filled';
      this.openOrders.delete(order.id);
    }
  }

  /**
   * Create a fill event. isMaker picks the fee side; counterOrderId links
   * both legs of a user-vs-user trade so settlement can verify conservation.
   */
  private createFill(order: Order, price: number, quantity: number, isMaker: boolean, counterOrderId?: string): Fill {
    const fillId = this.config.fillIdGenerator();
    const fee = calculateFee(quantity, price, isMaker);
    const fill: Fill = {
      id: fillId,
      orderId: order.id,
      userId: order.userId,
      pair: order.pair,
      side: order.side,
      price,
      quantity,
      fee,
      feeAsset: 'USDT' as Asset, // Venue settles fees in USDT
      counterOrderId,
      timestamp: Date.now(),
    };
    this.fills.push(fill);
    order.filledQuantity += quantity;
    return fill;
  }

  /**
   * Cancel an order
   */
  cancelOrder(userId: string, orderId: string): Order | null {
    const order = this.openOrders.get(orderId) ?? this.allOrders.get(orderId);
    if (!order) return null;
    if (order.userId !== userId) return null;
    // Settled orders cannot be cancelled (post-settlement flip guard)
    if (order.status === 'filled' || order.status === 'cancelled') return null;

    order.status = 'cancelled';
    order.updatedAt = Date.now();

    // Remove from book by ORDER ID identity — never by value equality
    const book = this.orderBook.get(order.pair);
    if (book) {
      book.bids = book.bids.filter(l => l.orderId !== order.id);
      book.asks = book.asks.filter(l => l.orderId !== order.id);
    }

    this.openOrders.delete(orderId);
    return order;
  }

  /**
   * Get order book for a pair
   */
  getOrderBook(pair: Pair): OrderBook | null {
    return this.orderBook.get(pair) || null;
  }

  /**
   * Get fills for an order
   */
  getFills(orderId: string): Fill[] {
    return this.fills.filter(f => f.orderId === orderId);
  }

  /**
   * Get maker-side fills produced by someone else's taker order against
   * this order (they must be settled too, keyed by counterOrderId)
   */
  getMakerFillsForOrder(orderId: string): Fill[] {
    return this.fills.filter(f => f.counterOrderId === orderId);
  }

  /**
   * Get all open orders for a user
   */
  getOpenOrders(userId: string): Order[] {
    return Array.from(this.openOrders.values()).filter(
      o => o.userId === userId && (o.status === 'open' || o.status === 'partially_filled')
    );
  }

  /**
   * Get recent fills
   */
  getRecentFills(limit = 50): Fill[] {
    return this.fills.slice(-limit).reverse();
  }

  /**
   * Drain orders that accrued fills since the last drain (taker AND maker
   * legs), each with its complete fill list. The settlement caller (ws.ts)
   * persists these so resting maker orders reach the ledger too.
   */
  drainPendingSettlements(): { order: Order; fills: Fill[] }[] {
    const batch = Array.from(this.pendingSettlement.values()).map((order) => ({
      order,
      fills: this.fills.filter(f => f.orderId === order.id),
    }));
    this.pendingSettlement.clear();
    return batch;
  }
}
