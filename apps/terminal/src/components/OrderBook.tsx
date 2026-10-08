import React from 'react'
import { OrderBook as OrderBookType } from '../types'

interface OrderBookProps {
  orderBook: OrderBookType
  symbol: string
  showIDR: boolean
}

const OrderBook: React.FC<OrderBookProps> = ({ orderBook, symbol, showIDR }) => {
  const formatPrice = (price: number) => {
    if (showIDR) {
      return `Rp ${price.toLocaleString('id-ID')}`
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
  }

  const maxTotal = Math.max(
    ...orderBook.bids.map(b => b.total),
    ...orderBook.asks.map(a => a.total)
  )

  return (
    <div className="h-full flex flex-col bg-[#1e2329]">
      <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between">
        <span className="text-sm font-medium text-white">Order Book</span>
        <span className="text-xs text-[#848e9c]">{symbol}</span>
      </div>
      
      <div className="px-3 py-1.5 grid grid-cols-3 text-xs text-[#5e6673] border-b border-[#2b3139]">
        <span>Price (IDR)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sells) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {[...orderBook.asks].reverse().map((ask, i) => (
          <div key={i} className="relative px-3 py-0.5 flex items-center justify-between text-xs">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/20"
              style={{ width: `${(ask.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-[#f6465d] font-mono">{formatPrice(ask.price)}</span>
            <span className="relative text-white font-mono">{ask.amount.toFixed(6)}</span>
            <span className="relative text-[#848e9c] font-mono">{formatPrice(ask.total)}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 border-y border-[#2b3139] text-center text-xs text-[#848e9c]">
        Spread: {formatPrice(orderBook.asks[0]?.price - orderBook.bids[0]?.price)}
      </div>

      {/* Bids (Buys) */}
      <div className="flex-1 overflow-hidden">
        {orderBook.bids.map((bid, i) => (
          <div key={i} className="relative px-3 py-0.5 flex items-center justify-between text-xs">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#0ecb81]/20"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-[#0ecb81] font-mono">{formatPrice(bid.price)}</span>
            <span className="relative text-white font-mono">{bid.amount.toFixed(6)}</span>
            <span className="relative text-[#848e9c] font-mono">{formatPrice(bid.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderBook
