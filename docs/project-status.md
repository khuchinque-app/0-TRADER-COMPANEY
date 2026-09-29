# Paper-Trading Crypto Venue — Project Status

> **STALE — DO NOT TRUST.** Canonical status is `.planning/task_plan.md`.
> Canonical repo path: `C:\Users\etern\OneDrive\Documents\2.PROJECT- TRADING-COMPANEY` (merged).
> Canonical ports: engine :3001, terminal :3000 (`npm run dev:engine` / `dev:terminal` from ROOT).

## Current State (2026-09-24)
- **Overall Progress:** 24/26 tasks = 92.3%
- **Project Location:** `C:\Users\etern\OneDrive\Documents\2.PROJECT- TRADING-CRYPTO-COMPANEY`
- **Note:** There is ALSO a corrupt/incomplete copy at `2.PROJECT- TRADING-COMPANEY` — use the CRYPTO one

## Weeks Complete
| Week | Tasks | Status |
|------|-------|--------|
| Week 1 | Spine (data + ledger) | 11/11 ✅ |
| Week 2 | Terminal UI | 7/7 ✅ |
| Week 3 | Glue, Edge Cases, Ship | 6/8 (75%) |

## Remaining (Week 3)
- [ ] T24: boundary lint (eslint arch lint rules)
- [ ] T26: deploy + reconciliation sweep

## Files Created This Session
```
apps/engine/src/feed/fx.ts              # USD/IDR rate provider
apps/engine/src/feed/bybit.ts           # Bybit fallback adapter
apps/engine/test/e2e/order-flow.test.ts # E2E test
apps/terminal/lib/feed-client.ts        # WS reconnect logic
apps/terminal/lib/api-client.ts         # REST API client
apps/terminal/lib/format.ts             # Number formatting
apps/terminal/lib/ids.ts                # Guest account IDs
apps/terminal/components/orderform/FxToggle.tsx
apps/terminal/components/book/MarketTrades.tsx
apps/terminal/components/chart/VolumePane.tsx
apps/terminal/components/chart/TimeframeBar.tsx
apps/terminal/components/tabs/AssetsTab.tsx
apps/terminal/components/tabs/OrderHistory.tsx
```

## Run Locally
```bash
cd "C:/Users/etern/OneDrive/Documents/2.PROJECT- TRADING-CRYPTO-COMPANEY"
npm install                    # Fix corrupted node_modules
npx tsx apps/engine/src/index.ts
npm run dev:terminal
# Open: http://localhost:2222
```

## Servers
- Engine: http://localhost:3001
- Terminal: http://localhost:2222
