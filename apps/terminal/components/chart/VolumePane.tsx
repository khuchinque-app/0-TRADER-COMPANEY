// VolumePane component - volume histogram
// Shows trading volume with bars colored by candle direction

'use client';

import { useEffect, useRef } from 'react';
import { cssVarAlpha } from '../../lib/css-var';

interface Props {
  candles: Array<{ time: number; close: number; volume: number }>;
  pair: string;
}

export default function VolumePane({ candles, pair }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const width = canvas.width;
    const height = canvas.height;
    const maxVolume = Math.max(...candles.map(c => c.volume));
    const barWidth = width / candles.length;

    ctx.clearRect(0, 0, width, height);

    // Concrete colors for the canvas — resolved from the design tokens.
    const upColor = cssVarAlpha('--gain', '#00bb7f', 0.5);
    const downColor = cssVarAlpha('--loss', '#fb2c36', 0.5);

    candles.forEach((candle, i) => {
      const barHeight = (candle.volume / maxVolume) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;

      // Color based on candle direction
      ctx.fillStyle = candle.close >= (candles[i - 1]?.close || candle.close)
        ? upColor
        : downColor;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [candles]);

  return (
    <div className="h-24 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}
