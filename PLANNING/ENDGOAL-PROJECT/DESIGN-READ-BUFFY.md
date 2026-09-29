# sitemenu-complete folder — design & build digest (Buffy, 2026-09-25)

Read for design/build purposes per user instruction. Three layers live here:

1. `sitemenu-complete.md` — customer journey + dashboard nav + route map +
   edge rules (the acceptance target; already audited in
   `PLANNING/RESPONSE-prompt-audit.md`).
2. `indodax-description.md` / `indodax-structure.md` — INDODAX business +
   technical reference (source: `indodax-tokocrypto-info.zip` at repo root).
   Build-relevant bits: their API shape (GET ticker/depth/trade/candles/
   summaries public; HMAC-SHA512 private getInfo/trade/orderHistory/...),
   REST + WebSocket, OJK/Bappebti compliance posture, Sep-2024 breach →
   Chainalysis. Use as API-shape and terminology reference for the
   Indonesian-flavored venue; NOT as a reason to copy their backend stack.
3. `sitemenu-complete-style-grafik/` — THE DESIGN KIT. Contents:

## A. Operative design system = `market-monitor.css`
This file IS the "Market Monitor Dashboard" reference (matches the kimi.link
target used for the Phase C UI match). Two themed token sets via
`[data-theme=dark]`; light is default in the file, dark tokens are the
terminal-native look:

- dark: `--bg:#000 --panel:#0d0d0d --raised:#161616 --ink:#fff
  --muted:#8f8f8f --line:#2e2e2e --accent:#3080ff --pos:#00bb7f
  --neg:#fb2c36 --warn:#e5a83a`, radii 2–6px, Geist Variable/Geist Mono.
- Layout skeleton: header (market-title + `.idx` index chips + `.mstat`
  OPEN/CLOSED pulse + clock) → `.tape` marquee (48s loop, pause control,
  `.tk` items) → `.app` grid `264px | 1fr | 340px`:
  - left col: `.wtabs` (watchlist tabs) + `.wsearch` + `.wlist` (`.wrow`
    rows w/ flash-up/flash-down animations) / `.pview` portfolio (`.psum`
    total + sparkline, `.prow` holdings)
  - center: `.chead` (symbol, big last price, chg, O/H/L) + chart `.cbody`,
    below it `.heat` grid (6-col tiles, color-mix intensity by %chg)
  - right col: `.rtabs` (movers/news) + `.rlist` (`.mrow` w/ one-line `.why`
    commentary, `.nrow` news w/ source tag) + `.ai` panel (orb, chips,
    typed text w/ caret, Regenerate + "not advice" note)
- Motion: `--fast .16s / --slow .34s` on one easing curve; `[data-reveal]`
  staggered entrance; `prefers-reduced-motion` fully respected; 44px touch
  targets; mobile reflow (center first, then left, then right columns).
- Accessibility: focus-visible outlines everywhere, sticky sortable table
  headers with caret state.

**Mapping to existing terminal components (Phase C build):** TickerTape↔`.tape`,
SymbolStrip↔`.chead`, Watchlist↔`.wtabs/.wlist/.wrow`, AccountRail↔`.pview/.psum`,
AiPanel↔`.ai`, BottomDock Movers↔`.mrow`, MarketTrades↔tape/`.rlist`.
**Gaps to verify in components (likely missing):** `.heat` sector grid,
portfolio sparkline, news rows with source tags, flash-up/flash-down price
animation, index chips row in header, `[data-reveal]` entrance stagger.

**PALETTE CONFLICT (flagged, not resolved):** the kit README promotes a
DIFFERENT palette (dribbble "lurn" shot: `#0a0a0f` bg, neon blue/cyan/purple
accents, glassmorphism) and says it is "chart visualization inspiration, not
client-facing dashboard design". The customer-facing target remains
market-monitor.css tokens. Per RULE.txt I do not reconcile silently: if the
neon look is wanted anywhere, it should be scoped to chart styling only.

## B. `lightweight-charts/` — full upstream source repo
Terminal already depends on `lightweight-charts ^4.1.0` (npm). The vendored
repo adds: `plugin-examples/`, `indicator-examples/`, `debug/`, website docs.
Use: reference for series plugins (custom overlays, e.g. indicator panes)
and testing patterns. Do NOT vendor the lib into the app; keep npm dep.

## C. `strata-pro/` — React+TS dashboard reference (vite, bun.lock)
Small app: `src/components/ui/TokenIcon.tsx`,
`src/features/dashboard/{Dashboard.tsx, dashboard.data.ts, components/}`.
Pattern worth copying: data shaping isolated in `dashboard.data.ts`, view in
`Dashboard.tsx`, token icons abstracted behind one component.

## D. Pine Script indicators (spec for our signal engine)
- `01-rsi-oscillator.pine` — RSI across 4 TFs (5m/15m/1h/4h), color-coded,
  configurable OB/OS levels.
- `02-ema-bb-signal.pine` — multi-level Bollinger + Nadaraya-Watson
  smoothing + EMA trend filter (k-NN weighted) + buy/sell signal lines.
- `03-macd.pine` — MACD + histogram + zero line.
- `pinescript-full/indicators/` — 416 more indicators (momentum/volatility/
  trend/channel/oscillator/volume); `pine-scripts/` — 34 strategies.
Build use: port the 3 headline indicators to a small TS indicator module in
`packages/shared` (pure functions over klines) and feed the AiPanel with
REAL computed signals instead of rules-of-thumb; keep the SIMULATED label
(ADR 0002 + prompt.txt SIMULASI badge rule). Cite the pine file in comments
as the spec source.

## E. INDODAX API shape → our route naming (ties to audit C8)
Their public API (`/api/ticker/{pair}`, `/api/depth/{pair}`, `/api/summaries`)
differs from both the prompt.txt spec (`/api/market/ticker`) and our current
(`/api/tickers`). Any renaming must pick ONE canonical shape first —
that is grill question Q5 territory; flagged, not decided.

## Immediate build actions derived from this digest
1. Verify the gap list (heat grid / sparkline / news rows / flash anim /
   index chips) against actual terminal components; add missing ones as
   small tasks (they belong in PLAN-TO-DO.md after user acceptance).
2. Adopt market-monitor.css dark tokens as the terminal theme
   (COLOR_CONVENTION decision Q5-of-grill still open: pos/neg swap).
3. Indicator module for AiPanel (port 3 pine indicators, TS, unit-tested).
4. Keep dribbble neon palette OUT of the main UI (chart accents only, if
   user confirms).
