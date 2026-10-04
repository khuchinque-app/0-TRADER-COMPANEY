"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";

interface Pair {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: "ask" | "bid";
}

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: string;
  side: "buy" | "sell";
}

export default function TradePage() {
  const params = useParams();
  const pairId = params?.pair as string || "BTCIDR";

  // State
  const [pair, setPair] = useState<Pair | null>(null);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [orderbook, setOrderbook] = useState<{asks: OrderBookEntry[], bids: OrderBookEntry[]}>({ asks: [], bids: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState({ IDR: 100000000, BTC: 0.5 });
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [activeTimeframe, setActiveTimeframe] = useState("1H");

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Fetch pair data
  useEffect(() => {
    fetch("/api/markets/all")
      .then(res => res.json())
      .then(data => {
        const found = data.find((p: Pair) => p.symbol === pairId);
        if (found) setPair(found);
      })
      .catch(console.error);
  }, [pairId]);

  // Generate mock data
  useEffect(() => {
    const basePrice = pair?.price || 1500000000;
    const data: CandleData[] = [];
    let price = basePrice - 10000000;
    
    for (let i = 100; i >= 0; i--) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 15);
      
      const change = (Math.random() - 0.5) * 5000000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 2000000;
      const low = Math.min(open, close) - Math.random() * 2000000;
      
      data.push({
        time: date.toISOString().slice(0, 16),
        open,
        high,
        low,
        close
      });
      
      price = close;
    }
    
    setChartData(data);
    
    // Orderbook
    const asks: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => ({
      price: basePrice + (i + 1) * 50000 + Math.random() * 10000,
      amount: Math.random() * 0.5 + 0.1,
      total: 0,
      type: "ask"
    }));
    
    const bids: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => ({
      price: basePrice - (i + 1) * 50000 - Math.random() * 10000,
      amount: Math.random() * 0.5 + 0.1,
      total: 0,
      type: "bid"
    }));
    
    asks.forEach((a, i) => a.total = asks.slice(0, i + 1).reduce((sum, x) => sum + x.amount, 0));
    bids.forEach((b, i) => b.total = bids.slice(0, i + 1).reduce((sum, x) => sum + x.amount, 0));
    
    setOrderbook({ asks: asks.reverse(), bids });
    
    // Trades
    const tradeList: Trade[] = Array.from({ length: 20 }, (_, i) => ({
      id: `trade-${i}`,
      price: basePrice + (Math.random() - 0.5) * 100000,
      amount: Math.random() * 0.3 + 0.01,
      time: new Date(Date.now() - i * 30000).toLocaleTimeString('id-ID'),
      side: Math.random() > 0.5 ? "buy" : "sell"
    }));
    
    setTrades(tradeList);
  }, [pairId, pair]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#101113' },
        textColor: '#a8a8a8',
      },
      grid: {
        vertLines: { color: 'rgba(48, 128, 255, 0.08)' },
        horLines: { color: 'rgba(48, 128, 255, 0.08)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    candleSeries.setData(chartData);
    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData]);

  // Update chart when timeframe changes
  useEffect(() => {
    if (!seriesRef.current || chartData.length === 0) return;
    seriesRef.current.setData(chartData);
  }, [activeTimeframe, chartData]);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatBTC = (value: number) => {
    return value.toFixed(6);
  };

  const calculateTotal = () => {
    const priceNum = parseFloat(price) || pair?.price || 0;
    const amountNum = parseFloat(amount) || 0;
    return priceNum * amountNum;
  };

  const handlePercentageClick = (pct: number) => {
    if (side === "buy") {
      const maxAmount = (balance.IDR * pct / 100) / (parseFloat(price) || pair?.price || 1);
      setAmount(maxAmount.toFixed(6));
    } else {
      setAmount((balance.BTC * pct / 100).toFixed(6));
    }
  };

  const handleOrderBookClick = (priceValue: number) => {
    setPrice(priceValue.toString());
  };

  const handleTradeClick = (tradePrice: number) => {
    setPrice(tradePrice.toString());
  };

  const handleSubmitOrder = () => {
    const priceNum = parseFloat(price) || pair?.price;
    const amountNum = parseFloat(amount);
    
    if (!priceNum || !amountNum) return;
    
    const total = priceNum * amountNum;
    
    if (side === "buy") {
      if (total > balance.IDR) {
        alert("Insufficient IDR balance");
        return;
      }
      setBalance(prev => ({
        IDR: prev.IDR - total,
        BTC: prev.BTC + amountNum
      }));
    } else {
      if (amountNum > balance.BTC) {
        alert("Insufficient BTC balance");
        return;
      }
      setBalance(prev => ({
        IDR: prev.IDR + total,
        BTC: prev.BTC - amountNum
      }));
    }
    
    setPrice("");
    setAmount("");
  };

  if (!pair) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="text-[#F4F4F5] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F4F4F5]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#101113] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-wide text-[#F4F4F5]">
            {pair.base}/
            <span className="text-[#F59E0B]">{pair.quote}</span>
          </h1>
          
          <div className="flex items-center gap-6 text-sm">
            <span className="font-mono text-lg font-semibold text-[#F4F4F5]">
              {formatIDR(pair.price)}
            </span>
            <span className={`font-mono ${pair.change24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
            </span>
            <span className="text-[#8f8f8f]">
              24h: {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}% | High: {formatIDR(pair.high24h)} | Low: {formatIDR(pair.low24h)} | Vol: {formatIDR(pair.volume24h)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#8f8f8f]">Paper Trading — Simulated Funds</span>
          <button className="px-3 py-1 rounded text-xs bg-[#141518] border border-white/5 hover:bg-[#1c1c1c] transition-colors">
            IDR
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-px bg-white/5">
        {/* Left Column - Chart */}
        <div className="flex flex-col">
          {/* Chart Header */}
          <div className="bg-[#101113] px-4 py-2 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#F4F4F5] font-semibold">{pair.base}/{pair.quote}</span>
                <span className="font-mono text-[#F4F4F5]">{formatIDR(pair.price)}</span>
                <span className={`text-sm ${pair.change24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-[#141518] p-0.5 rounded-lg border border-white/5">
              {['1M', '5M', '15M', '1H', '4H', '1D'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    activeTimeframe === tf
                      ? 'bg-[#F59E0B] text-[#000] shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'text-[#8f8f8f] hover:text-[#F4F4F5]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* OHLC Display */}
          <div className="bg-[#101113] px-4 py-2 flex gap-6 border-b border-white/5 text-xs">
            <div>
              <span className="text-[#8f8f8f]">O </span>
              <span className="font-mono text-[#F4F4F5]">{chartData[chartData.length - 1]?.open?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#8f8f8f]">H </span>
              <span className="font-mono text-[#F4F4F5]">{chartData[chartData.length - 1]?.high?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#8f8f8f]">L </span>
              <span className="font-mono text-[#F4F4F5]">{chartData[chartData.length - 1]?.low?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#8f8f8f]">C </span>
              <span className="font-mono text-[#F4F4F5]">{chartData[chartData.length - 1]?.close?.toLocaleString()}</span>
            </div>
          </div>

          {/* Chart Container */}
          <div ref={chartContainerRef} className="flex-1 min-h-[400px] bg-[#101113]" />
        </div>

        {/* Right Column - Order Panel */}
        <div className="flex flex-col bg-[#101113]">
          {/* Order Ticket */}
          <div className="p-4 border-b border-white/5">
            <h2 className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]"></span>
              Order Ticket
            </h2>
            
            {/* Buy/Sell Tabs */}
            <div className="flex gap-1 bg-[#141518] p-0.5 rounded-lg border border-white/5 mb-3">
              <button
                onClick={() => setSide("buy")}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  side === "buy"
                    ? "bg-[#22C55E] text-[#000] shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "text-[#8f8f8f] hover:text-[#F4F4F5]"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  side === "sell"
                    ? "bg-[#EF4444] text-[#fff] shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : "text-[#8f8f8f] hover:text-[#F4F4F5]"
                }`}
              >
                Sell
              </button>
            </div>
            
            {/* Limit/Market Tabs */}
            <div className="flex gap-1 bg-[#141518] p-0.5 rounded-lg border border-white/5 mb-3">
              <button
                onClick={() => setOrderType("limit")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  orderType === "limit"
                    ? "bg-[#1c1c1c] text-[#F59E0B] border border-[#F59E0B]/30"
                    : "text-[#8f8f8f] hover:text-[#F4F4F5]"
                }`}
              >
                Limit
              </button>
              <button
                onClick={() => setOrderType("market")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  orderType === "market"
                    ? "bg-[#1c1c1c] text-[#F59E0B] border border-[#F59E0B]/30"
                    : "text-[#8f8f8f] hover:text-[#F4F4F5]"
                }`}
              >
                Market
              </button>
            </div>

            {/* Price Input */}
            <div className="mb-2">
              <label className="text-[10px] font-semibold text-[#8f8f8f] uppercase tracking-wider flex justify-between mb-1">
                <span>Price</span>
                <span className="text-[#565656]">Market Price: {formatIDR(pair.price)}</span>
              </label>
              <div className="flex items-center bg-[#141518] border border-white/5 rounded-lg focus-within:border-[#F59E0B] transition-colors">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent border-none px-3 py-2.5 text-sm font-mono text-[#F4F4F5] outline-none placeholder:text-[#565656]"
                />
                <span className="pr-3 text-xs text-[#8f8f8f] font-mono">IDR</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-[#8f8f8f] uppercase tracking-wider flex justify-between mb-1">
                <span>Amount</span>
                <span className="text-[#565656]">Available: {formatBTC(balance.BTC)} {pair.base}</span>
              </label>
              <div className="flex items-center bg-[#141518] border border-white/5 rounded-lg focus-within:border-[#F59E0B] transition-colors">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000000"
                  className="flex-1 bg-transparent border-none px-3 py-2.5 text-sm font-mono text-[#F4F4F5] outline-none placeholder:text-[#565656]"
                />
                <span className="pr-3 text-xs text-[#8f8f8f] font-mono">{pair.base}</span>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div className="flex gap-1 mb-3">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentageClick(pct)}
                  className="flex-1 py-1.5 text-xs font-medium text-[#8f8f8f] bg-[#141518] border border-white/5 rounded hover:text-[#F4F4F5] hover:border-white/10 transition-all"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between text-xs mb-3 py-2 border-t border-b border-white/5">
              <span className="text-[#8f8f8f]">Total</span>
              <span className="font-mono text-[#F4F4F5]">{formatIDR(calculateTotal())}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitOrder}
              className={`w-full py-3 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all ${
                side === "buy"
                  ? "bg-[#22C55E] text-[#000] hover:bg-[#16a34a] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "bg-[#EF4444] text-[#fff] hover:bg-[#dc2626] shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              }`}
            >
              {side === "buy" ? "Buy" : "Sell"} {pair.base}
            </button>
            
            <p className="text-center text-[10px] text-[#565656] mt-2">
              Fee: 0.1% • Total with fee: {formatIDR(calculateTotal() * 1.001)}
            </p>
          </div>

          {/* Portfolio Summary */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider mb-3">Portfolio</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8f8f8f]">IDR Balance</span>
                <span className="font-mono text-[#F4F4F5]">{formatIDR(balance.IDR)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8f8f8f]">{pair.base} Balance</span>
                <span className="font-mono text-[#F4F4F5]">{formatBTC(balance.BTC)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8f8f8f]">Total Value</span>
                <span className="font-mono text-[#F59E0B]">{formatIDR(balance.IDR + balance.BTC * pair.price)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Order Book & Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5">
        {/* Order Book */}
        <div className="bg-[#101113]">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]"></span>
              Order Book
            </h2>
            <span className="text-[10px] text-[#565656]">Spread: {formatIDR(orderbook.asks[0]?.price - orderbook.bids[0]?.price || 0)}</span>
          </div>
          
          <div className="px-4 py-2 border-b border-white/5 flex text-[10px] font-semibold text-[#8f8f8f] uppercase">
            <span className="flex-1">Price</span>
            <span className="flex-1 text-right">Amount</span>
            <span className="flex-1 text-right">Total</span>
          </div>
          
          <div className="max-h-[200px] overflow-y-auto">
            {/* Asks (Sell orders) */}
            {orderbook.asks.map((ask, i) => (
              <div
                key={`ask-${i}`}
                onClick={() => handleOrderBookClick(ask.price)}
                className="px-4 py-1 flex text-xs font-mono cursor-pointer hover:bg-white/5 transition-colors relative"
              >
                <div className="absolute inset-0 bg-[#EF4444]/10 right-0" style={{ width: `${(ask.total / orderbook.asks[0]?.total) * 100}%` }}></div>
                <span className="flex-1 text-[#EF4444] relative z-10">{ask.price.toLocaleString()}</span>
                <span className="flex-1 text-right text-[#8f8f8f] relative z-10">{ask.amount.toFixed(4)}</span>
                <span className="flex-1 text-right text-[#565656] relative z-10">{ask.total.toFixed(4)}</span>
              </div>
            ))}
            
            {/* Spread indicator */}
            <div className="px-4 py-2 border-y border-white/5 flex items-center justify-center gap-2 text-xs text-[#8f8f8f]">
              <span className="font-mono text-[#F4F4F5]">{formatIDR((orderbook.asks[0]?.price || pair.price) + (orderbook.bids[0]?.price || pair.price) / 2)}</span>
              <span className="text-[10px]">Spread: {formatIDR(orderbook.asks[0]?.price - orderbook.bids[0]?.price || 0)}</span>
            </div>
            
            {/* Bids (Buy orders) */}
            {orderbook.bids.map((bid, i) => (
              <div
                key={`bid-${i}`}
                onClick={() => handleOrderBookClick(bid.price)}
                className="px-4 py-1 flex text-xs font-mono cursor-pointer hover:bg-white/5 transition-colors relative"
              >
                <div className="absolute inset-0 bg-[#22C55E]/10 right-0" style={{ width: `${(bid.total / orderbook.bids[0]?.total) * 100}%` }}></div>
                <span className="flex-1 text-[#22C55E] relative z-10">{bid.price.toLocaleString()}</span>
                <span className="flex-1 text-right text-[#8f8f8f] relative z-10">{bid.amount.toFixed(4)}</span>
                <span className="flex-1 text-right text-[#565656] relative z-10">{bid.total.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-[#101113]">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]"></span>
            <h2 className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider">Recent Trades</h2>
          </div>
          
          <div className="px-4 py-2 border-b border-white/5 flex text-[10px] font-semibold text-[#8f8f8f] uppercase">
            <span className="flex-1">Price</span>
            <span className="flex-1 text-right">Amount</span>
            <span className="flex-1 text-right">Time</span>
          </div>
          
          <div className="max-h-[200px] overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                onClick={() => handleTradeClick(trade.price)}
                className="px-4 py-1.5 flex text-xs font-mono cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span className={`flex-1 ${trade.side === "buy" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {trade.price.toLocaleString()}
                </span>
                <span className="flex-1 text-right text-[#8f8f8f]">{trade.amount.toFixed(4)}</span>
                <span className="flex-1 text-right text-[#565656]">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-7 bg-[#101113] border-t border-white/5 flex items-center justify-between px-4 text-[10px] text-[#565656]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_4px_#22C55E]"></span>
            <span>Connected</span>
          </div>
          <span>Latency: 45ms</span>
          <span>WebSocket: Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Paper Trading Mode</span>
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}
