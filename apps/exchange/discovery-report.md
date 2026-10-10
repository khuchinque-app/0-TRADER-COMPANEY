# Discovery Report — HollaEx adapter (apps/exchange)

Date: 2026-10-10 · Scope: `/v2/public/*` market data only.

## 1. How the HollaEx endpoints were discovered

HollaEx Kit is a Docker-deployed exchange stack (nginx + redis + postgres + kit
server) exposing a standard `/v2/*` REST API. The public market-data surface used
here is the documented trio:

- `GET /v2/public/ticker` (single `?symbol=`, or bulk when omitted)
- `GET /v2/public/orderbook?symbol=`
- `GET /v2/public/trades?symbol=`

Because no Kit instance was running in this environment when the adapter was
built, the endpoints were pinned from the specification (`new-prompt/task.md`
§HOLLAEX KIT, `COMPREHENSIVE_PROJECT_PROMPT.md`) and **recorded fixtures**
(`apps/exchange/test/fixtures/`) stand in for live responses in unit tests.
The adapter is env-driven (`HOLLAEX_API_URL`), so pointing it at a real Kit
requires no code change. Live behaviour was verified end-to-end against a local
mock upstream serving those exact fixtures (see §5).

## 2. Pair resolution logic

Frontend slugs mirror Indodax (`BTCIDR`); HollaEx symbols are `base-usdt`.

Rule (`lib/pair-resolver.mjs` → `toHollaexSymbol`):

1. uppercase, strip non-alphanumerics (`btc-idr` → `BTCIDR`)
2. strip **one** trailing quote suffix (`IDR` or `USDT`)
3. append `-usdt` → `btc-usdt`
4. a slug that is only a quote (`IDR`, `USDT`) resolves to `null`

The reverse mapping (`toSlug`) renders HollaEx symbols back into the IDR display
namespace. `buildPairIndex` supports **verification** against a live HollaEx pair
list: when a symbol list is supplied, slugs whose derived symbol is absent are
dropped and `verified = true`.

`/api/hx/market/:pair` returns **404 `unknown_pair`** when the slug is not in the
manifest index; it never fabricates a NO_FEED for an unknown pair.

## 3. Route namespacing (why `/api/hx/*`)

`apps/exchange/server.mjs` already proxies **all** of `/api/*` to the legacy
backend on `:11110`, and the SPA calls legacy paths such as
`/api/market/tickers`, `/api/market/ticker/:slug`, `/api/market/depth/:slug`.
Registering the spec's literal `/api/market/:pair` would shadow those
single-segment routes. The HollaEx routes are therefore mounted under
`/api/hx/` **before** the legacy proxy. Mapping to the spec's Next.js handlers:

| Spec handler | Implemented route |
| :--- | :--- |
| `app/api/market/list/route.ts` | `GET /api/hx/market/list` |
| `app/api/market/[pair]/route.ts` | `GET /api/hx/market/:pair` |
| `app/api/market/[pair]/orderbook/route.ts` | `GET /api/hx/market/:pair/orderbook` |
| `app/api/market/[pair]/trades/route.ts` | `GET /api/hx/market/:pair/trades` |

The app is **Vite + Express**, not Next.js, so the handlers are Express routes
instead of `route.ts` files (per owner decision).

## 4. Rate-limit observations

- Self-imposed floor: **1 req/s** to HollaEx public endpoints
  (`HOLLAEX_MIN_INTERVAL_MS`), enforced by a serialized queue.
- 429 and 5xx are retried with exponential backoff (`2^n × minInterval`, up to
  `HOLLAEX_MAX_RETRIES`, default 2), then fall back to cache.
- Cache TTL is 2 s. Stale values are served for up to `HOLLAEX_STALE_MAX_MS`
  (default 300 s) with `stale: true`.
- HollaEx's own published rate limits are **unknown** here (no live instance to
  probe); the floor above is conservative and configurable.

## 5. Verification performed

- Unit tests: `npm test -w apps/exchange` → **28/28 pass** (fixtures only, no
  network).
- End-to-end against a mock upstream (`:18080`) and the real server:
  - `GET /api/hx/health` → `{ok:true, source:"live", pairs:478}`
  - `GET /api/hx/market/BTCIDR` → 200 `LIVE`, `lastPrice:110`
  - `GET /api/hx/market/FAKEXYZ` → **404** `unknown_pair`
  - `GET /api/hx/market/BTCIDR/orderbook` → 200 bids/asks
- End-to-end with upstream unreachable (`:9`, 800 ms timeout):
  - `GET /api/hx/market/BTCIDR` → **200** `NO_FEED`, `stale:true` (not 5xx)
  - orderbook/trades → 200 `NO_FEED`; health → `{ok:false}`

## 5b. Mock vs real response shapes

No live HollaEx Kit was reachable in this environment, so the shapes below are
**modelled from the documented `/v2/public/*` contract** and captured as fixtures
(`apps/exchange/test/fixtures/`). They are what the adapter consumes and what the
mock upstream replays end-to-end.

| Endpoint | Field | Real HollaEx | Our mock/fixture | Mismatch risk |
| :--- | :--- | :--- | :--- | :--- |
| `/v2/public/ticker?symbol=` | envelope | array of tickers | array of 1 | low |
| | price fields | `open/close/high/low/last/volume/quote_volume/change/timestamp` | same | low |
| | bulk (no symbol) | object keyed by symbol | object keyed by symbol | low |
| `/v2/public/orderbook?symbol=` | levels | `{ bids, asks }` of `[price, size]` | same | low |
| | timestamp | `timestamp` (seconds) | same | low |
| `/v2/public/trades?symbol=` | fields | `{ price, size, side, timestamp }` | same | low |

**Robustness measures** (so a real Kit cannot break the adapter):

- `normalizeTicker` accepts `last | close | price`, and `quote_volume | quoteVolume`.
- `normalizeOrderbook` accepts array levels `[p, s]` **or** object levels
  `{ price, size }`.
- `normalizeTrades` accepts a bare array **or** `{ data: [...] }`.
- Wrong types are coerced with `Number()`; missing values become `null` rather
  than throwing.

**Genuinely unknown (cannot be proven without a live Kit):** exact HTTP status for
an unknown symbol (we assume an empty list ⇒ NO_FEED, or 404 ⇒ NO_FEED, both
handled), and HollaEx's own rate-limit headers/allowance.

## 6. Blocked / unknown areas

- **No live HollaEx Kit** was available to confirm exact response shapes; the
  normalizers accept the documented shapes and tolerate array/object variants.
- HollaEx's real per-endpoint rate limits are unprobed.
- Authenticated surfaces (`/v2/user`, `/v2/wallet`, `/v2/order`, `/v2/admin`)
  are intentionally untouched — see `out-of-scope.md`.
- `/market/{PAIR}` and `/market/depth_chart/{PAIR}` now read the adapter routes
  (`/api/hx/market/:pair` and `/api/hx/market/:pair/orderbook`). Candles
  (`/api/market/klines/*`), order placement, wallet and auth still use the legacy
  backend — HollaEx public data has no candle endpoint in the pinned contract.
- Headless-browser verification of the live network tab was **not possible** in
  this environment (Chrome segfaults / snap AppArmor); wiring was instead proven
  by grepping the built bundle and by exercising the adapter routes directly.
