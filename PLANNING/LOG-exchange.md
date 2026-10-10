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

## 2026-10-10 · UI refinement + real HTTP render

### Fixed
- **Server state injection bug (`server.mjs`).** The `__STATE__` replacement left
  the surrounding quotes, producing invalid JS (`window.__EXCHANGE_STATE__ =
  "{"state":...}"`). Now replaces `"__STATE__"` with a doubly-stringified JSON
  literal, so the injected state parses. (Page still worked because the router
  falls back to `location.pathname`, but the injected state was dead.)

### Changed
- **Trade page refinements** aligned to the reference's conventions (market-monitor
  dashboard: ticker tape, uppercase micro-labels, chips, compact tables):
  change-% pill, uppercase panel headers + section labels, order-book
  `HARGA / JUMLAH` header row, tighter row rhythm, larger mid-price.

### Verified
- **Real HTTP render (Playwright, not raw Chrome headless).**
  `apps/exchange/server.mjs` on `:22232` with `HOLLAEX_API_URL` → a live mock
  HollaEx upstream on `:18080`. Playwright Chromium navigated to
  `http://127.0.0.1:22232/market/BTCIDR` and rendered it: **10/10 checks PASS**,
  observed `GET /api/hx/market/BTCIDR` (+`/orderbook`, `/trades`) all HTTP 200,
  no page errors. Screenshot → `/tmp/trade-page-http.png` (1440×1900, 7,889 colors).
- **jsdom regression harness** (HTML served over HTTP, fetches to the live server):
  **14/14 PASS**.
- `npm test -w apps/exchange` 28/28 · `node --check server.mjs` OK · root
  `npm run build` exit 0 · secret scan clean.

### Note
- The only non-200 in the browser was `GET /api/market/myorders/BTCIDR` → 401
  (legacy orders endpoint, unauthenticated) — unrelated to market data.
- Reference (`6b3bbhptcfblg.ok.kimi.link`) is a US market-monitor dashboard, not an
  exchange terminal, so refinements follow its conventions rather than cloning it.

## 2026-10-10 · SECURITY fix: __STATE__ injection

### Found (verification pass)
- The `a9346c1` fix produced a valid JS string literal but did **not** escape `<`.
  `path` derives from `req.path` (attacker-controlled), so a request such as
  `GET /pwn</script><script>window.__PWN=1</script>` closed the `<script>` tag and
  injected executable markup — confirmed XSS.

### Fixed
- `server.mjs` now has `serializeState()` which JSON-encodes then escapes
  `<`→`\u003c`, `>`→`\u003e`, `&`→`\u0026`, U+2028→`\u2028`, U+2029→`\u2029`.
  Re-tested: payload is inert; `window.__EXCHANGE_STATE__` still parses as a string.

### Verified (fresh ports :18081 / :22233, Playwright over HTTP) — 21/21 PASS
- `/market/BTCIDR` 200; `/api/hx/market/BTCIDR(|/orderbook|/trades)` 200.
- unknown pair → API 404 + page 404; NO_FEED pair → 200 `stale:true`, greyed UI, no trade CTA.
- upstream down → ticker 200 `stale:true` (`source:stale`).
- state is a string, parses, contains no secret; no page errors; no 5xx from `/api/hx`.
- screenshot `/tmp/trade-page-http-verify.png` (1440×1900, 7595 colors).
- Only non-200 resources: legacy `GET /api/market/myorders/BTCIDR` → 401 (unauthenticated)
  and 404s for unknown-pair page assets — unrelated to `/api/hx`.
