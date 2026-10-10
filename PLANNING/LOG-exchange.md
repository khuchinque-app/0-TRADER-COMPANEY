# LOG-exchange — apps/exchange

## 2026-10-10 · HollaEx adapter + mock-finish pass

**Scope:** finish the HollaEx integration started in the previous session and
finalize the investor-demo (mock) state. Legacy `apps/backend` and `apps/engine`
untouched.

### Done
- **SPA rewrite (critical).** `/market/{PAIR}` market data now calls the
  server-side adapter:
  - ticker → `GET /api/hx/market/:pair`
  - order book → `GET /api/hx/market/:pair/orderbook`
  - trades → `GET /api/hx/market/:pair/trades`
  - depth chart page → `/api/hx/market/:pair/orderbook`
  Candles (`/api/market/klines/*`), orders, wallet and auth intentionally stay on
  the legacy backend (HollaEx public contract has no candle endpoint here).
- **Trade page redesign.** Ticker stat bar (last / 24h / high / low / vol), single
  stacked order book with mid price + spread, TP/SL dashed lines on the candle
  chart, SL/TP order inputs and order-history columns. Responsive single-column
  fallback under 900px.
- **Mock validation.** Documented real vs mocked `/v2/public/*` shapes and the
  normalizer tolerances in `apps/exchange/discovery-report.md §5b`.
- **Monorepo build.** `npm install` at root hydrated workspace deps;
  root `build` script now uses `--if-present` (indodax-routes ships no build).
  `npm run build` at root → exit 0, all workspaces build.

### Verified
- `npm test -w apps/exchange` → 28/28 pass.
- `npm run build` (root) → exit 0.
- Adapter routes against mock upstream: `LIVE` 200; unknown pair 404;
  unreachable upstream → 200 `NO_FEED` `stale:true`.
- `HOLLAEX_API_(KEY|SECRET)` absent from the exchange bundle.

### Limitations
- No live HollaEx Kit available; shapes are fixture-modelled (documented).
- Headless-browser network-tab check not possible in this environment
  (Chrome segfault / snap AppArmor); wiring proven via bundle grep + route tests.
- Reference design at `https://6b3bbhptcfblg.ok.kimi.link/` is a client-rendered
  SPA with no server-extractable CSS; redesign follows the project's own design
  tokens for a clean, operational look.
