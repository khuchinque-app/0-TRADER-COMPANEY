// TimeframeBar component - timeframe selector buttons
// 1m/5m/15m/1h/4h/1D

'use client';

import type { Timeframe } from '@trading/shared';

interface Props {
  current: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

export default function TimeframeBar({ current, onChange }: Props) {
  return (
    <div className="flex gap-1 p-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-3 py-1 text-xs font-mono rounded ${
            current === tf
              ? 'bg-[var(--cyan)] text-[var(--text-primary)]'
              : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
