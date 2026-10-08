import React, { useState } from 'react'
import { formatPrice } from '../data/markets'

interface OrderFormProps {
  symbol: string
  currentPrice: number
  showIDR: boolean
  onOrder: (side: 'buy' | 'sell', type: 'limit' | 'market', price: number, amount: number) => void
}

const OrderForm: React.FC<OrderFormProps> = ({ symbol, currentPrice, showIDR, onOrder }) => {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit')
  const [price, setPrice] = useState(currentPrice.toString())
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const orderPrice = orderType === 'market' ? currentPrice : parseFloat(price)
    onOrder(side, orderType, orderPrice, parseFloat(amount))
  }

  return (
    <div className="flex flex-col h-full bg-bitget-panel border border-bitget-border rounded">
      <div className="px-3 py-2 border-b border-bitget-border flex items-center justify-between">
        <span className="font-medium text-sm">Place Order</span>
        <span className="text-xs text-bitget-muted">{symbol}</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Side Toggle */}
        <div className="flex gap-1 p-1 bg-bitget-bg rounded">
          <button
            onClick={() => setSide('buy')}
            className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${
              side === 'buy' ? 'bg-bitget-green text-white' : 'text-bitget-muted hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${
              side === 'sell' ? 'bg-bitget-red text-white' : 'text-bitget-muted hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Order Type */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setOrderType('limit')}
            className={`px-2 py-1 rounded ${
              orderType === 'limit' ? 'bg-bitget-border text-white' : 'text-bitget-muted'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`px-2 py-1 rounded ${
              orderType === 'market' ? 'bg-bitget-border text-white' : 'text-bitget-muted'
            }`}
          >
            Market
          </button>
        </div>

        {/* Price Input */}
        {orderType === 'limit' && (
          <div>
            <label className="text-xs text-bitget-muted mb-1 block">Price ({showIDR ? 'IDR' : 'USDT'})</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-bitget-bg border border-bitget-border rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-bitget-yellow"
              />
              <span className="absolute right-3 top-2 text-xs text-bitget-muted">
                {showIDR ? 'IDR' : 'USDT'}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="text-xs text-bitget-muted mb-1 block">Amount ({symbol.split('/')[0]})</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-bitget-bg border border-bitget-border rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-bitget-yellow"
            />
            <span className="absolute right-3 top-2 text-xs text-bitget-muted">
              {symbol.split('/')[0]}
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-bitget-muted">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="0"
            className="w-full h-1 bg-bitget-border rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Total */}
        <div className="flex justify-between text-sm">
          <span className="text-bitget-muted">Total</span>
          <span className="text-white font-mono">
            {amount ? formatPrice(parseFloat(amount) * (orderType === 'market' ? currentPrice : parseFloat(price || currentPrice.toString())), showIDR) : '--'}
          </span>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className={`w-full py-2.5 rounded font-medium text-sm transition-colors ${
            side === 'buy'
              ? 'bg-bitget-green hover:bg-opacity-90 text-white'
              : 'bg-bitget-red hover:bg-opacity-90 text-white'
          }`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {symbol.split('/')[0]}
        </button>
      </div>
    </div>
  )
}

export default OrderForm
