import React from 'react'
import { Trade } from '../types'

interface RecentTradesProps {
  trades: Trade[]
  symbol: string
  showIDR: boolean
}

const RecentTrades: React.FC<RecentTradesProps> = ({ trades, symbol: _symbol, showIDR }) => {
  const formatPrice = (price: number) => {
    if (showIDR) {
      return `Rp ${price.toLocaleString('id-ID')}`
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta',
    })
  }

  return (
    <div className="h-full flex flex-col bg-[#1e2329]">
      <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between">
        <span className="text-sm font-medium text-white">Recent Trades</span>
        <span className="text-xs text-[#848e9c]">{trades.length}</span>
      </div>

      {/* Headers */}
      <div className="px-3 py-1.5 grid grid-cols-3 text-xs text-[#5e6673] border-b border-[#2b3139]">
        <span>Price (IDR)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades */}
      <div className="flex-1 overflow-y-auto">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="px-3 py-0.5 flex items-center justify-between text-xs hover:bg-[#2b3139]/30"
          >
            <span className={trade.side === 'buy' ? 'text-[#0ecb81] font-mono' : 'text-[#f6465d] font-mono'}>
              {formatPrice(trade.price)}
            </span>
            <span className="text-white font-mono">{trade.amount.toFixed(6)}</span>
            <span className="text-[#848e9c] font-mono">
              {formatTime(trade.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentTrades
