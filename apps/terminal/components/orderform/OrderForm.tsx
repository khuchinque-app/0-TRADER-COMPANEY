'use client';

import { useState, useEffect } from 'react';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface OrderFormProps {
  pair: string;
  onOrder: (side: 'buy' | 'sell', type: 'limit' | 'market', price: number, quantity: number) => void;
  isConnected: boolean;
}

export default function OrderForm({ pair, onOrder, isConnected }: OrderFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bestAsk, setBestAsk] = useState<number>(0);
  const [bestBid, setBestBid] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/market/${pair}`);
        const data = await res.json();
        if (data.book) {
          setBestAsk(data.book.asks[0]?.price || 0);
          setBestBid(data.book.bids[0]?.price || 0);
        }
      } catch { /* ignore */ }
    };
    fetchBook();
  }, [pair]);

  useEffect(() => {
    const storedId = localStorage.getItem('trading_user_id') || 'guest_default';
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/ledger/${storedId}`);
        const data = await res.json();
        const usdt = data.balances?.find((b: any) => b.asset === 'USDT');
        setAvailableBalance(usdt?.available || 0);
      } catch { /* ignore */ }
    };
    fetchBalance();
  }, [pair]);

  const total = orderType === 'limit' && price && quantity
    ? (parseFloat(price) * parseFloat(quantity)).toFixed(2)
    : '';

  const handlePlaceOrder = () => {
    const qty = parseFloat(quantity);
    const prc = orderType === 'limit' ? parseFloat(price) : 0;

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    if (orderType === 'limit' && (isNaN(prc) || prc <= 0)) {
      alert('Please enter a valid price');
      return;
    }
    if (qty > 1000) {
      alert('Maximum order quantity: 1000');
      return;
    }

    onOrder(side, orderType, prc, qty);
  };

  const handlePercentClick = (pct: number) => {
    const maxQty = side === 'buy'
      ? availableBalance / (parseFloat(price) || bestAsk || 1)
      : availableBalance;
    setQuantity((maxQty * pct / 100).toFixed(6));
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--cyan)]" style={{ boxShadow: '0 0 4px var(--cyan)' }}></div>
          <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Place Order</span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">{pair}</span>
      </div>

      {/* Side Toggle */}
      <div className="flex gap-0.5 p-1 bg-[var(--bg-primary)] border-b border-[var(--border)]">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
            side === 'buy'
              ? 'bg-[var(--gain)] text-[var(--bg-primary)] shadow-[0_0_8px_rgba(0,187,127,0.4)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
            side === 'sell'
              ? 'bg-[var(--loss)] text-[var(--text-primary)] shadow-[0_0_8px_rgba(251,44,54,0.4)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-0.5 p-1 bg-[var(--bg-primary)] border-b border-[var(--border)]">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`flex-1 py-1 text-[10px] font-medium transition-all ${
              orderType === t
                ? 'bg-[var(--bg-hover)] text-[var(--cyan)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'limit' ? 'LIMIT' : 'MARKET'}
          </button>
        ))}
      </div>

      {/* Best Bid/Ask */}
      {orderType === 'limit' && (bestAsk > 0 || bestBid > 0) && (
        <div className="flex justify-between px-3 py-1.5 text-[10px] border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <span className="text-[var(--text-muted)]">
            Best Ask: <span className="text-[var(--loss)] font-mono">{bestAsk.toFixed(2)}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            Best Bid: <span className="text-[var(--gain)] font-mono">{bestBid.toFixed(2)}</span>
          </span>
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
        {orderType === 'limit' && (
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Price (USDT)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={bestAsk > 0 ? bestAsk.toString() : '0.00'}
              className="w-full bg-[var(--bg-panel)] border border-[var(--border)] rounded px-2.5 py-2 text-[13px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        )}

        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Quantity</label>
          <input
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.0000"
            className="w-full bg-[var(--bg-panel)] border border-[var(--border)] rounded px-2.5 py-2 text-[13px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Percentage Buttons */}
        <div className="flex gap-1">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => handlePercentClick(pct)}
              className="flex-1 py-1 text-[10px] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Total */}
        {total && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Total</span>
            <span className="text-[var(--text-primary)] font-mono font-semibold">{total} USDT</span>
          </div>
        )}

        {/* Balance */}
        <div className="flex justify-between text-[10px]">
          <span className="text-[var(--text-muted)]">Available</span>
          <span className="text-[var(--text-secondary)] font-mono">{availableBalance.toFixed(2)} USDT</span>
        </div>

        {/* Submit Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={!isConnected}
          className={`w-full py-2 font-semibold text-xs transition-all ${
            isConnected
              ? side === 'buy'
                ? 'bg-[var(--gain)] hover:brightness-110 text-[var(--bg-primary)] shadow-[0_0_12px_rgba(0,187,127,0.3)]'
                : 'bg-[var(--loss)] hover:brightness-110 text-[var(--text-primary)] shadow-[0_0_12px_rgba(251,44,54,0.3)]'
              : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          {!isConnected ? 'Connecting...' : `${side === 'buy' ? 'BUY' : 'SELL'} ${pair.replace('USDT', '')}`}
        </button>

        {/* Fee Info */}
        <div className="text-[10px] text-[var(--text-muted)] text-center">
          Fee: 0.2% taker · 0.1% maker
        </div>
      </div>
    </div>
  );
}
