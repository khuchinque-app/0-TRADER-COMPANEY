// AssetsTab component - bottom tab variant of holdings
// Shows asset breakdown in tab format

'use client';

import type { Balance, Position } from '@trading/shared';

interface Props {
  balances: Balance[];
  positions: Position[];
  fxRate: number | null;
}

export default function AssetsTab({ balances, positions, fxRate }: Props) {
  const totalUsdt = positions.reduce((sum, p) => sum, 0);
  const usdtBalance = balances.find(b => b.asset === 'USDT')?.available || 0;

  return (
    <div className="h-full overflow-auto">
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] mb-1">Total Value</div>
        <div className="text-lg font-mono text-[var(--text-primary)]">
          ${totalUsdt.toFixed(2)}
          {fxRate && (
            <span className="text-xs text-[var(--text-muted)] ml-2">
              (Rp {(totalUsdt * fxRate).toLocaleString()})
            </span>
          )}
        </div>
      </div>

      {/* Balances */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-xs text-[var(--text-muted)] mb-2">BALANCES</div>
        {balances.map((b) => (
          <div key={b.asset} className="flex justify-between text-xs py-1">
            <span className="text-[var(--text-secondary)]">{b.asset}</span>
            <span className="font-mono">{b.available.toFixed(6)}</span>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div className="p-3">
        <div className="text-xs text-[var(--text-muted)] mb-2">POSITIONS</div>
        {positions.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)]">No open positions</div>
        ) : (
          positions.map((p) => (
            <div key={p.pair} className="py-2 border-b border-[var(--border)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-primary)] font-mono">{p.pair}</span>
                <span className="font-mono text-[var(--gain)]">+{p.quantity.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>Avg: ${p.avgEntryPrice.toFixed(2)}</span>
                <span>
                  ${(p.quantity * p.avgEntryPrice).toFixed(2)}
                  {fxRate && (
                    <span className="ml-2">Rp {(p.quantity * p.avgEntryPrice * fxRate).toLocaleString()}</span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
