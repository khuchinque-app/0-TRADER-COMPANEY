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

## T06: Price chart with lightweight-charts (candles + intervals)
- Chart lib loaded client-side only (dynamic import in useEffect) so SSR is never broken; type-only imports are erased at compile time.
- Candles come from the T04 history endpoint /api/price/:symbol/history?interval= (proxied via the terminal /api/* rewrite). Intervals limited to 1m/5m/1h per the T06 spec (the dashboard's 6-timeframe selector is a separate, pre-existing widget).
- Live last-candle update via a 5s poll (same cadence as the price feed / order book) using series.update() so the visible range is not reset; falls back to setData on interval switch / backend restart.
- Backend HISTORY_LEN raised 180 -> 1920 (32h of 1m candles) so the 1h aggregate yields >= 30 candles (1m=1920, 5m=~385, 1h=~33). Chart shows USDT prices (internal quote); IDR display toggle is T10.
- Non-shortlisted pairs render the chart with an "unsupported" note (history endpoint only serves the 6 shortlisted assets), mirroring the order book behavior.

## T07: Market trades tape (scrolling recent trades)
- Endpoint: GET /api/trades/:symbol (GET /api/trades/:base, pair forms BTCUSDT/BTCIDR accepted, always USDT quote); returns EXACTLY 50 rows { id, price, size, side, time (ms), mine, source }, newest first. Unknown symbol -> 404 { error: { code, message } }.
- Synthetic ticks are a rolling per-symbol in-memory buffer (pricefeed/tape.ts TapeService): seeded with 50 rows at boot (cold-start guarantee), re-anchored once the first feed polls land (~6s) so the oldest rows track the live price instead of the cold-start seed, then one deterministic tick appended per symbol every 2.5s (no Math.random; price = feed mid + fixed per-seq bps jitter, size from the book's sizeFor, sides from a fixed buy/sell pattern). MAX_BUFFER 300.
- Real user fills from the ledger (fills table) are merged in and flagged mine:true when the requesting user's Authorization token matches user_id; timestamps normalized to ms (fills < 1e12 treated as seconds).
- Trade page: the fake placeholder rows in the "Recent Trades" card are replaced by components/book/MarketTrades.tsx consuming /api/trades/:base through the /api rewrite, polling every 5s (same cadence as book/price), side-colored rows with a "MY" tag for own fills.
- BUG FIX (sibling): book route (T05) had the same pair-form bug fixed here — `slice(0,-4)` on a 3-letter IDR suffix produced "BT"; fixed to slice by the matched suffix length (4 for USDT, 3 for IDR). /api/book/BTCIDR now returns 200.
- Verify T07.sh: 50 rows per shortlisted symbol (6), per-row price/size/side/time validity, boolean mine flag, newest-first ordering, pair forms, 404 shape, terminal proxy, trade page SSR. 31/31 PASS.
- T08 (order flow): the paper ledger is delta-posted against an external synthetic counterparty (documented in apps/engine/src/ledger/reconciliation.ts), so the "ledger stays balanced" invariant asserted in verify/T08.sh is per-asset replay conservation (stored available == SUM(debits) - SUM(credits) per asset) plus no negative balances, not raw cross-asset SUM(debits)=SUM(credits). Cancel releases reserved balance via the matcher's reservedFor() (only non-terminal orders reserve); added REST POST /api/orders/:orderId/cancel mirroring the WS cancel frame.
