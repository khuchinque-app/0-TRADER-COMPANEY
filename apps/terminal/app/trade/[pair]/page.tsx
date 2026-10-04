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

export default function TradePage() {
  const params = useParams();
  const pair = String(params.pair).toUpperCase();
  const [pairData, setPairData] = useState<Pair | null>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIDR, setShowIDR] = useState(false);
  const [fxRate, setFxRate] = useState<number>(0);

  useEffect(() => {
    // Validate pair against catalog
    fetch("/api/markets/all")
      .then((r) => r.json())
      .then((catalog: Pair[]) => {
        const found = catalog.find((p) => p.symbol === pair);
        setPairData(found || null);
      })
      .catch(() => setPairData(null));

    // Fetch FX rate for IDR toggle
    fetch("http://localhost:11110/api/fx/usdt-idr")
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
        setLoading(false);
      })
      .catch(() => {
        setTicker(null);
        setLoading(false);
      });
  }, [pair]);

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
          <Link href="/market" className="text-[#f7931a] hover:text-[#ff9a2e]">
            ← Back
          </Link>
        </div>
      </div>

      {/* Price Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-3xl font-bold">
              {loading ? (
                <span className="text-gray-500">Loading...</span>
              ) : ticker ? (
                showIDR ? (
                  <span className="text-green-400">
                    Rp {(ticker.last * fxRate).toLocaleString("id-ID")}
                  </span>
                ) : (
                  <span>${ticker.last.toFixed(2)}</span>
                )
              ) : (
                <span className="text-gray-500">No Data</span>
              )}
            </div>
            {!loading && !ticker && (
              <p className="text-gray-500 text-sm mt-1">Price data unavailable</p>
            )}
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-gray-500">24h High</div>
              <div className="text-green-400">
                {ticker
                  ? showIDR
                    ? `Rp ${(ticker.high * fxRate).toLocaleString("id-ID")}`
                    : `$${ticker.high.toFixed(2)}`
                  : "---"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">24h Low</div>
              <div className="text-red-400">
                {ticker
                  ? showIDR
                    ? `Rp ${(ticker.low * fxRate).toLocaleString("id-ID")}`
                    : `$${ticker.low.toFixed(2)}`
                  : "---"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">24h Vol</div>
              <div>{ticker?.vol?.toFixed(2) || "---"}</div>
            </div>
          </div>
          <button
            onClick={() => setShowIDR(!showIDR)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              showIDR
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {showIDR ? "Show USD" : "Show IDR"}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-6">
        {/* Order Ticket */}
        <div className="lg:col-span-1">
          <OrderTicket pair={pair} quote={pairData.quote} fxRate={showIDR ? fxRate : 0} />
        </div>

        {/* Order Book */}
        <div className="lg:col-span-1">
          <OrderBook pair={pair} />
        </div>

        {/* Chart Placeholder */}
        <div className="lg:col-span-1">
          <ChartPlaceholder pair={pair} />
        </div>
      </div>
    </div>
  );
}

// Order Ticket Component
function OrderTicket({ pair, quote, fxRate }: { pair: string; quote: string; fxRate: number }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (type === "limit" && (!price || parseFloat(price) <= 0)) {
      alert("Please enter a valid price");
      return;
    }

    fetch("http://localhost:11110/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pair,
        side,
        type,
        price: type === "limit" ? parseFloat(price) : 0,
        quantity: parseFloat(amount),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          alert(`Order submitted: ${data.orderId}`);
        } else {
          alert(`Failed: ${data.error || "Unknown error"}`);
        }
      })
      .catch(() => alert("Failed to submit order"));
  };

  return (
    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
      <h2 className="text-lg font-bold mb-4">Place Order</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 rounded font-medium ${
            side === "buy" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 rounded font-medium ${
            side === "sell" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType("limit")}
          className={`px-4 py-1 rounded text-sm ${
            type === "limit" ? "bg-[#f7931a] text-black font-medium" : "bg-gray-800 text-gray-400"
          }`}
        >
          Limit
        </button>
        <button
          onClick={() => setType("market")}
          className={`px-4 py-1 rounded text-sm ${
            type === "market" ? "bg-[#f7931a] text-black font-medium" : "bg-gray-800 text-gray-400"
          }`}
        >
          Market
        </button>
      </div>

      {type === "limit" && (
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-1">Price ({quote})</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="text-gray-400 text-sm block mb-1">
          Amount ({pair.replace(quote, "")})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-white"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            className="flex-1 py-1 bg-gray-800 rounded text-sm text-gray-400 hover:text-white"
          >
            {pct}%
          </button>
        ))}
      </div>

      <div className="mb-4 p-3 bg-[#0d1117] rounded">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total</span>
          <span>
            {quote === "IDR" ? "Rp " : "$"}
            {(parseFloat(price) || 0) * (parseFloat(amount) || 0)}.toLocaleString()
          </span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className={`w-full py-3 rounded font-bold text-white ${
          side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {side === "buy" ? "Buy" : "Sell"} {pair}
      </button>
    </div>
  );
}

// Order Book Component
function OrderBook({ pair }: { pair: string }) {
  const [bids, setBids] = useState<{ price: number; amount: number }[]>([]);
  const [asks, setAsks] = useState<{ price: number; amount: number }[]>([]);

  useEffect(() => {
    // Mock order book data
    setBids([
      { price: 100.5, amount: 1.2 },
      { price: 100.4, amount: 2.5 },
      { price: 100.3, amount: 0.8 },
    ]);
    setAsks([
      { price: 100.6, amount: 1.5 },
      { price: 100.7, amount: 3.2 },
      { price: 100.8, amount: 0.6 },
    ]);
  }, [pair]);

  return (
    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800">
      <h2 className="text-lg font-bold mb-4">Order Book</h2>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-500 px-2">
          <span>Price</span>
          <span>Amount</span>
        </div>
        {asks
          .reverse()
          .map((ask, i) => (
            <div key={i} className="flex justify-between px-2 py-1 text-red-400">
              <span>{ask.price.toFixed(2)}</span>
              <span>{ask.amount.toFixed(4)}</span>
            </div>
          ))}
        <div className="text-center py-2 font-bold text-lg">---</div>
        {bids.map((bid, i) => (
          <div key={i} className="flex justify-between px-2 py-1 text-green-400">
            <span>{bid.price.toFixed(2)}</span>
            <span>{bid.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Placeholder
function ChartPlaceholder({ pair }: { pair: string }) {
  return (
    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800 h-96 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2">📈</div>
        <div>Chart: {pair}</div>
        <div className="text-sm mt-2">Lightweight Charts would go here</div>
      </div>
    </div>
  );
}
