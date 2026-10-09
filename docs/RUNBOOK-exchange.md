# RUNBOOK — apps/exchange (:22221 route-mirror, ChinQue brand)

## What this is
Public market site whose URL paths mirror indodax.com 1:1, data from MEXC
public spot API (public endpoints ONLY, no keys). Simulation: virtual funds.
Investor-demo ready: everything clickable, fills are mock (engine ledger).

## Services
| Service | Port | PM2 name | Start |
|---|---|---|---|
| Exchange | 22221 | exchange | `pm2 start apps/exchange/server.mjs --name exchange` |
| Backend API (hosts /api/market/*) | 11110 | backend | `pm2 restart backend` |

## Daily ops
```bash
cd /home/khuchinque/0-TRADER-COMPANEY

# build (after code changes)
npm run build -w apps/exchange && pm2 restart exchange

# weekly route manifest refresh (cron-able)
node scripts/gen-routes.mjs && pm2 restart exchange

# acceptance
bash scripts/smoke-exchange.sh http://localhost:22221 http://localhost:11110

# logs
pm2 logs exchange --lines 20 --nostream
```

## Architecture flow (per spec B2 #5)
browser -> :22221 (server.mjs, validates slug vs manifest) -> backend :11110
`/api/market/*` (cache + circuit breaker) -> api.mexc.com public REST.
The browser never calls MEXC.

## Pair states
- `LIVE` — slug base+USDT exists on MEXC (363 of 478 now)
- `NO_FEED` — in manifest, no MEXC market -> page 200, `data-state="no-feed"`, trading disabled
- `404` — slug not in manifest

## Hard rules enforced
1. No MEXC key/secret anywhere (smoke checks it).
2. `robots.txt` = `Disallow: /`, every page `noindex,nofollow`.
3. Non-dismissible SIMULASI banner (server-rendered in raw HTML + SPA).
4. Brand = ChinQue Exchange; original copy everywhere; no Indodax assets.

## Files
- `scripts/gen-routes.mjs` — sitemap fetcher -> `packages/indodax-routes/routes.json`
- `packages/mexc-client/` — public-only MEXC REST wrapper
- `apps/backend/src/market.ts` — /api/market/* + cache + breaker
- `apps/exchange/{server.mjs,src/main.jsx}` — SPA + mirror server
- `scripts/smoke-exchange.sh` — acceptance (13 checks)
