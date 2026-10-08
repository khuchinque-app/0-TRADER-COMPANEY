import { Market, Candle, OrderBook, Trade } from '../types'

export const MARKETS: Market[] = [
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', price: 61200, change24h: 2.34, volume24h: 125000000 },
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', price: 3380, change24h: -1.23, volume24h: 45000000 },
  { symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', price: 165, change24h: 5.67, volume24h: 8900000 },
  { symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT', price: 580, change24h: 0.89, volume24h: 3200000 },
  { symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT', price: 0.52, change24h: -0.45, volume24h: 1800000 },
  { symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', price: 14.5, change24h: 3.21, volume24h: 890000 },
  { symbol: 'AAVE/USDT', base: 'AAVE', quote: 'USDT', price: 95, change24h: 1.56, volume24h: 450000 },
]

const IDR_RATE = 15850

export function formatPrice(price: number, showIDR = false): string {
  if (showIDR) {
    return `Rp ${Math.round(price * IDR_RATE).toLocaleString('id-ID')}`
  }
  return price < 1 ? `$${price.toFixed(4)}` : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatChange(change: number): string {
  const prefix = change >= 0 ? '+' : ''
  return `${prefix}${change.toFixed(2)}%`
}

export function generateCandles(basePrice: number, count: number = 200): Candle[] {
  const candles: Candle[] = []
  let price = basePrice
  const now = Math.floor(Date.now() / 1000)
  const interval = 3600 // 1 hour

  for (let i = count; i > 0; i--) {
    const change = (Math.random() - 0.5) * basePrice * 0.02
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * basePrice * 0.005
    const low = Math.min(open, close) - Math.random() * basePrice * 0.005
    const volume = Math.random() * 1000 + 100

    candles.push({
      time: now - i * interval,
      open,
      high,
      low,
      close,
      volume,
    })

    price = close
  }

  return candles
}

export function generateOrderBook(basePrice: number): OrderBook {
  const bids: Array<{ price: number; amount: number; total: number }> = []
  const asks: Array<{ price: number; amount: number; total: number }> = []

  let bidTotal = 0
  let askTotal = 0

  for (let i = 0; i < 14; i++) {
    const bidPrice = basePrice * (1 - (i + 1) * 0.001)
    const askPrice = basePrice * (1 + (i + 1) * 0.001)
    const bidAmount = Math.random() * 2 + 0.1
    const askAmount = Math.random() * 2 + 0.1

    bidTotal += bidAmount
    askTotal += askAmount

    bids.push({ price: bidPrice, amount: bidAmount, total: bidTotal })
    asks.push({ price: askPrice, amount: askAmount, total: askTotal })
  }

  return { bids, asks }
}

export function generateRecentTrades(basePrice: number, count: number = 25): Trade[] {
  const trades: Trade[] = []
  const now = Math.floor(Date.now() / 1000)

  for (let i = 0; i < count; i++) {
    trades.push({
      id: `trade-${i}`,
      price: basePrice * (1 + (Math.random() - 0.5) * 0.001),
      amount: Math.random() * 0.5 + 0.01,
      time: now - i * 5,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
    })
  }

  return trades
}

export { IDR_RATE }
