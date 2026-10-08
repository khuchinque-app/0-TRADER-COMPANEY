import React, { useState } from 'react'
import { Position, Order, Wallet } from '../types'
import { formatPrice } from '../data/markets'

interface PositionsProps {
  showIDR: boolean
}

const Positions: React.FC<PositionsProps> = ({ showIDR }) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history' | 'assets'>('positions')

  // Demo data
  const positions: Position[] = [
    {
      symbol: 'BTC/USDT',
      side: 'long',
      size: 0.05,
      entryPrice: 60800,
      markPrice: 61200,
      unrealizedPnL: 20,
      leverage: 1,
    },
    {
      symbol: 'ETH/USDT',
      side: 'long',
      size: 0.5,
      entryPrice: 3350,
      markPrice: 3380,
      unrealizedPnL: 15,
      leverage: 1,
    },
  ]

  const orders: Order[] = [
    {
      id: '1',
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      price: 58000,
      amount: 0.05,
      filled: 0,
      status: 'open',
      time: Date.now() / 1000 - 300,
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      side: 'sell',
      type: 'limit',
      price: 3500,
      amount: 0.5,
      filled: 0,
      status: 'open',
      time: Date.now() / 1000 - 120,
    },
  ]

  const wallet: Wallet[] = [
    { currency: 'USDT', available: 8500, frozen: 500 },
    { currency: 'BTC', available: 0.1523, frozen: 0, avgPrice: 61200 },
    { currency: 'ETH', available: 2.45, frozen: 0, avgPrice: 3380 },
    { currency: 'SOL', available: 25, frozen: 0, avgPrice: 165 },
  ]

  return (
    <div className="bg-bitget-panel border border-bitget-border rounded">
      {/* Tabs */}
      <div className="flex border-b border-bitget-border">
        {(['positions', 'orders', 'history', 'assets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-bitget-yellow border-b-2 border-bitget-yellow'
                : 'text-bitget-muted hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'positions' && positions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-bitget-green/20 text-bitget-green rounded">
                {positions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'positions' && (
          <div className="space-y-2">
            {positions.length === 0 ? (
              <div className="text-center py-8 text-bitget-muted">No open positions</div>
            ) : (
              positions.map((pos, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-bitget-bg rounded border border-bitget-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pos.symbol}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        pos.side === 'long' ? 'bg-bitget-green/20 text-bitget-green' : 'bg-bitget-red/20 text-bitget-red'
                      }`}>
                        {pos.side.toUpperCase()}
                      </span>
                      {pos.leverage > 1 && (
                        <span className="text-xs text-bitget-muted">{pos.leverage}x</span>
                      )}
                    </div>
                    <div className="text-xs text-bitget-muted mt-1">
                      Size: {pos.size} @ {formatPrice(pos.entryPrice, showIDR)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {formatPrice(pos.markPrice, showIDR)}
                    </div>
                    <div className={`font-mono text-sm ${pos.unrealizedPnL >= 0 ? 'text-bitget-green' : 'text-bitget-red'}`}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)} USDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-bitget-muted">No open orders</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-bitget-bg rounded border border-bitget-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${order.side === 'buy' ? 'text-bitget-green' : 'text-bitget-red'}`}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className="text-xs text-bitget-muted">{order.type}</span>
                      <span className="font-medium">{order.symbol}</span>
                    </div>
                    <div className="text-xs text-bitget-muted mt-1">
                      {order.amount} @ {formatPrice(order.price, showIDR)}
                    </div>
                  </div>
                  <button className="px-3 py-1 text-xs text-bitget-red border border-bitget-red rounded hover:bg-bitget-red/10">
                    Cancel
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-2">
            {wallet.map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bitget-bg rounded border border-bitget-border">
                <div>
                  <span className="font-medium">{w.currency}</span>
                  {w.avgPrice && (
                    <span className="text-xs text-bitget-muted ml-2">Avg: {formatPrice(w.avgPrice, showIDR)}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono">{w.available.toFixed(w.currency === 'USDT' ? 2 : 4)}</div>
                  {w.frozen > 0 && (
                    <div className="text-xs text-bitget-muted">Frozen: {w.frozen.toFixed(w.currency === 'USDT' ? 2 : 4)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Positions
