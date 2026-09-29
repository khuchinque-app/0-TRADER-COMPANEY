# Bitget Spot Terminal — Structure & Design Cue Sheet

> **Purpose:** design reference for our Indonesian-flavored paper-trading demo terminal. This captures
> the *visual shape / layout / cues* of Bitget's spot web terminal (`bitget.com/spot/<PAIR>`, e.g.
> `/spot/BTCUSDT`) so we can match its proportions and information architecture.
> **NOT a brand clone.** Do not copy logos, names, tickers-as-brand, or proprietary artwork.
> Source of truth: live DOM inspection of the real terminal (1920px viewport), 2026-09-23.
> Every claim marked **(inferred)** could not be confirmed directly in the DOM.

---

## 0. Tech & rendering

- **Framework:** React SPA. The body app root is `.bit-app`; panels use **Tailwind-style utility
  classes** (`bg-backgroundBase`, `border-ds-color-border`, `w-full h-full border-ds-color-border-s`,
  `phone:min-w-[100vw]`) plus hashed CSS-in-JS (`css-xxxxx`).
- **Panel system:** the terminal body is a **`react-grid-layout`** (`div.react-grid-layout`) of
  resizable **`react-grid-item`** panels (also **react-resizable**). Each panel is a
  `react-grid-item` that is independently resizable/reorderable. This is the key layout primitive.
- **Chart engine:** the chart panel shows a literal **"TradingView"** credit label in its footer and
  the pair title "BTC/USDT · 1 · Bitget". No `<canvas>`/`<svg>` node was found when the chart
  container was sampled (it re-renders/lazy-mounts), and no `[class*=tv-]`/`lightweight` node was
  present in that sample. **Conclusion (inferred):** it embeds a **TradingView widget / widget API**
  (standard in this venue class). For our demo, the practical stand-in is **TradingView
  `lightweight-charts`** (canvas-based, per-candle + volume + MA overlays), which is what Bitget-class
  terminals are built on. Treat "TradingView" as the reference, `lightweight-charts` as the concrete
  build choice.
- **Data feed:** real-time order book + trades via websocket ("Stable connection" indicator at the
  very bottom edge). DOM classes `border-ds-*` suggest a Design System ("ds") tokens layer.

---

## 1. Overall page layout & panel arrangement

Viewed at 1920px wide, top-to-bottom (y = offset from viewport top):

| y band | height | x range | What's there |
|---|---|---|---|
| `0–64` | 64 | full width | **Global top bar** (logo, product nav, login/signup). Outside the trading grid. |
| `65–113` | ~48 | `0–1560` | **Market ticker strip** (scrolling pair list w/ last price + 24h %). |
| `113–169` | ~56 | `0–1560` | **Asset info strip** for the active pair (last price, 24h stats). |
| `169–713` | 544 | `0–1200` | **PRICE CHART** panel (left, wide). |
| `169–713` | 544 | `1200–1560` | **ORDER BOOK / DEPTH** panel (right of chart). |
| `65–1665` | 1600 | `1560–1920` | **RIGHT COLUMN** — the **order form** + market-trades/spot-tabs stack, full height. |
| `713–1433` | 720 | `0–1560` | **BOTTOM ORDER-TABS panel** (open orders / history / assets, etc.). |
| `1433–1449` | ~16 | `0–13` | tiny **"Favorites"** handle + market-category filter rail. |

So the mental model is: **a 2-column body** where the **left ~80%** stacks [chart → bottom order
tabs] and the **right ~20%** is a full-height column that holds the order form (top) and
order-book/market-trades (upper). The top of the left column has the ticker strip + asset strip.

**Resizing:** each region is a `react-grid-item`; users can drag panel edges / collapse. For the
demo, a CSS grid with fixed columns (≈ `80% / 20%`) and the left column split
`chart 544px / bottom-tabs 720px` reproduces the shape; add optional drag-to-resize later.

---

## 2. Top bar + ticker strip (the "top")

- **Global bar (`y 0–64`):** left = logo + product tabs
  (`Spot`, `Futures`, `TradFi`, `Trading bots`, `Copy trading`, `Onchain`, `More`).
  Right = `Log in`, `Sign up`, app-download, language (globe), theme (sun/moon), settings (gear),
  support icon.
- **Ticker strip (`y 65–113`):** a horizontal row of pairs, each showing **pair · 24h %**.
  Real sample: `MHA/USDT -36.26%`, `MCAT/USDT +17.31%`, `PONS/USDT +7.72%`, `CNPY/USDT +3.55%`,
  `DEBIT/USDT -4.05%`, `XRP/USDT +1.53%`, `BTC/USDT -0.39%`, `CORE/USDT +12.80%`.
  Color-cued: **green = positive %, red = negative %**. It scrolls / is clickable to jump to a pair.
- **Asset info strip (`y 113–169`), active pair BTC/USDT, real values:**
  - `BTC/USDT` · "Bitcoin" · **last 85,555.48** · **-331.77 (-0.39%)**
  - `24h high 87,284.55` · `24h low 85,272.01` · `24h volume (BTC) 4.06K` · `24h turnover (USDT) 350.08M`
  - `Token category: Key Assets`
  - This strip sits **above** the chart, same width as the chart panel.

---

## 3. Price chart panel (left, 1200×544)

- **Header row inside the panel:** tabs **`Chart` / `About` / `Trading data`** and a **timeframe
  (Time) button group: `1s · 5m · 15m · 1h · 1D · 1m`** (the "1m" is highlighted as selected in the
  sample; the `+` / "1m+" affordance opens more TFs). **Bottom-left footer credit: "TradingView".**
- **Default view:** **candlestick (OHLC)**, one panel. **Not** a default line/area — candles are the
  canonical default in this venue class.
- **Overlays (inferred):** several **moving-average lines** rendered over the price (multiple
  colored MA lines, e.g. white/purple/yellow family). Bollinger/other bands are available via the
  indicator menu but **not** on by default (inferred). A thin **vertical left toolbar** of icon
  buttons switches chart type (candles/line/area) and opens drawing tools (trend lines, fib, text).
- **Volume:** a **volume histogram** sits in a sub-pane **at the bottom of the chart**, with its own
  small y-axis to its left; **volume bars are colored green/red to match the candle direction** of
  that period.
- **Axes:** price y-axis on the right; time x-axis along the bottom.
- **Candle colors:** **green = up candle, red = down candle** (consistent with §8).

---

## 4. Order book / depth panel (right of chart, 360×544)

Panel has two stacked sub-sections: **"Order book"** (top) and **"Market trades"** (recent tape,
below the book). Header columns: **`Price (USDT)` · `Quantity (BTC)` · `Total (USDT)`**.

- **Two-sided book, centered on the last price:**
  - **ASKS (sells) are listed on TOP** of the last-price line, **colored red**, prices descending
    upward (higher = farther down the list). Sample ask rows: `85,576.59 · 0.667925 · 57,158.7439`,
    `85,576.21 · 0.024463 · 2,093.4508`, `85,574.62 · 0.000584 · 49.9756`, …
  - **BIDS (buys) below the last-price line, colored green**, prices descending downward.
  - Each row = **Price | Qty | Cumulative-ish Total** with a **horizontal depth bar behind the
    numbers** whose **length ∝ Total(USDT)** at that level; **bids bar extends in green, asks in
    red**, from the right edge toward the center (cumulative/relative depth).
- **Best bid / best ask:** the **last-price line** in the middle shows the most recent trade; the
  nearest green row beneath it is the **best bid**, the nearest red row above it is the **best ask**
  (inferred from standard DOMA structure + the bar/last-price divider seen in the screenshot).
- **Relative depth:** the bars are **relative to the largest level on-screen** (inferred), giving a
  quick liquidity shape. A small toggle in the book header switches between **absolute and
  relative** depth and toggles the number of rows (inferred).
- **"Market trades" (recent-tape) sub-panel:** below the book, a scrolling list of
  `price · size · time` rows (each fill), color-coded green/red by side. This is the "tape".

---

## 5. Order form (right column, far edge)

Top of the right column. Structure top-to-bottom:

1. **Product tabs:** `Spot` · `Bots` (segmented). `Spot` active.
2. **Side toggle:** two big buttons **`Buy` (green) / `Sell` (red)** — toggles order side and flips
   the CTA button color/label.
3. **Order-type tabs:** **`Limit` · `Market` · `OCO`** (a fourth, stop, available in the OCO/trigger
   sub-panel; **stop-limit / stop-market are under the OCO & bottom "Trigger" tab** — inferred).
4. **Fields (Limit order):**
   - **Price** (denominated in **USDT**) — with a **`BBO`** (best bid/offer) quick-fill button.
   - **Quantity** (denominated in the base, **BTC**) — with a **0–25/50/75/100% slider** (inferred,
     standard for this venue class).
   - **Total** (in USDT) — auto-computed `Price × Quantity`; editable in either direction.
   - **Available** readout: sample shows **`-- USDT`** (user not logged in; logged-in state would
     show the usable base balance).
   - **Fee** line: displays the estimated fee for the order (sample is blank `--` when logged out).
5. **CTA + auth:** because the visitor is anonymous the primary action is **`Sign up`** / **`Log in`**,
   and the side of order is still selectable. Logged-in state replaces these with **`Buy BTC`** /
   **`Sell BTC`** (inferred).
6. Below the form in the same right column sits the **market-trades / spot list** tab area
   (`tab-spot-box`), plus quick-action links: **Account · Deposit · Transfer**.

---

## 6. Account / portfolio strip

- On the **logged-out** sample the portfolio strip is **collapsed / replaced by auth CTAs**
  (`Sign up`, `Log in`, `Account`, `Deposit`, `Transfer`). So the full strip is gated behind auth.
- **When logged in (inferred, standard for this venue class):** a compact strip shows, per USDT
  account: **Available**, **In Order (frozen)**, **Estimated account value / Total (USDT)**,
  **P&L (unrealized for positions)** and, where applicable, **Total balance / asset value**.
  For *spot* specifically: **Available (USDT)**, **In Order (USDT)**, and **Estimated account value**
  (sum of holdings). P&L/realized numbers are more prominent on the futures account; on spot the
  "available vs in-order" split is the core figure.
- Design cue: a **single horizontal row** of 2–4 stat blocks above/within the right column, with
  the "Available" figure most prominent. In our paper-trading demo this strip is **always populated**
  (we simulate a funded account), which is a divergence worth noting.

---

## 7. Bottom tabs panel (order-history region, 1560×720)

A tabbed panel under the chart with these tabs (real labels, with live counts in parens when logged
in; sample logged-out shows the set + a "Log in or Sign up to start trading" placeholder):

- **`Open orders` (0)** · **`Order history`** · **`Order details`** · **`Assets`** · **`Bots (0)`**
- A **sub-tab / filter row** listing order families, each with a count:
  `Limit｜Market (0)` · **`Trigger` (0)** · **`OCO` (0)** · **`TP/SL` (0)** · **`Trailing stop`
  (0)** · **`Iceberg` (0)** · **`TWAP` (0)** — plus a **`Cancel all`** action on the right.
- **Inferred:** for our demo the meaningful set is **Recent trades (fills) / My orders (open) /
  My trades (history)**. The `Trigger/OCO/TP-SL/Iceberg/TWAP` families are futures/advanced order
  types — keep as optional; the core 3-tab shape is *Open / History / Assets*.

---

## 8. Color scheme & "up/down" convention

- **Dark terminal.** Background ≈ near-black (`#0e1117`-class; `bg-backgroundBase`). Panel borders a
  slightly lighter `border-ds-color-border` (subtle, low-contrast 1px lines). Text: white/light-grey
  primary, muted grey secondary.
- **Convention: GREEN = UP / POSITIVE, RED = DOWN / NEGATIVE** (Western "green-up" convention —
  **NOT** the Chinese red-up/green-down style).
  - Candle up = green, candle down = red.
  - 24h % change: positive green, negative red (ticker strip).
  - Order book: **bids (buy side) = green, asks (sell side) = red**; depth bars match.
  - Order form: **`Buy` button = green, `Sell` button = red.**
  - Last-price delta in the asset strip: `-331.77 (-0.39%)` is **red** (negative).
- **Note for our Indonesian-flavored demo:** Indonesia (like China/Japan) traditionally uses
  **red = up / green = down** in some local stock contexts. We should pick **ONE** convention for the
  terminal. Matching Bitget's *shape* is layout, not color semantics — our team must decide whether
  to keep Bitget's green-up (Western) or go local red-up. **Recommendation:** keep **green-up** for
  crypto parity (crypto UX is globally green-up) but make the palette a config flag.

---

## 9. Typography & general feel

- **Sans-serif UI** (Inter-like / system). **Numerical cells (order book, prices, stats) use
  tabular/monospaced figures** so columns stay aligned as prices tick.
- **Density: high.** Small 12–13px body font, tight row height in the order book (~16–20px rows),
  thin dividers. Bold weight only for the last price / CTA / stat values.
- **Grid alignment:** everything sits on the `react-grid-layout` panel grid → consistent 1px panel
  separators, rounded-[4px] corners on panels, `8px/16px` padding.
- **Feel:** professional "trading terminal" — dark, data-dense, minimal chrome, color is a
  *functional* signal (side/direction), not decoration.

---

## 10. Charting library

- **Reference: TradingView** (literal "TradingView" footer credit in the chart panel).
- **Concrete build choice for our demo (inferred recommendation):** TradingView **`lightweight-charts`**
  (v4/v5, canvas renderer) — it natively gives **candlestick series + volume histogram +
  MA/line overlays + price/time axes + a crosshair**, matching exactly the overlays seen. Add an
  MA indicator (SMA) as the default overlay. For the order-book depth, render **our own** (CSS bars
  or a lightweight-carts "area" heat strip) — lightweight-charts has no built-in depth widget.

---

## 11. Panel map for the demo (proportion cheatsheet)

```
┌──────────────────────────────────────────────────────────────────────┬──────────────────┐
│  GLOBAL BAR:  [logo · Spot Futures …More]            [Login Signup ⚙] │                  │
├──────────────────────────────────────────────────────────────────────┤  RIGHT COLUMN    │
│  TICKER: MHA -36% | MCAT +17% | XRP +1.5% | …   (green+/red-)      │  (full height)   │
├──────────────────────────────────────────────────────────────────────┤                  │
│  ASSET STRIP: BTC/USDT  85,555.48 -0.39%  24hH 24hL Vol Turnover   │  SPOT | BOTS      │
├───────────────────────────────────┬──────────────────────────────────┤  [Buy][Sell]     │
│  CHART (candles + MA + volume)   │  ORDER BOOK (asks red↑/bids     │  Limit/Market/OCO│
│  tabs: Chart|About|Trading data  │  green↓, depth bars, last line) │  Price/Qty/Total │
│  Time: 1s 5m 15m 1h 1D 1m       │  + MARKET TRADES (tape) below    │  Avail / Fee     │
│                                 │                                  │  [Buy BTC CTA]    │
├───────────────────────────────────┴──────────────────────────────────┤                  │
│  BOTTOM TABS: Open orders | Order history | Assets | Bots          │  Account/Deposit  │
│  sub-tabs: Limit|Market · Trigger · OCO · TP/SL · Iceberg · TWAP   │  /Transfer       │
└──────────────────────────────────────────────────────────────────────┴──────────────────┘
  connection indicator (websocket status) at the very bottom edge
```

Left column ≈ 80% (1560/1920), right column ≈ 20% (360/1920). Chart : order-book : bottom-tabs
row split in the left column is **544px : 544px : 720px** (top band of 113–713 then 713–1433).

---

## Confidence / inference log

- **Confirmed from live DOM:** panel grid (react-grid-layout), all tab/field labels, asset-strip
  & ticker sample values, order-book 3-column layout (Price/Quantity/Total), "TradingView" credit,
  dark theme + green-up/red-down mapping, timeframe button set, order-form field set, bottom-tab
  families, react/Tailwind + DS-token classing.
- **Inferred (marked above):** exact best-bid/ask row position, relative-vs-absolute depth toggle,
  0–100% quantity slider, logged-in portfolio-strip figures, futures order families' exact
  behavior, MA periods default, and the specific `lightweight-charts` recommendation.
- **Not captured (blocked by geo/Restricted-IP modal + not-logged-in):** full logged-in
  portfolio strip numbers, OCO/stop order-entry subforms, and indicator menu contents.

*Design cues, not a spec — reproduce the shape & IA, not the brand.*
