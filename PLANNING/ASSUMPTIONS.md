# PLANNING/ASSUMPTIONS.md

## T01: Auth works - seeded dev accounts + guest demo login

### Assumptions (task rule #1: choose simplest, document, go on)
- Dev credentials: `dev@example.com` / `devpass123` (matches existing autopilot/T01.sh; cannot set .env per rule #5)
- Guest starting balance: `GUEST_START_USDT` env var, default `10000` (cannot set .env per rule #5)
- Backend runs as `node dist/index.js` (PID found in process list, NOT PM2-managed); restart via `kill` + re-run since deploy.sh only restarts `terminal`
- DB path defaults to `apps/engine/data/ledger.db` (from code default; DB_PATH env not set on running process)
- `users` table missing `role` column → admin routes crash; will add column via migration
- `autopilot/verify/` directory does not exist → will create it
- `.env` path resolution in code resolves to `/.env` (wrong) → fix to repo root
### Findings implemented (2026-10-06)
- ROOT CAUSE of 'Invalid email or password': dev row existed but had a NULL id (created by the early
  seed.ts which omitted the id column; SQLite allows NULL in a TEXT PK), so login worked but the JWT
  sub was null -> every authenticated route rejected the dev token. Fixed seed.ts + index.ts
  seedDevAccount() to always insert/heal a real id (idempotent on startup and via /api/auth/seed).
- Verified: dev login returns real userId + token; wrong password -> 401; POST /api/auth/guest ->
  token + wallet 10000 USDT (env GUEST_START_USDT, 20/hour/IP rate limit).
- Backend runs under the khuchinque PM2 daemon (PM2_HOME=/home/khuchinque/.pm2, app `backend`,
  /usr/bin/node v22); restarted via `pm2 restart backend` after `npm run build` in apps/backend.
- deploy.sh (runner) + verify/T01.sh both exit 0 in the runner env (HOME=/root, system npm/node).

## T04: Reference price feed (USDT quote)
- Indodax public API is the single upstream, behind apps/backend/src/pricefeed/adapter.ts (poll 5s, /api/price/:symbol + /api/price/:symbol/history 1m candles)
- BTC/ETH use native Indodax USDT pairs; SOL/BNB/XRP/LINK/AAVE are IDR-only there, quoted in USDT via the usdtidr rate (same source)
- AAVE included as supported fallback symbol; verify gates on the 6 shortlisted assets (AAVE informational)
- Cold start seeds from static USD reference prices (marked source=sim) so the feed is never NaN/0 and history >= 30 candles at boot; first live tick replaces them

## T05: Synthetic order book + CSS depth bars on trade page
- Book endpoint: GET /api/book/:symbol, accepts symbol ("BTC") or pair form ("BTCUSDT"/"BTCIDR"); always quotes USDT (internal ledger quote). Unknown symbol -> 404 { error: { code, message } }.
- Book is deterministic per symbol: fixed SPREAD_BPS / BASE_SIZE tables + constant 0.88 size decay; rebuilt from the cached price-feed tick on every request (refreshes with the price). Conventions: bids descending best-first, asks ascending best-first, best ask > best bid guaranteed.
- Trade page polls /api/book/:base every 5s (same cadence as the price feed) and renders Bitget-spot style: asks above, mid row, bids below, CSS-only center-out depth bars (cumulative size share; no chart lib).
- Verify: T05.sh checks 15/15 levels, best ask > best bid, sizes > 0, ordering, and the terminal API payload for a valid pair contains the book (the page consumes it via the /api/* rewrite).
