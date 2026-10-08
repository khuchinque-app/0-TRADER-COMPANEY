import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createChart } from 'lightweight-charts';

interface TickerData {
  symbol: string;
  base: string;
  quote: string;
  lastPrice: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export default function TradePage() {
  const { pair } = useParams<{ pair: string }>();
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ time: string; open: number; high: number; low: number; close: number }[]>([]);
  const [showIDR, setShowIDR] = useState(true);
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Fetch ticker data
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const response = await fetch(`http://localhost:11110/api/ticker/${pair}`);
        const data = await response.json();
        setTicker(data);
      } catch (error) {
        console.error('Failed to fetch ticker:', error);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 5000);
    return () => clearInterval(interval);
  }, [pair]);

  // Generate mock order book
  useEffect(() => {
    if (!ticker) return;

    const basePrice = ticker.lastPrice;
    const newBids: OrderBookEntry[] = [];
    const newAsks: OrderBookEntry[] = [];

    for (let i = 0; i < 10; i++) {
      newBids.push({
        price: basePrice * (1 - (i + 1) * 0.001),
        amount: Math.random() * 0.5,
        total: 0
      });
      newAsks.push({
        price: basePrice * (1 + (i + 1) * 0.001),
        amount: Math.random() * 0.5,
        total: 0
      });
    }

    // Calculate totals
    newBids.forEach((bid, i) => {
      bid.total = bid.price * bid.amount;
      if (i > 0) bid.total += newBids[i-1].total;
    });
    newAsks.forEach((ask, i) => {
      ask.total = ask.price * ask.amount;
      if (i > 0) ask.total += newAsks[i-1].total;
    });

    setOrderBook({ bids: newBids.reverse(), asks: newAsks });
  }, [ticker]);

  // Generate mock recent trades
  useEffect(() => {
    const trades = [];
    for (let i = 0; i < 20; i++) {
      trades.push({
        id: i,
        price: ticker ? ticker.lastPrice * (1 + (Math.random() - 0.5) * 0.01) : 0,
        amount: Math.random() * 0.1,
        time: new Date(Date.now() - i * 30000).toLocaleTimeString('id-ID'),
        side: Math.random() > 0.5 ? 'buy' : 'sell'
      });
    }
    setRecentTrades(trades);
  }, [ticker]);

  // Generate mock chart data
  useEffect(() => {
    const data = [];
    const basePrice = ticker ? ticker.lastPrice : 50000;
    let price = basePrice * 0.95;
    
    for (let i = 0; i < 100; i++) {
      const time = new Date(Date.now() - (100 - i) * 3600000).toISOString().split('T')[0];
      const open = price;
      const high = price * (1 + Math.random() * 0.02);
      const low = price * (1 - Math.random() * 0.02);
      const close = price * (1 + (Math.random() - 0.5) * 0.01);
      
      data.push({ time, open, high, low, close });
      price = close;
    }
    setChartData(data);
  }, [ticker]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: '#1e2329' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#2b3139' },
        horzLines: { color: '#2b3139' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#2b3139',
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });

    candleSeries.setData(chartData);
    chart.timeScale().fitContent();
    chartInstanceRef.current = chart;

    return () => {
      chart.remove();
    };
  }, [chartData]);

  const formatPrice = (price: number) => {
    if (showIDR) {
      return `Rp ${price.toLocaleString('id-ID')}`;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSuccess(true);
    setTimeout(() => setOrderSuccess(false), 3000);
    setPrice('');
    setAmount('');
  };

  if (!ticker) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Memuat data trading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      {/* Header Info */}
      <div className="bg-[#1e2329] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/market" className="text-gray-400 hover:text-white text-sm">
                ← Market
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold">
                  {pair?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{pair}</h1>
                  <p className="text-xs text-gray-400">ChinQueTrade</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {formatPrice(ticker.lastPrice)}
                </p>
                <p className={`text-sm ${ticker.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                </p>
              </div>
              <button
                onClick={() => setShowIDR(!showIDR)}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${showIDR ? 'bg-yellow-400 text-black' : 'bg-[#0b0e11] text-gray-400'}`}
              >
                {showIDR ? 'IDR' : 'USD'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart */}
          <div className="lg:col-span-3 bg-[#1e2329] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Grafik Harga</h2>
              <div className="flex gap-2">
                {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                  <button key={tf} className="px-2 py-1 text-xs bg-[#0b0e11] rounded hover:bg-[#2b3139] transition-colors">
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chartRef} className="h-[400px]" />
          </div>

          {/* Order Form */}
          <div className="bg-[#1e2329] rounded-lg p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSide('buy')}
                className={`flex-1 py-2 rounded font-semibold ${side === 'buy' ? 'bg-green-500 text-white' : 'bg-[#0b0e11] text-gray-400'}`}
              >
                Beli
              </button>
              <button
                onClick={() => setSide('sell')}
                className={`flex-1 py-2 rounded font-semibold ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-[#0b0e11] text-gray-400'}`}
              >
                Jual
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-1.5 text-sm rounded ${orderType === 'limit' ? 'bg-yellow-400 text-black' : 'bg-[#0b0e11] text-gray-400'}`}
              >
                Limit
              </button>
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-1.5 text-sm rounded ${orderType === 'market' ? 'bg-yellow-400 text-black' : 'bg-[#0b0e11] text-gray-400'}`}
              >
                Market
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-3">
              {orderType === 'limit' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Harga</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0b0e11] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-yellow-400 focus:outline-none"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Jumlah</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0b0e11] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>
              <div className="text-xs text-gray-400">
                Total: <span className="text-white">{formatPrice((parseFloat(price || '0') * parseFloat(amount || '0')))}</span>
              </div>
              <button
                type="submit"
                className={`w-full py-3 rounded font-semibold ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} transition-colors`}
              >
                {side === 'buy' ? 'Beli' : 'Jual'} {pair?.replace('IDR', '').replace('USDT', '')}
              </button>
            </form>

            {orderSuccess && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded text-green-400 text-sm text-center">
                ✓ Order berhasil!
              </div>
            )}
          </div>
        </div>

        {/* Order Book & Recent Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Order Book */}
          <div className="bg-[#1e2329] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Order Book</h3>
            <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
              <span>Harga</span>
              <span className="text-right">Jumlah</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-0.5">
              {orderBook.asks.slice(0, 8).map((ask, i) => (
                <div key={`ask-${i}`} className="grid grid-cols-3 text-sm relative">
                  <div className="absolute inset-0 bg-red-500/10" style={{ height: `${(ask.total / orderBook.asks[0]?.total) * 100}%`, right: 0, left: 'auto', width: '100%' }}></div>
                  <span className="text-red-400 relative z-10">{formatPrice(ask.price)}</span>
                  <span className="text-right text-gray-300 relative z-10">{ask.amount.toFixed(4)}</span>
                  <span className="text-right text-gray-400 relative z-10">{ask.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="text-center py-2 border-y border-gray-700 my-2">
              <span className="text-lg font-bold text-white">{formatPrice(ticker.lastPrice)}</span>
              <span className="text-green-400 text-sm ml-2">↑ {Math.abs(ticker.changePercent).toFixed(2)}%</span>
            </div>
            <div className="space-y-0.5">
              {orderBook.bids.slice(0, 8).map((bid, i) => (
                <div key={`bid-${i}`} className="grid grid-cols-3 text-sm relative">
                  <div className="absolute inset-0 bg-green-500/10" style={{ height: `${(bid.total / orderBook.bids[0]?.total) * 100}%`, right: 0, left: 'auto', width: '100%' }}></div>
                  <span className="text-green-400 relative z-10">{formatPrice(bid.price)}</span>
                  <span className="text-right text-gray-300 relative z-10">{bid.amount.toFixed(4)}</span>
                  <span className="text-right text-gray-400 relative z-10">{bid.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-[#1e2329] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Transaksi Terbaru</h3>
            <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
              <span>Harga</span>
              <span className="text-right">Jumlah</span>
              <span className="text-right">Waktu</span>
            </div>
            <div className="space-y-1">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-3 text-sm">
                  <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {formatPrice(trade.price)}
                  </span>
                  <span className="text-right text-gray-300">{trade.amount.toFixed(4)}</span>
                  <span className="text-right text-gray-500">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-[#1e2329] rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Harga 24j Terakhir</p>
            <p className="text-white font-semibold">{formatPrice(ticker.lastPrice)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Tertinggi 24j</p>
            <p className="text-green-400 font-semibold">{formatPrice(ticker.high)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Terendah 24j</p>
            <p className="text-red-400 font-semibold">{formatPrice(ticker.low)}</p>
          </div>
          <div className="bg-[#1e2329] rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Volume 24j</p>
            <p className="text-white font-semibold">{ticker.volume.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
