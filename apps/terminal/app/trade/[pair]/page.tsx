"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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

let orderIdCounter = 0;

export default function TradePage() {
  const params = useParams();
  const pair = String(params.pair).toUpperCase();
  const [pairData, setPairData] = useState<Pair | null>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [fills, setFills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // Validate pair against catalog
    fetch("/api/markets/all")
      .then((r) => r.json())
      .then((catalog: Pair[]) => {
        const found = catalog.find((p) => p.symbol === pair);
        setPairData(found || null);
        setLoading(false);
      })
      .catch(() => {
        setPairData(null);
        setLoading(false);
      });

    // Fetch FX rate for IDR toggle (use relative path to avoid localhost issue)
    fetch("/api/fx/usdt-idr")
      .then((r) => r.json())
      .then((data: any) => {
        setFxRate(data.rate || 15000);
      })
      .catch(() => setFxRate(15000));

    // Fetch ticker from backend
    fetch(`/api/ticker/${pair}`)
      .then((r) => r.json())
      .then((data: Ticker) => {
        setTicker(data);
      })
      .catch(() => {
        setTicker(null);
      });
  }, [pair]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading...</div>
          <div className="text-gray-400">Fetching {pair} data</div>
        </div>
      </div>
    );
  }

  if (!pairData) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Pair Not Found</h1>
          <p className="text-gray-400 mb-6">{pair} is not in the Indodax catalog</p>
          <Link
            href="/market"
            className="px-6 py-3 bg-[#f7931a] text-black rounded font-medium hover:bg-[#ff9a2e] inline-block"
          >
            ← Back to Market
          </Link>
        </div>
      </div>
    );
  }

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
      setFills([order, ...fills]);
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
    const maxAmount = side === "buy" 
      ? (balance / (parseFloat(price) || ticker?.last || 1))
      : balance;
    setAmount((maxAmount * pct / 100).toFixed(6));
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Paper Trading Banner */}
      <div className="bg-[#f7931a] text-black px-6 py-2 text-center font-medium">
        📝 PAPER TRADING — Simulated Funds
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {pairData.base}/
              <span className={pairData.quote === "IDR" ? "text-green-400" : "text-blue-400"}>
                {pairData.quote}
              </span>
            </h1>
            <div className="flex gap-2 mt-2">
              {pairData.flags.map((f) => (
                <span key={f} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {ticker && (
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {pairData.quote === "IDR" 
                    ? `Rp ${(ticker.last * fxRate).toLocaleString()}`
                    : `$${ticker.last.toLocaleString()}`
                  }
                </div>
                <div className="text-sm text-gray-400">
                  24h: {(Math.random() * 10 - 5).toFixed(2)}% | High: {ticker.high} | Low: {ticker.low} | Vol: {ticker.vol}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowIDR(!showIDR)}
              className={`px-4 py-2 rounded ${showIDR ? "bg-green-600" : "bg-gray-800"}`}
            >
              {showIDR ? "USD" : "IDR"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#161b22] rounded-lg p-4 border border-gray-800 h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📈</div>
            <div>Chart: {pair}</div>
            <div className="text-sm mt-2">Lightweight Charts would go here</div>
          </div>
        </div>

        {/* Order Ticket */}
        <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Order Ticket</h2>
          
          {/* Buy/Sell Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-2 rounded ${side === "buy" ? "bg-green-600" : "bg-gray-800"}`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-2 rounded ${side === "sell" ? "bg-red-600" : "bg-gray-800"}`}
            >
              Sell
            </button>
          </div>

          {/* Limit/Market */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderType("limit")}
              className={`flex-1 py-1 rounded text-sm ${orderType === "limit" ? "bg-gray-700" : "bg-gray-800 text-gray-400"}`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType("market")}
              className={`flex-1 py-1 rounded text-sm ${orderType === "market" ? "bg-gray-700" : "bg-gray-800 text-gray-400"}`}
            >
              Market
            </button>
          </div>

          {/* Price Input */}
          {orderType === "limit" && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Price ({pairData.quote})</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0d1117] border border-gray-700 rounded px-4 py-2 text-white"
              />
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Amount ({pairData.base})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000000"
              className="w-full bg-[#0d1117] border border-gray-700 rounded px-4 py-2 text-white"
            />
          </div>

          {/* Percentage Buttons */}
          <div className="flex gap-2 mb-4">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentageClick(pct)}
                className="flex-1 py-1 bg-gray-800 rounded text-sm text-gray-400 hover:text-white"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Balance */}
          <div className="mb-4 p-3 bg-[#0d1117] rounded">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Balance</span>
              <span>{balance.toFixed(4)} {pairData.base}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Total</span>
              <span>
                {pairData.quote === "IDR" ? "Rp " : "$"}
                {((parseFloat(price) || 0) * (parseFloat(amount) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

          <button
            onClick={handleOrderSubmit}
            className={`w-full py-3 rounded font-bold text-white ${
              side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {side === "buy" ? "Buy" : "Sell"} {pair}
          </button>
        </div>
      </div>

      {/* Order Book */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Order Book</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500 px-2">
              <span>Price</span>
              <span>Amount</span>
            </div>
            {[100.6, 100.7, 100.8].map((price, i) => (
              <div key={i} className="flex justify-between px-2 py-1 text-red-400">
                <span>{price.toFixed(2)}</span>
                <span>{(Math.random() * 2).toFixed(4)}</span>
              </div>
            ))}
            <div className="text-center py-2 font-bold text-lg">---</div>
            {[100.5, 100.4, 100.3].map((price, i) => (
              <div key={i} className="flex justify-between px-2 py-1 text-green-400">
                <span>{price.toFixed(2)}</span>
                <span>{(Math.random() * 2).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">Recent Trades</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500 px-2">
              <span>Price</span>
              <span>Amount</span>
              <span>Time</span>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between px-2 py-1">
                <span className="text-green-400">{(100 + i * 0.1).toFixed(2)}</span>
                <span>{(Math.random() * 0.5).toFixed(4)}</span>
                <span className="text-gray-500">{new Date(Date.now() - i * 60000).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
