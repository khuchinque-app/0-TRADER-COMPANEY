// FxToggle component - USDT ⇄ IDR display toggle
// Uses Indodax USDT/IDR ticker as reference rate (not a real venue)

'use client';

import { useState, useEffect } from 'react';

interface Props {
  usdtValue: number;
  fxRate: number | null;
  label?: string;
}

export default function FxToggle({ usdtValue, fxRate, label = 'USDT' }: Props) {
  const [isIdr, setIsIdr] = useState(false);
  const [displayValue, setDisplayValue] = useState(usdtValue);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (isIdr && fxRate) {
      setDisplayValue(usdtValue * fxRate);
      setCurrencySymbol('Rp');
    } else {
      setDisplayValue(usdtValue);
      setCurrencySymbol('$');
    }
  }, [usdtValue, fxRate, isIdr]);

  const handleClick = () => {
    setIsIdr(!isIdr);
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[var(--text-secondary)] text-xs">{label}</span>}
      <button
        onClick={handleClick}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          isIdr
            ? 'bg-[var(--cyan)] text-[var(--text-primary)]'
            : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {isIdr ? 'IDR' : 'USDT'}
      </button>
      <span className={`text-sm font-mono ${isIdr ? 'text-[var(--cyan)]' : 'text-[var(--text-primary)]'}`}>
        {currencySymbol}{displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      {isStale && (
        <span className="text-[10px] text-[var(--text-muted)]">
          Reference rate: Indodax USDT/IDR, not a real venue
        </span>
      )}
    </div>
  );
}
