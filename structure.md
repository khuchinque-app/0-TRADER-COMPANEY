# Project Structure — Paper-Trading Crypto Venue (Rung 0)

Scope: an Indonesian-flavored **paper-trading** terminal (Bitget-shaped UI, simulation-only — see
ADR 0002). Reference data from public Binance/Bybit feeds (see `docs/reference/data-feasibility.md`).
Terminal IA from `docs/reference/bitget-terminal-notes.md`.

**Stack (delegated, ADR 0001):** Next.js + TypeScript terminal, a Node data/ledger/engine
service, **SQLite** ledger written Postgres-compatible so a later real venue swaps the driver,
not the schema. No real money, custody, or execution.

## How to read this

- **§1 Top-level** — the monorepo shape (npm workspaces).
- **§2 Packages** — every folder + file with a one-line purpose.
- **§3 Module seams** — the 3 boundaries where Rung 0 becomes Rung 3 (data provider, ledger
  store, execution). Everything else is internal.
- **§4 Data flow** — one text diagram, reference-in → fill-out.
- **§5 Build order** — the 3-week cut, week by week.
- **§6 Config & tests.**

## 1. Top-level — monorepo shape

npm workspaces: one app is the **terminal** (the UI humans use), one is the **engine** (the
service that feeds it reference data, runs the paper matching engine, and owns the ledger),
plus a **shared** package for types/contracts/config both import. The terminal never talks to
Binance/Bybit or the DB directly — it only talks to the engine. That keeps the demo UI free of
data-provider and persistence specifics (see §3 seams).

```
trading-crypto-company/            # repo root (this folder)
├─ CONTEXT.md                       # glossary + locked decisions (grill trail)
├─ structure.md                     # this file
├─ findings1.md · GEMINI-NOTEBOOK.txt   # your research (keep as-is)
├─ .gitignore · .env.example        # secrets stay out; example keys only
├─ package.json                     # workspaces: ["apps/*","packages/*"]
├─ tsconfig.base.json
├─ docs/
│  ├─ adr/0001-sqlite-ledger-postgres-compatible.md
│  ├─ adr/0002-paper-only-simulation-scope.md
│  └─ reference/bitget-terminal-notes.md · data-feasibility.md
├─ packages/
│  └─ shared/                      # domain types + API contracts + config
└─ apps/
   ├─ terminal/                   # Next.js — the Bitget-shaped 3-pane UI
   └─ engine/                     # Node — feed, matching, fees, ledger, REST+WS
```

---

## 2. Every folder + file, one-line purpose

### 2.1 `packages/shared/` — the contract layer

```
packages/shared/
├─ package.json                     # workspace lib, name "@trading/shared"
├─ tsconfig.json
└─ src/
   ├─ index.ts                      # re-export the public surface
   ├─ domain.ts                    # core types: Asset, Pair, Candle, BookLevel, Ticker,
   │                               #   Order, Fill, Position, FxRate, DemoAccount
   ├─ api.ts                       # REST/WS message contracts engine⇄terminal
   │                               #   (BookSnapshot, TickMsg, FillMsg, LedgerState)
   └─ config.ts                    # asset shortlist (BTC/ETH/SOL/BNB/XRP/LINK),
                                    #   timeframes, fee schedule, color-convention flag,
                                    #   demo-funds constant, "reference only" copy
```

**Why a package, not a folder:** both apps import the same types, so a divergence here becomes a
runtime bug instead of a compile error. It's the seam that must stay single-sourced.

### 2.2 `apps/engine/` — feed, matching, ledger, API (Node)

```
apps/engine/
├─ package.json                     # name "@trading/engine", scripts: dev, build, test
└─ src/
   ├─ index.ts                      # bootstrap: wire feed → matcher → ledger → server, listen
   ├─ server/
   │  ├─ rest.ts                   # REST: /api/market/<pair> (snapshot: book+ticker+kline),
   │  │                             #  /api/ledger/<account> (demo account state), /api/fx
   │  └─ ws.ts                     # WS: outbound tick/book/fill stream to terminals;
   │                                #  inbound order-placement messages (guest accounts)
   ├─ feed/
   │  ├─ feed.ts                   # FeedAdapter seam: normalizes a provider into a single
   │  │                            #  TickEvent stream (see §3, seam #1)
   │  ├─ binance.ts                # Binance adapter: REST klines + combined WS stream
   │  ├─ bybit.ts                  # Bybit adapter: REST kline/ticker + public WS (fallback
   │  │                            #  provider + cross-check quotes)
   │  ├─ fx.ts                     # USD/IDR display rate: poll open.er-api once at boot,
   │  │                            #  refresh 6–24h, cache in-memory (display-only, ADR 0002)
   │  └─ synthetic-book.ts         # the paper venue's core: seeds a synthetic order book
   │                               #  around the reference mid (thin spread + depth shape)
   │                               #  so limit orders have something real to fill against
   ├─ matching/
   │  ├─ matcher.ts               # in-memory price-time priority loop over the synthetic
   │  │                            #  book + user limit orders; emits Fill events
   │  ├─ liquidity.ts             # simulated maker: counterparty fills for market orders,
   │  │                            #  slippage model (small fixed % of spread)
   │  └─ fees.ts                  # flat maker/taker fee schedule from shared/config
   ├─ ledger/
   │  ├─ ledger.ts               # double-entry spine: every fill/posting writes debits+credits
   │  │                           #  (immutable, Σ debits = Σ credits), Postgres-compatible
   │  │                           #  column types (ADR 0001)
   │  ├─ store.ts                 # LedgerStore seam: the ONLY file that touches the DB
   │  │                           #  driver (see §3, seam #2)
   │  ├─ sqlite-store.ts          # SQLite impl (node:sqlite / better-sqlite3), per-user rows
   │  ├─ schema.sql               # tables: accounts, balances, journal, orders, fills
   │  └─ reconciliation.ts        # invariant job: journal totals must equal balance totals;
   │                              #  fails loud (demo integrity check, runs on a timer)
   └─ demo/
      ├─ accounts.ts              # guest demo accounts: fresh demo funds per browser id,
      │                           #  persisted by userId so reloads keep history
      └─ seeding.ts               # starting demo funds + optional starter positions
```

### 2.3 `apps/terminal/` — the Bitget-shaped UI (Next.js + TypeScript)

```
apps/terminal/
├─ package.json                     # name "@trading/terminal", deps: next, lightweight-charts,
│                                   #   @trading/shared, a state lib (zustand or redux)
├─ next.config.mjs                 # image/font setup; proxy /api → engine if co-located
├─ tsconfig.json
├─ app/                            # Next app router
│  ├─ layout.tsx                  # root: dark terminal theme, "demo / reference data" banner
│  ├─ globals.css                 # design tokens: dark bg, green-up/red-down (config flag,
│  │                              #   §8 of the notes — color convention is a config, not copy)
│  └─ trading/
│     ├─ layout.tsx                # the 3-pane grid: left 80% [chart over bottom-tabs],
│     │                            #   right 20% [order form over account strip]
│     └─ [pair]/
│        ├─ page.tsx              # reads pair param, mounts the terminal for that pair
│        └─ loading.tsx           # skeleton while the market snapshot loads
├─ components/
│  ├─ topbar/
│  │  ├─ TickerStrip.tsx          # horizontal pair list: pair · 24h % (green+/red-), click→pair
│  │  └─ AssetStrip.tsx          # active-pair strip: last, 24h Δ, 24h H/L, volume, turnover
│  ├─ chart/
│  │  ├─ PriceChart.tsx           # lightweight-charts candlestick + volume + MA overlay;
│  │  │                           #  timeframe buttons 1s/5m/15m/1h/1D/1m
│  │  ├─ TimeframeBar.tsx
│  │  └─ VolumePane.tsx          # volume histogram, bars colored by candle direction
│  ├─ book/
│  │  ├─ OrderBook.tsx           # asks(red) over last-price line, bids(green) under,
│  │  │                           #  Price/Quantity/Total cols + relative depth bars
│  │  ├─ DepthBars.tsx           # the behind-the-numbers depth bars (CSS, not TV)
│  │  └─ MarketTrades.tsx        # recent-fill "tape": price · size · time, green/red by side
│  ├─ orderform/
│  │  ├─ OrderForm.tsx           # Buy/Sell toggle; Limit/Market; Price/Qty/Total; BBO fill;
│  │  │                           #  Available + Fee readouts; CTA = place simulated order
│  │  ├─ OrderTypeTabs.tsx       # Limit · Market (stop/OCO deferred, §5)
│  │  ├─ QuantitySlider.tsx      # 0–25/50/75/100% of available
│  │  └─ FxToggle.tsx            # USDT (internal) ⇄ IDR (labeled display toggle, Q7)
│  ├─ account/
│  │  ├─ PortfolioStrip.tsx       # Available · In-order · Est. value · P&L (always populated —
│  │  │                           #   demo is a funded account, unlike logged-out Bitget)
│  │  └─ Assets.tsx              # holdings list
│  ├─ tabs/
│  │  ├─ OpenOrders.tsx          # my open limit orders, cancel
│  │  ├─ OrderHistory.tsx        # filled/canceled history
│  │  └─ AssetsTab.tsx           # bottom-tab variant of holdings
│  └─ common/
│     ├─ Panel.tsx               # the resizable-ish panel shell (react-grid-layout or CSS grid)
│     ├─ ConnectionStatus.tsx    # WS live/stale indicator (bottom edge)
│     └─ DisclaimerBar.tsx       # persistent "demo / reference data / not a real venue"
├─ lib/
│  ├─ api-client.ts              # the ONLY place the terminal talks to the engine: REST
│  │                              #  snapshot + WS stream; typed against @trading/shared/api
│  ├─ store.ts                   # client state: selected pair, order form, account, book cache
│  ├─ feed-client.ts             # WS subscribe/reconnect (exponential backoff)
│  ├─ format.ts                  # tabular-figures number formatting, IDR conversion (display)
│  └─ ids.ts                     # stable guest userId (localStorage) → engine demo account
└─ public/
   └─ (fonts, favicon, og image — placeholder demo branding, NOT Bitget's)
```

**Chart note:** reference is TradingView; we build on `lightweight-charts` (canvas, candles +
volume + MA) per the notes §10. The depth panel is **our own** CSS depth bars, not a TV widget.

---

## 3. Module seams — where Rung 0 becomes Rung 3

Three boundaries. Everything else is internal to the demo. When you fund the PAKD, you replace
behind these seams; the UI and the matching/ledger logic survive.

1. **Seam #1 — `feed/feed.ts` (FeedAdapter).** The engine consumes one normalized `TickEvent`
   stream. `binance.ts` / `bybit.ts` are interchangeable adapters (already both supported, per
   `data-feasibility.md`). A real venue feeds live own-book data through the same interface.
2. **Seam #2 — `ledger/store.ts` (LedgerStore).** The only file that touches the DB driver.
   Today: `sqlite-store.ts`. Later: a `postgres-store.ts` implementing the same methods;
   `schema.sql` stays because it's Postgres-compatible (ADR 0001). Matching, fees, and
   reconciliation never change.
3. **Seam #3 — `matching/` (execution).** The demo fills against a **synthetic** book +
   simulated maker (`liquidity.ts`). A real venue replaces `synthetic-book.ts` + `liquidity.ts`
   with real matching + real custody/fiat rails; `matcher.ts`'s price-time-priority shape and
   the ledger postings it emits are exactly what a CEX does.

Rule: **no terminal component and no matcher/ledger file may import Binance, Bybit, SQLite, or
any vendor module directly** — only through the three seams above. `eslint` boundary rules or
arch lint enforce this.

---

## 4. Data flow (reference-in → fill-out)

```
 public feeds ──► FeedAdapter ──► synthetic-book + liquidity
   (Binance/Bybit    (seam #1)      │ price-time-priority
    REST klines,          │         ▼
    WS ticker/depth)     │    matcher ──fills──► ledger (double-entry,
    fx.ts (USD/IDR)       │      │                seam #2 → SQLite)
                          │      ▼ fills broadcast
                          │   server/ws.ts ──WS──► terminal feed-client
                          ▼                    (book, tape, fills, account)
                       server/rest.ts ◄─GET snapshot (kline+book+ticker+ledger+fx)
```

- REST answers "get me the world now" (chart history, book, ticker, my demo account, IDR rate).
- WS answers "tell me what changed" (ticks, book deltas, tape fills, my fills + account deltas).
- A terminal places an order **inbound over WS** (`order.place`); the engine validates it
  against the demo account's frozen/available balances, posts to the synthetic book, matches,
  and returns `order.ack` / `fill` messages. Guest identity = the browser's stable `userId`.

---

## 5. Build order (3-week cut, TDD per ticket)

Each slice = one testable behavior, RED→GREEN (engineering/tdd), reviewed before commit
(engineering/code-review). A tracer bullet cuts a whole system on week 1 so no week ends with
dead-end work.

**Week 1 — spine (data + ledger, no UI yet):**
- T1 shared types + config + npm workspaces scaffold (compile).
- T2 `feed/binance.ts` REST klines + `@ticker` WS, normalized `TickEvent` (replay-test vs
  recorded sample from `data-feasibility.md`).
- T3 `synthetic-book.ts` seeded from a mid; T4 `matcher.ts` price-time priority + T5 `fees.ts`.
- T6 `schema.sql` + `sqlite-store.ts`; T7 `ledger.ts` double-entry posting + T8
  `reconciliation.ts` invariant (the Σ debits = Σ credits test that must never go red).
- T9 `server/rest.ts` snapshot + T10 `server/ws.ts` outbound stream; T11 guest `accounts.ts`.

**Week 2 — the terminal:**
- T12 `app/` shell + 3-pane `Panel` grid + `globals.css` dark tokens.
- T13 `PriceChart.tsx` + `VolumePane.tsx` (lightweight-charts, kline history from REST).
- T14 `OrderBook.tsx` + `DepthBars.tsx` + `MarketTrades.tsx` (WS-fed).
- T15 `TickerStrip.tsx` + `AssetStrip.tsx`; T16 `OrderForm.tsx` (limit+market) + `FxToggle`.
- T17 `PortfolioStrip.tsx` + `OpenOrders`/`OrderHistory`; T18 `DisclaimerBar` +
  `ConnectionStatus` (mandatory, load-bearing per ADR 0002).

**Week 3 — glue, edge cases, ship:**
- T19 `feed-client.ts` reconnect + stale-feed handling; T20 IDR rate display + conversion
  labels; T21 `fx.ts` caching; T22 seeding demo funds + starter positions.
- T23 Bybit fallback adapter + cross-quote indicator; T24 boundary lint (seam rule, §3).
- T25 end-to-end: place limit → fill → ledger posts → account updates, on a live browser.
- T26 deploy (static terminal + engine) with the `.env.example` secrets in place; final
  reconciliation sweep + public "demo" disclaimer pass.

**Deferred (out of the 3 weeks, by design):** stop/OCO/iceberg/TWAP families, auth/real
accounts, real custody, fiat rails, OJK integration — all parked for Rung 1–3.

---

## 6. Config & tests

```
.env.example                       # DEMO_FUNDS, FX_CACHE_TTL, WS_TICKER_INTERVAL_MS,
                                  #   COLOR_CONVENTION=green-up | red-up, BOUNDARY strictness
packages/shared/src/config.ts      # asset list + fee schedule (single source, §2.1)
apps/engine/test/                  # unit: matcher (price-time), ledger (invariants),
                                   #  reconciliation, synthetic-book shape; replay fixtures
apps/terminal/test/                # component: OrderForm validation, FxToggle labels,
                                   #  DisclaimerBar always-render; e2e: place→fill flow
```

- Ledger tests use a recorded "day" of reference prices (from the scout's probe samples) so
  matching is deterministic in CI — no live network in tests.
- One CI job runs the `reconciliation.ts` sweep against a seeded ledger as the integrity gate.
- Secrets: FX rate source stays keyless (verified); if paid feeds ever get used, keys live in
  `.env` only, never in `packages/shared` (which is committed).

