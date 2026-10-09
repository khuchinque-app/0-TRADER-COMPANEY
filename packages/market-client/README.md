# `@trading/market-client`

A **read-only, config-driven, typed** client for the `/market/*` surface of the ChinQue
Exchange simulation service (`http://187.127.178.20:22221`), plus a generated inventory of
every discovered market endpoint.

Built to the `new-prompt/mandate.md` brief. Discovery method, confirmed-vs-inferred
breakdown, and every caveat live in [`discovery-report.md`](./discovery-report.md).

---

## Authorization assumptions

> **Read this before running anything.**

- The service is the ChinQue Exchange **simulation** venue owned by this project. The
  mandate authorises **read-only** interaction with its market data.
- The target is a **paper-trading demo**. Robots are disallowed (`/robots.txt` →
  `Disallow: /`) and the operator is the requester — so this is authorized use of a
  first-party service, **not** third-party scraping.
- **Scope is `/market/*` and the JSON it fetches (`/api/market/*`). Nothing else is touched.**
  Routes we deliberately do not explore are listed in [`out-of-scope.md`](./out-of-scope.md).
- **GET only.** No POST/PUT/DELETE/PATCH. No auth bypass, fuzzing, brute force, injection,
  load testing, or destructive requests.
- **Politeness budget: 1 request/second**, enforced *in code* by `RateLimiter`. The prober
  additionally backs off exponentially on 429/5xx and honours `Retry-After`.
- **No secrets in code.** The base URL and every tunable come from environment variables.

If you point this client at a service you do not own, stop and get written permission first.

---

## Layout

```
packages/market-client/
├── src/
│   ├── config.ts          # route templates + all tunables (the "config-driven" core)
│   ├── market_client.ts   # the client: one generic request path for every route
│   ├── types.ts           # typed response models
│   ├── errors.ts          # typed error classes
│   ├── rate-limiter.ts    # 1 req/s politeness limiter
│   ├── cache.ts           # TTL cache
│   └── index.ts           # public exports
├── tools/
│   ├── generate-endpoints.mjs  # builds endpoints.json from templates + the symbol manifest
│   └── discover.mjs            # rate-limited live confirmation pass -> discovery-evidence.json
├── tests/
│   ├── market_client.test.ts   # 28 tests, mocks/fixtures only
│   └── fixtures/               # recorded live responses
├── endpoints.json              # 967 endpoint records
├── discovery-evidence.json     # raw probe output
├── discovery-report.md
└── out-of-scope.md
```

The mandate names the client file `market_client.ts` / `config.ts`; those exact names are
used here so the deliverable matches the spec.

---

## Install & build

```bash
cd packages/market-client
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # vitest run  (28 tests, no network)
```

Workspace-wide, from the repo root:

```bash
npm run build -w packages/market-client
```

---

## Usage

```ts
import { createMarketClient } from '@trading/market-client';

const client = createMarketClient({
  baseUrl: process.env.MARKET_CLIENT_BASE_URL ?? 'http://187.127.178.20:22221',
});

// the mandated reference endpoint
const ticker = await client.getMarket('ANIMEIDR');
console.log(ticker.data.state, ticker.data.lastPrice);

// the HTML page route (primary scope)
const page = await client.getMarketPage('animeidr');   // symbol is normalised -> ANIMEIDR
console.log(page.contentType);                          // text/html

// one generic entry point for every templated sub-resource
const depth  = await client.getMarketSubresource('depth',  'ANIMEIDR', { limit: 20 });
const trades = await client.getMarketSubresource('trades', 'ANIMEIDR', { limit: 50 });
const klines = await client.getMarketSubresource('klines', 'ANIMEIDR', { interval: '15m' });

// the symbol list (478 pairs) the /market page hydrates from
const { data } = await client.listMarkets();
console.log(data.pairs.filter((p) => p.state === 'NO_FEED').map((p) => p.slug));

// client-side pagination over the newest-first window
const paged = await client.iterateTrades('ANIMEIDR', { pageSize: 25, maxPages: 4 });
```

### The three mandated generic methods

| Method | Maps to | Notes |
|---|---|---|
| `getMarket(pair)` | `GET /api/market/ticker/{pair}` | typed `TickerResponse`; reference pair `ANIMEIDR` |
| `getMarketSubresource(pair, subresource, params)` | any template in `config.ts` | `subresource` ∈ `health, pairs, tickers, ticker, depth, trades, klines, manifest, universe` |
| `listMarkets()` | `GET /api/market/pairs` | the 478-symbol manifest list |

`getMarketPage(pair)` / `getDepthChartPage(pair)` cover the HTML `/market/*` page routes.

### Configuration

Every value is overridable by env var (nothing is hardcoded):

| Env var | Default | Meaning |
|---|---|---|
| `MARKET_CLIENT_BASE_URL` | `http://127.0.0.1:22221` | service origin |
| `MARKET_CLIENT_TIMEOUT_MS` | `8000` | per-attempt timeout |
| `MARKET_CLIENT_MAX_RETRIES` | `3` | extra attempts after the first |
| `MARKET_CLIENT_BACKOFF_BASE_MS` | `250` | exponential backoff base |
| `MARKET_CLIENT_BACKOFF_MAX_MS` | `5000` | backoff ceiling |
| `MARKET_CLIENT_MIN_INTERVAL_MS` | `1000` | **1 req/s floor**; raise, don't lower |
| `MARKET_CLIENT_CACHE_TTL_MS` | `2000` | local cache; `0` disables caching globally |
| `MARKET_CLIENT_API_KEY` | *(unset)* | only if a future read-only route requires it |

### Error handling

All errors extend `MarketClientError` and carry a `code`:

| Class | Trigger | Retried? |
|---|---|---|
| `TimeoutError` | attempt exceeded `timeoutMs` | yes |
| `NetworkError` | socket/DNS failure | yes |
| `RateLimitError` | 429 (has `retryAfterMs`) | yes, after `Retry-After` |
| `ServerError` | 5xx | yes, exponential |
| `NotFoundError` | 404 | **no** |
| `AuthRequiredError` | 401/403 | **no** — signals an out-of-scope route |
| `ParseError` | 2xx but malformed/empty JSON | no |
| `ConfigError` | bad param/symbol/config | no |

```ts
import { NotFoundError, RateLimitError } from '@trading/market-client';
try { await client.getMarket('NOPEIDR'); }
catch (e) { if (e instanceof NotFoundError) { /* 404 page is expected for unknown slugs */ } }
```

### Pagination — read this before assuming offsets

The upstream exposes **no offset/cursor on any route**. `limit` selects a newest-first window
(capped at 500 for `depth`, 1000 for `trades`/`klines`). `paginate()` therefore slices that
window **client-side** and reports `truncated: true` when the window did not cover the source.
See `PAGINATION` in `src/config.ts`.

---

## Regenerating the inventory & re-running discovery

```bash
# rebuild endpoints.json from the route templates + symbol manifest (no network)
npm run gen:endpoints

# rate-limited live confirmation pass (1 req/s, GET only) -> discovery-evidence.json
node tools/discover.mjs --base http://127.0.0.1:22221

# offline mode: emit route expectations without any network calls
node tools/discover.mjs --no-network
```

Optional flags for `generate-endpoints.mjs`: `--manifest <path>`, `--out <path>`.

---

## `endpoints.json`

```jsonc
{
  "generatedAt": "2026-10-09T…",
  "baseUrl": "http://187.127.178.20:22221",
  "symbolSource": { "file": "packages/indodax-routes/routes.json", "pairs": 478,
                    "quotes": { "IDR": 466, "USDT": 12 } },
  "scope": { "primary": "/market/* (HTML page routes)",
             "pageNetworkCall": "/api/market/* (the JSON the /market pages fetch)" },
  "counts": { "total": 967, "byScope": { "primary": 957, "page-network-call": 10 } },
  "endpoints": [
    {
      "method": "GET",
      "path": "/market/ANIMEIDR",
      "template": "/market/{pair}",
      "scope": "primary",
      "category": "unknown",
      "params": {},
      "response_schema": { },
      "auth": "none",
      "rate_limit": "…",
      "sample_response": { },
      "content_type": "text/html; charset=utf-8",
      "status_codes": [200, 404],
      "pagination": { "server_side": false, "strategy": "client-window" },
      "streaming": false,
      "notes": "…"
    }
  ]
}
```

`category` uses the mandated vocabulary (`ticker | orderbook | trades | candles | history |
stats | list | unknown`) with two additions that the real service needed:
`response_schema`, `content_type`, `status_codes`, `pagination` and `streaming` are per the
mandate's "document for every endpoint" list.

---

## Tests

`npm test` — 28 tests, **no live requests**; recorded fixtures plus a mocked `fetch`:

- successful parsing (live ticker, NO_FEED ticker, HTML page route, symbol list)
- template expansion + param defaults/validation (`limit` bounds, interval enum, aliases)
- 404 → `NotFoundError`, **not retried**
- 500 → retried 3×, then `ServerError`
- 429 → honours `Retry-After`, then `RateLimitError`
- timeout → `TimeoutError`
- malformed JSON and empty body → `ParseError`
- rate limiter serialises to ≥1s spacing; `cooldown()` push-back
- caching: hit, param-aware keys, TTL expiry
- pagination: windowing, truncation, `iterateTrades`

---

## Known limitations

1. **`/api/market/myorders/{pair}` is documented but not exercised** — it needs a bearer JWT,
   and the mandate scopes us to read-only market data. The client returns `AuthRequiredError`.
2. **Three templates are inferred, not confirmed** (`/api/market/tickers`,
   `/api/market/universe`, `/api/market/myorders/{pair}`) — see `discovery-report.md`.
3. **No `openapi.json` / `swagger.json` exists**; the SPA catch-all answers those paths with
   HTML. The inventory is derived from the service's own route manifest + source instead.
4. **`response_schema` is a human-readable shape map, not JSON Schema.** No formal schema is
   published by the service, so inventing full JSON Schema would over-claim.
5. The service is an internal simulation endpoint — treat its data as decorative, never as a
   real market feed for trading decisions.
