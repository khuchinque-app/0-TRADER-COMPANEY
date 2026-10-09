# `out-of-scope.md` — routes deliberately NOT explored

Per the mandate: *"If you encounter a route outside of `/market/*`, do not explore it. Note it
here and continue focusing on the market endpoints."*

**Nothing in this file was requested.** No HTTP call was ever made to any path listed below —
not GET, not OPTIONS, not a HEAD probe, not an authentication attempt. The list is compiled
from the service's own routing source (`apps/exchange/server.mjs`,
`apps/backend/src/index.ts`) which was read over SSH as part of discovery, so it is complete
without generating any traffic against prohibited areas.

---

## 1. Explicitly forbidden by the mandate

| Path family | Why excluded |
|---|---|
| `/api/auth/*` (`signup`, `login`, `guest`, `me`, `seed`) | identity / credential surface |
| `/api/admin/*` (`stats`, `integrity`, `whitelabel`, `users`, `audit`) | privileged administration |
| `/api/wallet/*` (`balance`, `deposit`, `history`, `faucet`) | user funds |
| `/api/orders`, `/api/orders/:id`, `/api/portfolio` | account state, not market data |
| `/api/payment/*` | payments |
| `/api/social/*` (`/manager/lookup`) | account/identity |
| `/api/chat` | unrelated to markets |

> Note: `/api/market/orders`, `/api/market/orders/:id` and `/api/market/myorders/:slug` are
> **in** the market namespace but **require a bearer JWT**. They are *documented* in
> `endpoints.json` (so the inventory is complete) and deliberately **not called** — that is
> why `/api/market/myorders/{pair}` is listed as inferred rather than confirmed.

## 2. Not `/market/*`, so not in primary scope

| Path | Reason |
|---|---|
| `/trade` and `/trade/{COIN}` | separate universe-trading route family |
| `/chart/{PAIR}` | chart-only page route, sibling of `/market/depth_chart/{PAIR}` |
| `/id_ID/*` (help, terms) | static content pages from the mirrored sitemap |
| `/affiliate`, `/privacy-policy`, `/trade_api` | static content pages |
| `/`, `/akun/*` | landing + account SPA routes |
| `/api/markets`, `/api/ticker/:pair`, `/api/fx/usdt-idr`, `/api/trades/:symbol` | legacy market-adjacent API from the earlier terminal build (not part of this service's `/market/*` surface) |
| `/api/mexc/markets`, `/api/mexc/*` | raw upstream proxy surface, not this service's market API |
| `/api/health`, `/health` | operational health, outside `/market/*` |
| `/metrics`, `/debug/*` | none observed; listed only to state they were not probed |

## 3. Discovery files that were checked (allowed, and reported)

The mandate explicitly instructs checking these, so they **were** fetched (GET only) and are
reported in `discovery-evidence.json`:

`/robots.txt`, `/sitemap.xml`, `/openapi.json`, `/swagger.json`, `/api-docs`

Result: only `/robots.txt` is a real document (`Disallow: /`). The other four return the SPA
HTML shell — the exchange's catch-all renders `index.html` for unknown paths, so a `200
text/html` there means "no such document", **not** "document exists".

## 4. Method restrictions honoured

- Requests were **GET only**.
- The prober's retry path retries only on 429/5xx with exponential backoff and honours
  `Retry-After`; it never escalates or varies a payload to probe for a different response.
- No parameter fuzzing: query params used were only those declared in `config.ts`.
- No enumeration of all 957 primary routes — a stratified sample was probed instead, to keep
  the traffic budget minimal against a demo host.
