"use client";

import { useState, useEffect } from "react";
import { fetchPairData, fetchTicker, fetchFXRate, fetchBook, OrderBook, BookLevel } from "./api";
import TradePriceChart from "../../../components/chart/TradePriceChart";
import MarketTrades from "../../../components/book/MarketTrades";

interface Pair {
  symbol: string;
  base: string;
  quote: string;
  flags: string[];
}

interface Ticker {
  pair: string;
  last: number;
  high: number;
  low: number;
  vol: number;
  buy: number;
  sell: number;
}

interface TradeClientProps {
  pairData: Pair;
}

let orderIdCounter = 0;

export default function TradeClient({ pairData }: TradeClientProps) {
  const pair = pairData.symbol;
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [showIDR, setShowIDR] = useState(false);
  const [fxRate, setFxRate] = useState<number>(15000);
  const [error, setError] = useState<string>("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(10000);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [book, setBook] = useState<OrderBook | null>(null);
  // 24h change shown in the price header; sign drives its up/down color
  // (T09: NEXT_PUBLIC_COLOR_CONVENTION via var(--gain)/var(--loss)).
  const chg24h = Math.random() * 10 - 5;

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchFXRate().then((r) => !cancelled && setFxRate(r)).catch(() => {});
      fetchTicker(pair)
        .then((data) => !cancelled && setTicker(data))
        .catch(() => !cancelled && setTicker(null));
      // T05: synthetic book refreshes with the price feed (polled every 5s).
      fetchBook(pairData.base)
        .then((b) => !cancelled && setBook(b))
        .catch(() => !cancelled && setBook(null));
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pair, pairData.base]);

  const handleOrderSubmit = () => {
    if (!price && orderType === "limit") {
      setError("Please enter a price");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (orderType === "limit" && (!price || parseFloat(price) <= 0)) {
      setError("Please enter a valid price");
      return;
    }

    const total = (parseFloat(price || "0") * parseFloat(amount)).toFixed(2);
    const newOrderId = ++orderIdCounter;

    const order = {
      id: newOrderId,
      pair,
      side,
      type: orderType,
      price: parseFloat(price || "0"),
      amount: parseFloat(amount),
      total: parseFloat(total),
      status: orderType === "market" ? "filled" : "open",
      timestamp: new Date().toISOString(),
    };

    if (order.status === "filled") {
      setOrderHistory([order, ...orderHistory]);
      if (side === "buy") {
        setBalance(balance - order.total);
      } else {
        setBalance(balance + order.total);
      }
    } else {
      setOrders([order, ...orders]);
      setOpenOrders([order, ...openOrders]);
    }

    setPrice("");
    setAmount("");
    setError("");
  };

  const handlePercentageClick = (pct: number) => {
    const maxAmount =
      side === "buy"
        ? balance / (parseFloat(price) || ticker?.last || 1)
        : balance;
    setAmount((maxAmount * pct / 100).toFixed(6));
  };

  return (
    <>
      {/* Paper Trading Banner */}
      <div className="gradient-sunset text-white px-6 py-3 text-center font-medium glow-pink">
        🎰 PAPER TRADING — Simulated Funds
      </div>

      {/* Header */}
      <div className="border-b border-vice-border bg-vice-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {pairData.base}/
              <span
                className={
                  pairData.quote === "IDR" ? "text-vice-profit glow-pink" : "text-vice-cyan glow-cyan"
                }
              >
                {pairData.quote}
              </span>
            </h1>
            <div className="flex gap-2 mt-2">
              {pairData.flags.map((f) => (
                <span
                  key={f}
                  className="px-2 py-1 bg-vice-surface-2 rounded text-xs text-vice-text-muted"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {ticker && (
              <div className="text-right">
                <div className="text-2xl font-bold text-vice-text-primary">
                  {pairData.quote === "IDR"
                    ? `Rp ${(ticker.last * fxRate).toLocaleString()}`
                    : `$${ticker.last.toLocaleString()}`}
                </div>
                <div className="text-sm text-vice-text-secondary">
                  <span className={chg24h >= 0 ? "text-vice-profit" : "text-vice-loss"}>
                    24h: {chg24h.toFixed(2)}%
                  </span>{" "}
                  | High: {ticker.high} | Low: {ticker.low} | Vol: {ticker.vol}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowIDR(!showIDR)}
              className={`px-4 py-2 rounded ${showIDR ? "btn-vice-success" : "bg-vice-surface-2 text-vice-text-secondary"}`}
            >
              {showIDR ? "USD" : "IDR"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart (T06: lightweight-charts, candles from T04 history endpoint) */}
        <div className="lg:col-span-2 h-96">
          <TradePriceChart symbol={pairData.base} pair={pair} />
        </div>

        {/* Order Ticket */}
        <div className="card-vice p-4">
          <h2 className="text-lg font-bold mb-4 text-vice-cyan">Order Ticket</h2>

          {/* Buy/Sell Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-2 rounded ${side === "buy" ? "btn-vice-success" : "bg-vice-surface-2 text-vice-text-secondary"}`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-2 rounded ${side === "sell" ? "btn-vice-danger" : "bg-vice-surface-2 text-vice-text-secondary"}`}
            >
              Sell
            </button>
          </div>

          {/* Limit/Market */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderType("limit")}
              className={`flex-1 py-1 rounded text-sm ${orderType === "limit" ? "bg-vice-cyan text-vice-ocean-night font-bold" : "bg-vice-surface-2 text-vice-text-muted"}`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType("market")}
              className={`flex-1 py-1 rounded text-sm ${orderType === "market" ? "bg-vice-cyan text-vice-ocean-night font-bold" : "bg-vice-surface-2 text-vice-text-muted"}`}
            >
              Market
            </button>
          </div>

          {/* Price Input */}
          {orderType === "limit" && (
            <div className="mb-4">
              <label className="block text-sm text-vice-text-secondary mb-2">
                Price ({pairData.quote})
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="input-vice w-full"
              />
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm text-vice-text-secondary mb-2">
              Amount ({pairData.base})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000000"
              className="input-vice w-full"
            />
          </div>

          {/* Percentage Buttons */}
          <div className="flex gap-2 mb-4">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentageClick(pct)}
                className="flex-1 py-1 bg-vice-surface-2 rounded text-sm text-vice-text-muted hover:text-vice-cyan hover:border-vice-cyan border border-transparent transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Balance */}
          <div className="mb-4 p-3 bg-vice-surface rounded border border-vice-border">
            <div className="flex justify-between text-sm">
              <span className="text-vice-text-muted">Balance</span>
              <span className="text-vice-text-primary">{balance.toFixed(4)} {pairData.base}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-vice-text-muted">Total</span>
              <span className="text-vice-cyan">
                {pairData.quote === "IDR" ? "Rp " : "$"}
                {((parseFloat(price) || 0) * (parseFloat(amount) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {error && <div className="mb-4 text-vice-loss text-sm">{error}</div>}

          <button
            onClick={handleOrderSubmit}
            className={`w-full py-3 rounded font-bold text-white ${side === "buy" ? "btn-vice-success" : "btn-vice-danger"}`}
          >
            {side === "buy" ? "Buy" : "Sell"} {pair}
          </button>
        </div>
      </div>

      {/* Order Book */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-vice">
          <h2 className="text-lg font-bold mb-4 text-vice-cyan">Order Book</h2>
          {book && book.asks.length === 15 && book.bids.length === 15 ? (
            <OrderBookView book={book} base={pairData.base} showIDR={showIDR} fxRate={fxRate} />
          ) : (
            <div className="text-sm text-vice-text-muted py-8 text-center">
              Synthetic order book available for the shortlisted assets
              (BTC, ETH, SOL, BNB, XRP, LINK).
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="card-vice">
          <h2 className="text-lg font-bold mb-4 text-vice-cyan">Recent Trades</h2>
          <MarketTrades symbol={pairData.base} />
        </div>
      </div>
    </>
  );
}

// T05: Bitget-spot style order book — asks above, mid price row, bids below,
// with CSS-only depth bars (no chart library). Bars emanate from the center
// line outward (asks fill left, bids fill right); width = cumulative size
// share of the deeper side.
function OrderBookView({
  book,
  base,
  showIDR,
  fxRate,
}: {
  book: OrderBook;
  base: string;
  showIDR: boolean;
  fxRate: number;
}) {
  const displayPrice = (p: number) => (showIDR ? p * fxRate : p);
  const decimalsFor = (p: number) => {
    if (p >= 1000) return 2;
    if (p >= 1) return 4;
    if (p >= 0.01) return 6;
    return 8;
  };
  const fmtPrice = (p: number) =>
    p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimalsFor(p) });
  const fmtSize = (s: number) => {
    const d = s >= 1000 ? 2 : s >= 1 ? 4 : 6;
    return s.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  // Cumulative depth per side; bar width = share of the larger side.
  const cum = (levels: BookLevel[]) => {
    let acc = 0;
    return levels.map((l) => (acc += l.size));
  };
  const askCum = cum(book.asks);
  const bidCum = cum(book.bids);
  const maxCum = Math.max(askCum[askCum.length - 1], bidCum[bidCum.length - 1]);
  const pctOf = (c: number) => (c / maxCum) * 100;

  return (
    <div className="text-sm">
      <div className="flex justify-between text-gray-500 px-2 pb-1">
        <span>Price ({showIDR ? "IDR" : book.quote})</span>
        <span>Amount ({base})</span>
      </div>

      {/* Asks: displayed descending, best ask adjacent to the mid row */}
      <div className="space-y-px">
        {book.asks
          .map((lvl, i) => ({ lvl, pct: pctOf(askCum[i]) }))
          .reverse()
          .map(({ lvl, pct: barPct }, i) => (
            <DepthRow
              key={`ask-${i}`}
              price={displayPrice(lvl.price)}
              size={lvl.size}
              pct={barPct}
              side="ask"
              fmtPrice={fmtPrice}
              fmtSize={fmtSize}
            />
          ))}
      </div>

      {/* Mid price row */}
      <div className="flex items-center justify-between px-2 py-2 my-1 bg-[#0d1117] rounded border border-gray-800">
        <span className="text-lg font-bold text-white">{fmtPrice(displayPrice(book.mid))}</span>
        <span className="text-xs text-gray-500">
          spread {fmtPrice(book.spread)} · {book.source === "live" ? "live ref" : "sim"}
        </span>
      </div>

      {/* Bids: displayed descending, best bid adjacent to the mid row */}
      <div className="space-y-px">
        {book.bids.map((lvl, i) => (
          <DepthRow
            key={`bid-${i}`}
            price={displayPrice(lvl.price)}
            size={lvl.size}
            pct={pctOf(bidCum[i])}
            side="bid"
            fmtPrice={fmtPrice}
            fmtSize={fmtSize}
          />
        ))}
      </div>
    </div>
  );
}

// One book row: price + amount over a CSS-only depth bar.
function DepthRow({
  price,
  size,
  pct,
  side,
  fmtPrice,
  fmtSize,
}: {
  price: number;
  size: number;
  pct: number;
  side: "ask" | "bid";
  fmtPrice: (p: number) => string;
  fmtSize: (s: number) => string;
}) {
  return (
    <div className="relative flex justify-between px-2 py-0.5 overflow-hidden">
      <div
        className={`absolute inset-y-0 ${side === "ask" ? "bg-[var(--loss)] right-1/2" : "bg-[var(--gain)] left-1/2"}`}
        style={{ width: `${pct}%`, opacity: 0.14 }}
      />
      <span className={`relative ${side === "ask" ? "text-[var(--loss)]" : "text-[var(--gain)]"}`}>
        {fmtPrice(price)}
      </span>
      <span className="relative text-gray-300">{fmtSize(size)}</span>
    </div>
  );
}
