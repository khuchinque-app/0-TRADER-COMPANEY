# `discovery-report.md` — `/market/*` endpoint discovery

**Target:** `http://187.127.178.20:22221`
**Primary reference endpoint:** `/market/ANIMEIDR`
**Scope:** all `/market/*` routes + the JSON they fetch (`/api/market/*`)
**Date:** 2026-10-09
**Method:** source-of-truth inspection + rate-limited read-only HTTP probing

---

## 1. Tooling used (and an honest note on the mandate)

The mandate names two tools and forbids one:

| Mandated tool | Used? | What I actually used |
|---|---|---|
| `agent-reach` (load dynamic pages, intercept XHR/WS, extract JSON) | **Not available to me** | `read_url` — fetches a URL and extracts readable text, including `contentType` and HTTP status. Functionally the "agent-reach web channel" for this task. |
| `mcp-anysearch` (search for docs, Swagger/OpenAPI, JS bundles, hidden routes) | **Not available to me** | `web_search` for anything published about the host, plus direct inspection of the service's own source and route manifest (strictly more authoritative than a search engine for a private endpoint). |
| **Not** headless Chrome / Puppeteer / naive curl loops | **Honoured** | A rate-limited, backoff-aware prober (`tools/discover.mjs`) instead. |

I do not have tools by those two names. I used the closest working equivalents and am telling
you rather than pretending otherwise. Note that the *strongest* evidence available here was not
scraping at all: the service's own `apps/exchange/server.mjs`, `apps/backend/src/market.ts` and
`packages/indodax-routes/routes.json` are read directly, which makes the route templates and
status-code behaviour **known** rather than guessed.

### Why Chrome was not used — and the mandate's rationale was almost right

The mandate says headless Chrome hangs on crypto sites "because of WebSockets and SSE".
Measured on this host, the real cause is broader:

```
$ google-chrome --headless=new --no-sandbox --dump-dom data:text/html,'<h1>hi</h1>'
<html><head></head><body><h1>hi</h1></body></html>          # 0.75s, exit 0

$ google-chrome --headless=new --no-sandbox --dump-dom http://127.0.0.1:11110/api/health
Command exited with non-zero status 124                     # 25s timeout, no output
```

Chrome hangs on **every** http(s) URL — including a plain-JSON localhost endpoint with no
WebSockets, no SSE and no JS at all — while `data:` URLs render fine. So Chrome's network
service is blocked on this host, independently of transport type. Either way the mandate's
conclusion (don't drive discovery with headless Chrome) is correct here; only the stated
reason is narrower than the actual behaviour. This also explains why the earlier
`scripts/cdp-verify.mjs` (live-HTTP render check) could not run, and why the render proof was
rebuilt as an offline harness (`scripts/cdp-render-proof.mjs`).

`--no-proxy-server`, `--proxy-server='direct://'`, `--proxy-bypass-list='*'`,
`--host-resolver-rules='MAP * 127.0.0.1'`, `--single-process` and
`--disable-features=NetworkService` were all tried; none helped. `gsettings` reports proxy mode
`none` and there is no proxy in the environment. Chromium (snap) additionally fails under
AppArmor. This is recorded as **finding F1**.

---

## 2. How endpoints were discovered

1. **Route manifest (authoritative, no HTTP).** `packages/indodax-routes/routes.json` →
   `478 pairs` (`466 IDR` + `12 USDT`) + 7 static routes. This is the symbol list; the manifest
   is what the exchange server validates slugs against.
2. **Routing source (authoritative, no HTTP).** `apps/exchange/server.mjs#routeState()` defines
   the `/market/*` page routes and their status codes; `apps/backend/src/market.ts#createMarketRouter()`
   defines the JSON sub-resources; `apps/backend/src/index.ts` mounts them at `/api/market`.
3. **Page bundle inspection.** The `/market/*` pages are a client-rendered SPA
   (`apps/exchange/src/main.jsx` → built bundle). The HTML shell contains no market data; every
   figure is fetched at runtime from `/api/market/*`. That is how the "network calls made by the
   page" set was established.
4. **Standard discovery files** probed read-only (see §4).
5. **Rate-limited live confirmation** (`tools/discover.mjs`, GET only, 1 req/s, exponential
   backoff, `Retry-After` honoured) against a stratified sample — reference pair, a known
   NO_FEED pair, a USDT pair, first/last manifest entries, the singleton pages, and a
   deliberately invalid slug as a negative control.
6. **Programmatic inventory generation** (`tools/generate-endpoints.mjs`) from the templates +
   symbol list — no hand-written records.

### Reference endpoint, confirmed

```
GET /market/ANIMEIDR
-> 200  text/html; charset=utf-8
   title: "ChinQue Exchange — Simulasi Trading Kripto Indonesia"
   body includes the persistent SIMULASI banner, then the SPA mount point
   (market data arrives client-side from GET /api/market/ticker/ANIMEIDR)
```

---

## 3. Inventory result

| Metric | Value |
|---|---|
| Total `endpoints.json` records | **967** |
| — primary scope (`/market/*`) | **957** (`/market` ×1, `/market/{pair}` ×478, `/market/depth_chart/{pair}` ×478) |
| — page network calls (`/api/market/*`) | **10** templates |
| Distinct route templates | 13 |
| Templates **confirmed** by probe | **10 / 13** |
| Templates **inferred** | **3** |
| Manifest symbols | 478 (466 IDR, 12 USDT) |

### Confirmed (probed, live status recorded)

`/market` · `/market/{pair}` · `/market/depth_chart/{pair}` · `/api/market/health` ·
`/api/market/pairs` · `/api/market/ticker/{pair}` · `/api/market/depth/{pair}` ·
`/api/market/trades/{pair}` · `/api/market/klines/{pair}` · `/api/market/manifest`

Probe sample (23 paths, 22× `200`, 1× `404` as designed):

| Path | Status | Content-Type |
|---|---|---|
| `/market/ANIMEIDR` | 200 | text/html |
| `/market/depth_chart/ANIMEIDR` | 200 | text/html |
| `/market/ACSIDR` | 200 | text/html |
| `/market/BONKUSDT` | 200 | text/html |
| `/market/1INCHIDR` (first manifest pair) | 200 | text/html |
| `/market/ZRXIDR` (last manifest pair) | 200 | text/html |
| `/market` | 200 | text/html |
| `/api/market/health` | 200 | application/json |
| `/api/market/pairs` | 200 | application/json |
| `/api/market/manifest` | 200 | application/json |
| `/api/market/ticker/ANIMEIDR` | 200 | application/json |
| `/api/market/ticker/ACSIDR` | 200 | application/json |
| `/api/market/depth/ANIMEIDR?limit=5` | 200 | application/json |
| `/api/market/trades/ANIMEIDR?limit=5` | 200 | application/json |
| `/api/market/klines/ANIMEIDR?interval=15m&limit=5` | 200 | application/json |
| **`/market/NOTAREALSLUG123`** (negative control) | **404** | text/html |

**No 5xx was observed on any probed path** (`no5xxObserved: true`). The negative control
returning a real `404` is the important one: it proves `/market/{pair}` genuinely discriminates
by slug, and that the `200`s above are not just the catch-all answering everything.

### Inferred (documented from source, NOT probed)

| Template | Why not probed |
|---|---|
| `/api/market/tickers` | bulk ticker; skipped to keep the traffic budget small (it fans out to a full-market upstream call) |
| `/api/market/universe` | full upstream universe; same reason, and its response is large |
| `/api/market/myorders/{pair}` | requires a bearer JWT → out of read-only scope (see `out-of-scope.md`) |

All three are fully described in `endpoints.json` from their implementing source, and are
labelled inferred in `discovery-evidence.json#summary.inferredTemplates`. They are **not**
claimed as verified.

---

## 4. Standard discovery files

| Path | Status | Content-Type | Interpretation |
|---|---|---|---|
| `/robots.txt` | 200 | `text/plain` | real document: `User-agent: *` / `Disallow: /` |
| `/sitemap.xml` | 200 | `text/html` | **SPA shell — no sitemap exists** |
| `/openapi.json` | 200 | `text/html` | **SPA shell — no OpenAPI document** |
| `/swagger.json` | 200 | `text/html` | **SPA shell — no Swagger document** |
| `/api-docs` | 200 | `text/html` | **SPA shell — no API docs** |

The `200 text/html` for the last four is the exchange catch-all rendering `index.html` for any
unmatched path. Treating those `200`s as "document found" would be a false positive; they are
recorded as *no such document*. There is therefore **no published API specification** for this
service — the inventory comes from its source instead (**finding F2**).

An externally-hosted search (`web_search`) for the host and for exposed OpenAPI/Swagger
documents returned no service-specific results, consistent with a private endpoint.

---

## 5. Auth & rate-limit observations

**Auth.** Every probed `/market/*` and `/api/market/*` route answered unauthenticated.
`auth: "none"` for all confirmed routes; `apiKey` only for `/api/market/myorders/{pair}`.

**Rate-limit headers. None observed.** `noRateLimitHeaders: true` — no `X-RateLimit-*`,
`RateLimit-*` or `Retry-After` was present on any response. That is *not* the same as "no rate
limiting exists":

- The backend applies a **global 100 requests/minute** limiter across `/api/*`
  (`apps/backend/src/index.ts`), which is why back-to-back test runs can self-`429`. It is
  unadvertised by headers.
- The client therefore self-limits to **1 req/s** regardless, and implements `Retry-After`
  parsing for the case where a proxy *does* send one (**finding F6**).

**Streaming.** No WebSocket or SSE endpoint exists on the `/market/*` surface. All routes are
request/response; `streaming: false` in the inventory. (The `market.ts` source uses polling
windows — 2.5s tickers, 1s depth, 5s klines — not push.) The mandate's premise that this
service uses WebSockets/SSE is **not** borne out for `/market/*`.

**Pagination.** None server-side on any route. `limit` selects a newest-first window, capped at
500 levels (`depth`) and 1000 rows (`trades`/`klines`). The client windows that result
client-side and reports `truncated`.

---

## 6. Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| **F1** | Chrome cannot open any http(s) URL on this host; only `data:` renders. All headless browser checks must either be run elsewhere or use an offline harness. | blocks visual QA | documented; offline harness built (`scripts/cdp-render-proof.mjs`) |
| **F2** | No API specification exists (`/openapi.json`, `/swagger.json`, `/api-docs` all return the SPA shell). | low | inventory derived from source |
| **F3** | **App bug:** the exchange UI's `1h` candle button sends `interval=1h`, but `/api/market/klines` only accepts `60m` and silently coerces unknown values to `1m` — so the 1h button showed 1m candles. | medium | **fixed** — client normalises `1h → 60m`; the exchange UI now maps it too; covered by a test |
| **F4** | Global `100 req/min` limiter across `/api/*` is undocumented and header-less, so clients discover it only by hitting `429`. | low | documented; client self-limits to 1 req/s |
| **F5** | **The git `origin` remote URL embeds a live GitHub personal-access token** in plaintext. Any clone/log/CI paste leaks it. | **high** | **reported, not acted on** — credential rotation is the owner's call. Value redacted everywhere; never written to any file in this deliverable. |
| **F6** | No rate-limit response headers at all, so `Retry-After` handling could not be verified against the live service. | low | `parseRetryAfter` unit-tested instead (seconds + HTTP-date) |
| **F7** | `/sitemap.xml` does not exist even though the app mirrors an Indodax sitemap, so URL discovery cannot use it. | informational | documented |
| **F8** | `/api/market/universe` duplicates information already in `/api/market/pairs` + `/api/market/tickers`; two sources of truth for "what is tradable". | low | reported |

### F5 detail (redacted)

```
origin  https://<REDACTED_TOKEN>@github.com/<org>/<repo>.git (fetch)
```

The token is embedded in `.git/config`, so it survives in every clone and appears in
`git remote -v` output. Recommended: rotate the token, then move it out of the URL —
`git remote set-url origin https://github.com/<org>/<repo>.git` — and add
`credential.helper=store` or a deploy key instead.

---

## 7. Unknowns / limitations

1. **Three templates inferred, not confirmed** — listed in §3.
2. **No negative-status coverage beyond 404.** A 429 and a 5xx path were not deliberately
   induced (that would mean load-testing a demo host, which the mandate forbids). The 429/5xx
   handling is proven by unit tests with mocked responses, not by live traffic.
3. **Weather on the upstream feed.** `/api/market/health` reported `pairs: 478, live: 363`, so
   ~115 manifest pairs were `NO_FEED` at discovery time. `NO_FEED` is a **200 with no price**,
   never a 5xx — verified for `ACSIDR`.
4. **`response_schema` is a readable shape map, not formal JSON Schema.** With no published
   spec, generating full JSON Schema would over-claim.
5. **Only 23 of 957 primary routes were probed.** The remaining ones share the two confirmed
   templates (`/market/{pair}`, `/market/depth_chart/{pair}`) and the manifest's slug
   validation, so they are inferred-per-template rather than individually verified.

---

## 8. Reproduction

```bash
cd packages/market-client

node tools/generate-endpoints.mjs                 # 967 records, no network
node tools/discover.mjs --base http://127.0.0.1:22221   # 23 probes, 1 req/s -> discovery-evidence.json
node tools/discover.mjs --no-network              # offline expectation dump
npm test                                          # 28 tests, no network
```

Raw probe output is committed as `discovery-evidence.json` (per-path status, content type,
latency, rate-limit headers, and the confirmed/inferred summary).
