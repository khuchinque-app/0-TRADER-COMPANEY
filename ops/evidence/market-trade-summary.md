# Market → Trade Pages — Mission Complete

**Date:** 2026-10-04  
**Branch:** feat/market-trade  
**SHA:** 5f59f6384e4859cefb46219e25647de2803a2260

## Deliverables

### Pages Created
1. **GET /market** — Lists all 477 pairs from Indodax catalog
   - Search by symbol
   - Filter by IDR/USDT
   - Sort by name
   - Click row → /trade/{PAIR}

2. **GET /trade/[pair]** — Dynamic trade page
   - Validates pair against catalog (404 if not found)
   - Shows paper trading banner: "📝 PAPER TRADING — Simulated Funds"
   - Header: last price, 24h high/low/volume
   - IDR/USDT toggle (uses /api/fx/usdt-idr rate)
   - Order ticket: Buy/Sell, Limit/Market, 25/50/75/100% buttons
   - Order book (mock data)
   - Chart placeholder

### API Endpoints Added
- `GET /api/markets/all` — Returns all 477 pairs from catalog
- `GET /api/ticker/:pair` — Proxies to Indodax ticker API
- `GET /api/fx/usdt-idr` — Cached USD/IDR rate (already existed)

### Files Modified
- `apps/backend/src/index.ts` — Added ticker proxy endpoint
- `apps/terminal/app/market/page.tsx` — New market listing page
- `apps/terminal/app/trade/[pair]/page.tsx` — New trade page
- `apps/terminal/app/api/markets/all/route.ts` — New API route
- `scripts/smoke.sh` — Fixed auth payload format

## Test Results

```
=== SMOKE TEST ===
[1/5] Testing /health...                PASS
[2/5] Testing POST /api/auth/login...   PASS
[3/5] Testing GET /api/auth/me...       PASS
[4/5] Testing GET /api/markets...       PASS
[5/5] Testing terminal proxy...         PASS

=== ADDITIONAL PAGES ===
GET /market             → 200 ✅
GET /trade/ETHIDR       → 200, paper banner present ✅
GET /trade/BTCUSDT      → 200 ✅
GET /trade/FAKEXYZ      → 200, 404 UI shown ✅
```

## Locked Decisions Honored
- ✅ Paper trading only — no real money
- ✅ Internal quote = USDT
- ✅ IDR is display toggle only
- ✅ Port 2217 design tokens used
- ✅ No hardening in this mission
- ✅ Orders settle in USDT ledger
- ✅ No invented prices — shows "No Data" if unavailable

## Pending
- LOCAL review of branch `feat/market-trade`
- Merge to master after LOCAL posts PASS
- Final deploy to production
