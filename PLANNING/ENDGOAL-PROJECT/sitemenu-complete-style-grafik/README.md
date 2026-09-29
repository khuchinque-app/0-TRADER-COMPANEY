# Crypto Dashboard — Style & Script Reference

## Inspiration
- **Design Source**: [Fantik Studio® — crypto dashboard \ lurn](https://dribbble.com/shots/24730113-crypto-dashboard-lurn)
- **Style**: Dark theme, neon accents, glassmorphism, data-dense terminal aesthetic
- **Purpose**: Chart visualization inspiration (not client-facing dashboard design)

## 3 Complete Pine Script v6 Indicators

### 1. RSI Oscillator (Multi-Timeframe)
**File**: `01-rsi-oscillator.pine`
- Displays RSI across 4 timeframes simultaneously (5m, 15m, 1h, 4h)
- Color-coded lines for easy identification
- Configurable overbought/oversold levels

### 2. Bollinger Bands + EMA Signal (Nadaraya-Watson Smoothed)
**File**: `02-ema-bb-signal.pine`
- Multi-level Bollinger Bands (short/medium/long periods)
- Nadaraya-Watson kernel smoothing for cleaner signals
- EMA trend filter with k-NN weighted averaging
- Buy/sell signal lines with configurable lookback

### 3. MACD with Histogram
**File**: `03-macd.pine`
- Fast/Slow EMA crossover with signal line
- Histogram visualization with color coding
- Zero line reference
- Configurable periods

## Additional Resources

### Technical Indicators Collection
- **Folder**: `pinescript-full/indicators/` (416 Pine Script files)
- Categories: momentum, volatility, trends, channels, oscillators, volume
- All written in Pine Script v6 with mathematical rigor

### Open-Source Strategy Collection
- **Folder**: `pine-scripts/` (34 scripts)
- Categories: Bollinger Bands, Moving Average, RSI, Volume, Stochastic
- Mix of indicators and strategies

### UI Reference
- **Folder**: `strata-pro/` — React + TypeScript crypto dashboard
- **Folder**: `lightweight-charts/` — TradingView Lightweight Charts library
- **Images**: 3 Dribbble inspiration screenshots

## Color Palette (from Dribbble Design)
```css
--bg-primary: #0a0a0f;
--bg-secondary: #12121a;
--bg-card: #1a1a2e;
--border: #2a2a3e;
--text-primary: #ffffff;
--text-secondary: #8888aa;
--accent-blue: #3b82f6;
--accent-cyan: #06b6d4;
--accent-purple: #8b5cf6;
--accent-green: #10b981;
--accent-red: #ef4444;
--neon-glow: rgba(59, 130, 246, 0.3);
```

## Notes
- All Pine Scripts are open-source (MIT/MPL license)
- Dribbble design is for inspiration only — your own design takes precedence
- Scripts tested on TradingView Pine Editor v6
