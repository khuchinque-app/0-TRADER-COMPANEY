export interface Market {
  symbol: string
  base: string
  quote: string
  price: number
  change24h: number
  volume24h: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookLevel {
  price: number
  amount: number
  total: number
}

export interface OrderBook {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

export interface Trade {
  id: string
  price: number
  amount: number
  time: number
  side: 'buy' | 'sell'
}

export interface Position {
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  markPrice: number
  unrealizedPnL: number
  leverage: number
}

export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'limit' | 'market'
  price: number
  amount: number
  filled: number
  status: 'open' | 'filled' | 'cancelled'
  time: number
}

export interface Wallet {
  currency: string
  available: number
  frozen: number
  avgPrice?: number
}
