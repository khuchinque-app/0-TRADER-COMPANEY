# apps/exchange — ChinQue Exchange (Indodax-mirror SPA)

Vite + React SPA served by a small Express server (`server.mjs`) on port
**22221**. It mirrors Indodax's route shape and, for market data, exposes a
server-side **HollaEx Kit adapter**.

> SIMULATION: virtual funds, not Indodax, not a real exchange. Every page carries
> a non-dismissible `SIMULASI` banner and `noindex,nofollow`; `robots.txt` is
> `Disallow: /`.

## Run

```bash
cd apps/exchange
npm install
npm run build        # vite build -> dist/
npm start            # node server.mjs  (PORT_EXCHANGE, default 22221)
npm test             # node --test test/*.test.mjs  (fixtures, no network)
```

## HollaEx adapter

Server-side only — **never** imported into the browser bundle.

```
lib/
  pair-resolver.mjs    # slug <-> HollaEx symbol (ANIMEIDR -> anime-usdt)
  hollaex-adapter.mjs  # fetch wrapper: timeout, retry/backoff, cache, stale
  market-client.mjs    # HTTP-ready {status, body}: LIVE / NO_FEED / 404
```

### Routes (browser -> exchange server -> HollaEx `/v2/public/*`)

| Route | Upstream | Notes |
| :--- | :--- | :--- |
| `GET /api/hx/market/list` | manifest | pair list with symbol mapping |
| `GET /api/hx/market/:pair` | `/v2/public/ticker?symbol=` | 404 unknown · 200 `NO_FEED` |
| `GET /api/hx/market/:pair/orderbook` | `/v2/public/orderbook?symbol=` | |
| `GET /api/hx/market/:pair/trades` | `/v2/public/trades?symbol=` | |
| `GET /api/hx/health` | `/v2/public/ticker` | `{ ok, stale, source }` |

Unknown pair → **404** `{ error: { code: "unknown_pair", message } }`.
Missing/unreachable feed → **200** `{ state: "NO_FEED", stale: true }` (never 5xx).

## Environment variables

Set in the project-root `.env` (server-side only):

| Var | Default | Purpose |
| :--- | :--- | :--- |
| `PORT_EXCHANGE` | `22221` | SPA server port |
| `EXCHANGE_COOKIE_NAME` | `sx_exchange_session` | distinct cookie (no 22220/22221 collision) |
| `API_INTERNAL_URL` | `http://localhost:11110` | legacy backend proxy target |
| `HOLLAEX_API_URL` | `http://localhost:10010/v2` | HollaEx Kit REST base |
| `HOLLAEX_WS_URL` | `ws://localhost:10010/stream` | HollaEx stream |
| `HOLLAEX_API_KEY` / `HOLLAEX_API_SECRET` | _(empty)_ | only for authorized calls; public reads need none |
| `HOLLAEX_TIMEOUT_MS` | `4000` | per-call timeout |
| `HOLLAEX_CACHE_TTL_MS` | `2000` | fresh cache window |
| `HOLLAEX_STALE_MAX_MS` | `300000` | how long stale data may be served |
| `HOLLAEX_MIN_INTERVAL_MS` | `1000` | rate-limit floor (1 req/s) |

## Authorization assumptions

- The adapter is **read-only** against HollaEx **public** endpoints.
- HollaEx credentials are read from server env and **never** returned to the
  browser (verified: `grep -rEn "HOLLAEX_API_(KEY|SECRET)" apps/exchange/dist`
  → no matches).
- Order placement / wallet / user / admin endpoints are **out of scope** —
  see `out-of-scope.md`.
- Branding is a **frontend config store** (`brand.config.json`), not a custom
  backend route.

## White-label brand config

`brand.config.json` holds name, logo text and colors used by the `/akun/admin`
page and shell. Edit it (or sync from HollaEx admin settings) to re-brand —
no server route involved.
