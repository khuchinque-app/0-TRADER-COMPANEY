# HollaEx Kit — API Notes (endpoint inventory)

Scope: **public market data only** for the exchange frontend adapter
(`apps/exchange/lib/hollaex-adapter.mjs`). Auth/user/wallet/admin are **out of
scope** and listed in `out-of-scope.md`.

- **Base URL:** `HOLLAEX_API_URL` (server env), e.g. `http://localhost:10010/v2`
- **WebSocket:** `HOLLAEX_WS_URL`, e.g. `ws://localhost:10010/stream`
- **Auth:** none required for the endpoints below.
- **Exposure:** every call is made **server-side only**. HollaEx credentials
  (`HOLLAEX_API_KEY` / `HOLLAEX_API_SECRET`) are never sent to the browser.
- **Caching:** all reads pass through a 2 s in-memory TTL cache
  (`HOLLAEX_CACHE_TTL_MS`); on failure the last good value is served with
  `stale: true`, and with no cache the route returns **HTTP 200** `NO_FEED`
  (never 5xx).
- **Rate limit:** self-imposed floor of **1 request/second**
  (`HOLLAEX_MIN_INTERVAL_MS`), serialized; 429/5xx retried with exponential
  backoff.

---

## GET /v2/public/ticker

```json
{
  "method": "GET",
  "path": "/v2/public/ticker",
  "category": "ticker",
  "params": { "symbol": "btc-usdt" },
  "auth": "none",
  "rate_limit": "self-imposed 1 req/s",
  "sample_response": [
    { "symbol": "btc-usdt", "open": 100, "close": 110, "high": 115, "low": 99,
      "last": 110, "volume": 12.5, "quote_volume": 1300, "change": 10,
      "timestamp": 1700000000 }
  ],
  "notes": "server-side only, cached 2s; omitted symbol returns the bulk list"
}
```

## GET /v2/public/orderbook

```json
{
  "method": "GET",
  "path": "/v2/public/orderbook",
  "category": "orderbook",
  "params": { "symbol": "btc-usdt" },
  "auth": "none",
  "rate_limit": "self-imposed 1 req/s",
  "sample_response": {
    "bids": [[109, 1.5], [108, 2.0]],
    "asks": [[111, 1.1], [112, 3.2]],
    "timestamp": 1700000000
  },
  "notes": "levels are [price, size]; cached 2s"
}
```

## GET /v2/public/trades

```json
{
  "method": "GET",
  "path": "/v2/public/trades",
  "category": "trades",
  "params": { "symbol": "btc-usdt" },
  "auth": "none",
  "rate_limit": "self-imposed 1 req/s",
  "sample_response": [
    { "price": 110, "size": 0.5, "side": "buy", "timestamp": 1700000000 }
  ],
  "notes": "recent public tape; cached 2s"
}
```

---

## Adapter route map (what the browser actually calls)

| Frontend route (server-side) | Upstream | Success | Unknown pair | Missing feed |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/hx/market/list` | derived from manifest | 200 pairs | — | — |
| `GET /api/hx/market/:pair` | `/v2/public/ticker?symbol=` | 200 `LIVE` | 404 `unknown_pair` | 200 `NO_FEED` (`stale:true`) |
| `GET /api/hx/market/:pair/orderbook` | `/v2/public/orderbook?symbol=` | 200 `LIVE` | 404 | 200 `NO_FEED` |
| `GET /api/hx/market/:pair/trades` | `/v2/public/trades?symbol=` | 200 `LIVE` | 404 | 200 `NO_FEED` |
| `GET /api/hx/health` | `/v2/public/ticker` (bulk) | 200 `{ok}` | — | 200 `{ok:false}` |

> Routes are namespaced under `/api/hx/` to avoid colliding with the existing
> `/api/market/*` legacy proxy in `apps/exchange/server.mjs` (see
> `discovery-report.md`). The spec's `app/api/market/[pair]/…` handlers map 1:1
> onto these paths.
