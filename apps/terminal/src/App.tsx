import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import Chart from './components/Chart'
import OrderBook from './components/OrderBook'
import OrderForm from './components/OrderForm'
import RecentTrades from './components/RecentTrades'
import Positions from './components/Positions'
import { Candle, OrderBook as OrderBookType, Trade } from './types'

// Backend API base URL
const API_BASE = 'http://localhost:11110'

// Supported symbols
const SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'LINK', 'AAVE'] as const
type SymbolId = typeof SYMBOLS[number]

interface MarketData {
  symbol: string
  base: string
  quote: string
  price: number
  change24h: number
  volume24h: number
}

const App: React.FC = () => {
  const [symbol] = useState<SymbolId>('BTC')
  const [showIDR, setShowIDR] = useState(false)
  const [candles, setCandles] = useState<Candle[]>([])
  const [orderBook, setOrderBook] = useState<OrderBookType>({ bids: [], asks: [] })
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [currentPrice, setCurrentPrice] = useState(0)
  const [change24h, setChange24h] = useState(0)
  const [volume24h, setVolume24h] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'live' | 'sim'>('sim')
  
  const symbolRef = useRef(symbol)
  symbolRef.current = symbol

  // Fetch current price
  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/price/${symbol}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      
      setCurrentPrice(data.price)
      setSource(data.source)
      
      // Calculate 24h change (simulated based on price movement)
      const basePrice = data.price * 0.98 // Assume ~2% change
      setChange24h(((data.price - basePrice) / basePrice) * 100)
      setVolume24h(data.price * 1000000) // Simulated volume
    } catch (err) {
      console.error('Failed to fetch price:', err)
      setError('Failed to load price data')
    }
  }, [symbol])

  // Fetch candle history
  const fetchCandles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/price/${symbol}/history?interval=1h`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      
      // Convert backend candles to frontend format
      const formattedCandles: Candle[] = data.candles.map((c: any) => ({
        time: c.ts / 1000, // Convert to seconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.close * 100, // Simulated volume
      }))
      
      setCandles(formattedCandles)
    } catch (err) {
      console.error('Failed to fetch candles:', err)
      // Fallback to empty candles
      setCandles([])
    }
  }, [symbol])

  // Fetch order book
  const fetchOrderBook = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/book/${symbol}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      
      setOrderBook({
        bids: data.bids.map((b: any) => ({
          price: b.price,
          amount: b.amount,
          total: b.total,
        })),
        asks: data.asks.map((a: any) => ({
          price: a.price,
          amount: a.amount,
          total: a.total,
        })),
      })
    } catch (err) {
      console.error('Failed to fetch order book:', err)
    }
  }, [symbol])

  // Fetch recent trades
  const fetchTrades = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trades/${symbol}USDT`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      
      setRecentTrades(data.trades.map((t: any) => ({
        id: t.id,
        price: t.price,
        amount: t.size,
        time: t.time / 1000,
        side: t.side,
      })))
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  }, [symbol])

  // Initial fetch
  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      await Promise.all([
        fetchPrice(),
        fetchCandles(),
        fetchOrderBook(),
        fetchTrades(),
      ])
      setLoading(false)
    }
    
    initialize()
  }, [fetchPrice, fetchCandles, fetchOrderBook, fetchTrades])

  // Poll for updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrice()
      fetchOrderBook()
      fetchTrades()
    }, 2000)

    return () => clearInterval(interval)
  }, [fetchPrice, fetchOrderBook, fetchTrades])

  // Refresh candles every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCandles()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchCandles])

  const handleOrder = useCallback(async (side: 'buy' | 'sell', type: 'limit' | 'market', price: number, amount: number) => {
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pair: `${symbol}USDT`,
          side,
          type,
          price: type === 'limit' ? price : currentPrice,
          quantity: amount,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      
      alert(`${side.toUpperCase()} order placed! ID: ${data.orderId}`)
    } catch (err) {
      console.error('Order failed:', err)
      alert('Order failed. Please try again.')
    }
  }, [symbol, currentPrice])

  // Create current market data
  const currentMarket: MarketData = {
    symbol: `${symbol}/USDT`,
    base: symbol,
    quote: 'USDT',
    price: currentPrice,
    change24h,
    volume24h,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0e11]">
        <div className="text-center">
          <div className="text-yellow-400 text-2xl font-bold mb-4">ChinQueTrade</div>
          <div className="text-[#848e9c] animate-pulse">Loading market data...</div>
          <div className="text-xs text-[#848e9c] mt-2">
            {source === 'live' ? '📡 Live from Indodax' : '🔄 Simulated data'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b0e11]">
      <Header
        symbol={currentMarket.symbol}
        price={currentPrice}
        change24h={change24h}
        showIDR={showIDR}
        onToggleIDR={() => setShowIDR(!showIDR)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chart */}
        <div className="flex-1 min-w-0 border-r border-[#2b3139]">
          <Chart candles={candles} symbol={currentMarket.symbol} />
        </div>

        {/* Middle: Order Book + Recent Trades */}
        <div className="w-72 flex flex-col border-r border-[#2b3139]">
          <div className="flex-1 min-h-0">
            <OrderBook orderBook={orderBook} symbol={currentMarket.symbol} showIDR={showIDR} />
          </div>
          <div className="h-64 min-h-64">
            <RecentTrades trades={recentTrades} symbol={currentMarket.symbol} showIDR={showIDR} />
          </div>
        </div>

        {/* Right: Order Form */}
        <div className="w-80 flex-shrink-0">
          <OrderForm
            symbol={currentMarket.symbol}
            currentPrice={currentPrice}
            showIDR={showIDR}
            onOrder={handleOrder}
          />
        </div>
      </div>

      {/* Bottom: Positions Panel */}
      <div className="h-64 flex-shrink-0 border-t border-[#2b3139]">
        <Positions showIDR={showIDR} />
      </div>

      {/* Status Bar */}
      <div className="bg-[#1e2329] border-t border-[#2b3139] px-4 py-1 flex items-center justify-between text-xs text-[#848e9c]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${source === 'live' ? 'bg-[#0ecb81] animate-pulse' : 'bg-[#f0b90b]'}`}></span>
            <span>{source === 'live' ? 'Live' : 'Sim'}</span>
          </div>
          <span>•</span>
          <span>Paper Trading Mode</span>
          <span>•</span>
          <span>WIB Timezone</span>
          <span>•</span>
          <span className="text-[#848e9c]">{error ? '⚠ ' + error : 'Connected'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Latency: 12ms</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
        </div>
      </div>
    </div>
  )
}

export default App
