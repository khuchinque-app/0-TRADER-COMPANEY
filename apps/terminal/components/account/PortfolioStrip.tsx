'use client';

interface PortfolioStripProps {
  account: any;
  pair: string;
}

export default function PortfolioStrip({ account, pair }: PortfolioStripProps) {
  if (!account) {
    return (
      <div className="p-3 text-[10px] text-[var(--text-muted)]">
        Loading account...
      </div>
    );
  }

  const usdtBalance = account.balances?.find((b: any) => b.asset === 'USDT')?.available || 0;
  const totalValue = account.totalValueUsdt || 0;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Portfolio</span>
      </div>

      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
        {/* Total Value */}
        <div className="p-2 bg-[var(--bg-panel)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Total Value</div>
          <div className="text-lg font-bold text-[var(--text-primary)] font-mono">{totalValue.toFixed(2)} <span className="text-xs text-[var(--text-muted)]">USDT</span></div>
        </div>

        {/* USDT Balance */}
        <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--text-secondary)]">USDT Available</span>
          <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">{usdtBalance.toFixed(2)}</span>
        </div>

        {/* Other Balances */}
        {account.balances
          ?.filter((b: any) => b.asset !== 'USDT' && b.available > 0)
          .map((balance: any) => (
            <div key={balance.asset} className="flex justify-between items-center py-1">
              <span className="text-xs text-[var(--text-muted)]">{balance.asset}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{balance.available.toFixed(6)}</span>
            </div>
          ))}

        {/* Positions */}
        {account.positions?.length > 0 && (
          <>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-2 mb-1 font-semibold">Open Positions</div>
            {account.positions.map((pos: any) => (
              <div key={pos.pair} className="p-2 bg-[var(--bg-panel)] border border-[var(--border)] text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-[var(--text-primary)]">{pos.pair}</span>
                  <span className="font-mono text-[var(--text-secondary)]">{pos.quantity.toFixed(6)}</span>
                </div>
                <div className="text-[var(--text-muted)] text-[10px]">
                  Entry: ${pos.avgEntryPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </>
        )}

        {(!account.positions || account.positions.length === 0) && (
          <div className="text-[10px] text-[var(--text-muted)] text-center py-4">
            No open positions
          </div>
        )}
      </div>
    </div>
  );
}
