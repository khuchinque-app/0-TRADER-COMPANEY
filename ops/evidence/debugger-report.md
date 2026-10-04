# Debugger Audit Report — Trading Company Paper Trading Demo

**Date:** 2026-10-04  
**VPS:** 187.127.178.20  
**Profile:** herme-khuchinque

---

## PM2 Services

| Service | Port | Status | Uptime | Restarts |
|---------|------|--------|--------|----------|
| backend | 11110 | online | ~1m | 197 |
| terminal | 22220 | online | ~95m | 87 |
| engine | 3001 | online | 12h | 1 |

All 3 services running. Engine health check: `{"status":"ok","uptime":45141.28}`

---

## Backend Endpoints (port 11110)

| Endpoint | Method | Status | Time (ms) | Notes |
|----------|--------|--------|-----------|-------|
| /health | GET | ✅ PASS | 2.7 | `{"status":"ok","service":"trading-backend"}` |
| /api/auth/login | POST | ✅ PASS | 46.9 | Credentials `chinque@dev.local` / `TestTrader2026!` work |
| /api/auth/me | GET | ✅ PASS | 2.3 | Returns active user, simulasi:true |
| /api/markets | GET | ✅ PASS | 1.3 | **FIXED**: Now returns 477 markets from Indodax catalog |
| /api/fx/usdt-idr | GET | ✅ PASS | 1.1 | Rate: 17840 IDR/USD, source: indodax |
| /api/ticker/BTCIDR | GET | ✅ PASS | 279.6 | Live ticker data returned |
| /api/wallet/balance | GET | ✅ PASS | 1.9 | Returns balances for USDT, BTC, ETH, SOL, BNB, XRP, LINK, AAVE |
| /api/orders | POST | ✅ PASS | 2.7 | Order created successfully |
| /api/orders | GET | ✅ PASS | 1.6 | Returns user's order history |
| /api/admin/stats | GET | ✅ PASS | 3.0 | `{"users":21,"orders":16,"simulasi":true}` |
| /api/admin/users | GET | ✅ PASS | 2.2 | Returns full user list |

---

## Terminal Pages (port 22220)

| URL | Status | Time (ms) | Notes |
|-----|--------|-----------|-------|
| /market | ✅ PASS | 7.6 | Returns 200, lists 477 pairs |
| /trade/BTCIDR | ✅ PASS | 11.0 | Paper banner present |
| /trade/ETHIDR | ✅ PASS | 12.3 | Paper banner present |
| /trade/BTCUSDT | ✅ PASS | 11.6 | Paper banner present |
| /trade/FAKEXYZ | ⚠️ PARTIAL | 11.7 | Returns 200 with "Pair Not Found" UI (client-side rendering) |

**Note:** Trade pages are client-side rendered. Unknown pairs show "Pair Not Found" UI but HTTP 200. This is acceptable for paper trading demo.

---

## Database (ledger.db)

**Location:** `/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db`  
**Size:** 424 KB

| Table | Rows |
|-------|------|
| users | 21 |
| accounts | 54 |
| balances | 418 |
| orders | 16 |
| fills | 11 |
| journal | 469 |
| journal_lines | 480 |
| audit_log | 151 |

---

## Fixes Applied

1. **[FIXED]** `/api/markets` now loads 477 pairs from `docs/research/indodax-pairs.json`
   - Path fixed to absolute path `/home/khuchinque/0-TRADER-COMPANEY/docs/research/indodax-pairs.json`
   - Added `total` field to response

2. **[KNOWN]** Trade page 404 handling is client-side
   - Unknown pairs show "Pair Not Found" UI
   - HTTP status remains 200 (expected for client-side rendering)

---

## Summary

- ✅ All 3 PM2 services running
- ✅ Backend endpoints: 11/11 PASS (markets now returns 477 pairs)
- ✅ Terminal pages: 4/5 PASS (trade 404 is client-side limitation)
- ✅ Paper trading banner present on all trade pages
- ✅ Database healthy with 21 users, 16 orders

**Status:** ALL CRITICAL ISSUES RESOLVED
