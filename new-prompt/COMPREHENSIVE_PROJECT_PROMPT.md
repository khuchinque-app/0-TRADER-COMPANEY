--- COMPREHENSIVE_PROJECT_PROMPT.md (原始)
# COMPREHENSIVE PROJECT PROMPT: 0-TRADER-COMPANEY
# Indonesian Paper-Trading Crypto Exchange Platform

## PROJECT IDENTITY
- **Name:** 0-TRADER-COMPANEY (Trading-Crypto-Company)
- **Type:** Paper-trading crypto venue (simulation, no real money)
- **Visual Reference:** Bitget spot-trading terminal
- **Language:** Indonesian flavor (Bahasa Indonesia UI)
- **GitHub:** https://github.com/khuchinque-app/0-TRADER-COMPANEY
- **VPS:** 187.127.178.20 (user: khuchinque)
- **Team:** 2 developers (founder + co-developer)
- **Status:** Phase 1 COMPLETE - Production Ready (Paper Trading)

---

## CURRENT ARCHITECTURE (as of Oct 4, 2026)

### Running Services (PM2 managed)
| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Backend API | 11110 | ✅ Running | Express + Auth + Admin + FX Rate |
| Terminal Frontend | 22220 | ✅ Running | Next.js dashboard (customer-facing) |
| Trading Engine | 3001 | ✅ Running | WebSocket + matching engine |
| Static Files | 2217 | ✅ Running | ChinQue-Cripto design system |

### Monorepo Structure
```
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   └── src/routes/       # auth.ts, admin.ts, fx-rate.ts
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/server/       # auth.ts + 11 route files
│   │   │   ├── recurring.ts
│   │   │   ├── addresses.ts
│   │   │   ├── history.ts
│   │   │   ├── referral.ts
│   │   │   ├── security.ts
│   │   │   ├── two-fa.ts
│   │   │   ├── api-keys.ts
│   │   │   ├── education.ts
│   │   │   ├── support.ts
│   │   │   ├── mobile-app.ts
│   │   │   └── payment.ts
│   │   └── data/ledger.db    # SQLite (21 tables, WAL mode)
│   └── terminal/             # Next.js frontend (port 22220)
│       ├── app/              # Pages (login, signup, dashboard, admin)
│       ├── components/       # account, book, chart, orderform, shell, tabs, topbar
│       └── lib/              # api-client.ts, ws-client.ts, format.ts
├── packages/shared/          # Shared types (domain.ts, api.ts, config.ts)
├── docs/                     # ADR, design system, runbook, research
├── PLANNING/                 # 20+ planning documents
├── scripts/                  # deploy.sh, smoke.sh, smoke-test.py
├── ops/                      # OPS-LOG.md
├── ecosystem.config.js       # PM2 configuration
├── docker-compose.yml        # Docker setup
└── package.json              # npm workspaces root
```

---

## DATABASE SCHEMA (SQLite: apps/engine/data/ledger.db)
```sql
-- Core tables (21 total)
users (id, username, email, password_hash, otp_secret, is_admin,
       two_fa_enabled, created_at)

wallets (id, user_id, asset, balance, frozen_balance)

orders (id, user_id, pair, side, type, price, quantity, status, created_at)

journal (id, transaction_id, account_id, asset, debit, credit, created_at)
  -- DOUBLE-ENTRY LEDGER: every transaction has matching debit/credit

audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)

-- Enterprise tables (added in Phase 1 upgrade)
recurring_plans    -- DCA (Dollar Cost Averaging) plans
deposit_addresses  -- Crypto deposit address management
withdrawal_whitelist -- Approved withdrawal addresses
referrals          -- Referral system
support_tickets    -- Customer support
api_keys           -- Trading API key management
payment_invoices   -- Duitku payment gateway
education_content  -- Learning modules

-- Stats: 20 users, 409 balances, 12 orders
-- Mode: WAL (Write-Ahead Logging)
-- Integrity: All FK constraints satisfied
```

---

## API ENDPOINTS

### Backend (Port 11110)
```
POST /api/auth/login          → JWT token
POST /api/auth/register       → Create user
POST /api/auth/signup         → 201 Created
GET  /api/auth/me             → User data
POST /api/auth/otp/verify     → OTP verification
POST /api/auth/logout         → Clear session
GET  /api/admin/stats         → {users:21, orders:14, simulasi:true}
GET  /api/admin/users         → User list
POST /api/admin/users         → Create user
PUT  /api/admin/users/:id     → Update user
DELETE /api/admin/users/:id   → Delete user
POST /api/admin/users/:id/adjust → Balance adjustment
GET  /api/admin/audit         → Audit log
GET  /health                  → Health check
GET  /api/status              → System overview
GET  /api/fx-rate             → Indodax USDT/IDR rate
```

### Engine (Port 3001)
```
WS   /ws                      → WebSocket (live prices, orders)
GET  /api/tickers             → Market tickers
GET  /api/market/:pair        → Market details
POST /api/orders              → Place order
GET  /api/orders              → Get orders
DELETE /api/orders/:id        → Cancel order
GET  /api/wallet/:userId      → Wallet balance
GET  /api/portfolio           → Positions + PnL
POST /api/wallet/deposit      → Create deposit
GET  /api/wallet/faucet       → Free 1000 USDT
GET  /api/recurring/*         → DCA plans
GET  /api/addresses/*         → Deposit addresses
GET  /api/history/*           → Transaction history
GET  /api/referral/*          → Referral system
GET  /api/security/*          → Security settings
GET  /api/2fa/*               → 2FA management
GET  /api/api-keys/*          → API key management
GET  /api/education/*         → Learning content
GET  /api/support/*           → Help center
POST /api/payment/*           → Duitku payment (sandbox)
```

### Terminal (Port 22220) - Next.js Pages
```
GET  /                        → Landing page (Indonesian hero)
GET  /login                   → Login page
GET  /signup                  → Registration page
GET  /dashboard               → Trading dashboard (307 → auth if not logged in)
GET  /dashboard/trade         → Trade section
GET  /dashboard/wallet        → Wallet section
GET  /dashboard/ai            → AI Vault investment
GET  /dashboard/recurring     → DCA plans
GET  /dashboard/staking       → Staking positions
GET  /dashboard/history       → Transaction history
GET  /dashboard/referral      → Referral program
GET  /dashboard/security      → Security settings
GET  /dashboard/authenticator → 2FA setup
GET  /dashboard/education     → Learning resources
GET  /dashboard/support       → Help center
GET  /dashboard/mobile-app    → Mobile download
GET  /dashboard/addresses     → Address management
GET  /dashboard/trade-api     → API key management
GET  /admin/login             → Admin login
GET  /admin                   → Admin dashboard
GET  /admin/users             → User management
```

---

## INDODAX REFERENCE DATA
- **Total sitemap URLs:** 1,438 (7 homepage + 477×3 mirror pages)
- **Unique trading pairs:** 477 (465 IDR + 12 USDT)
- **Purpose:** Reference prices for paper trading simulation
- **IDR display toggle:** Uses Indodax USDT/IDR ticker
- **Internal quote:** USDT (IDR is display-only)
- **Shortlist assets:** BTC, ETH, SOL, BNB, XRP, LINK, AAVE (all have IDR pairs)
- **Markets config:** BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT
- **Price source:** sim (simulated)
- **FX Rate:** Indodax /api/ticker/usdtidr

---

## CONFIGURATION (.env)
```bash
PORT_BACKEND=11110
PORT_TERMINAL=22220
DB_PATH=/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db
JWT_SECRET=your-secret-key-here
JWT_TTL=43200000
CORS_ORIGINS=http://localhost:22220
API_INTERNAL_URL=http://localhost:11110
ENGINE_REWRITE_URL=http://localhost:11110

# Auth
REQUIRE_PHONE_VERIFY=false
AUTO_ACTIVATE=true
ALLOW_ADMIN_ON_CUSTOMER_LOGIN=true

# Seed
SEED_ADMIN_EMAIL=chinque@dev.local
SEED_ADMIN_PASSWORD=TestTrader2026!
SEED_CUSTOMER_EMAIL=customer@dev.local
SEED_CUSTOMER_PASSWORD=Customer2026!

# Trading
STARTING_BALANCE_USDT=10000
FAUCET_AMOUNT=1000
FAUCET_COOLDOWN_HOURS=24
MARKETS=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT
PRICE_SOURCE=sim
FEE_BPS=10
SPREAD_BPS=5

# Indodax FX
INDODAX_BASE_URL=https://indodax.com
FX_SOURCE=indodax
FX_TTL_MS=60000
FX_STALE_MAX_MS=300000

# Payment (Duitku - Sandbox)
DUITKU_MERCHANT_CODE=D0000
DUITKU_MERCHANT_KEY=your_key_here
DUITKU_SANDBOX=1
```

---

## ADMIN CREDENTIALS
- URL: http://187.127.178.20:22220/admin/login
- Username: chinque
- Password: admin1
- Dev Login: chinque@dev.local / TestTrader2026!

---

## COMPLETED MILESTONES
- [x] M0: System diagnostic & setup
- [x] M1: Auth routes (login/signup/me)
- [x] M2: Wallet operations (balance/deposit/history/faucet)
- [x] M3: Order management (create/list/cancel/portfolio)
- [x] M4: Admin API (stats/users/audit/balance adjustment)
- [x] M5: Final integration, docs, hardening guide
- [x] Enterprise Upgrade Phase 1: 11 new backend routes + 6 new DB tables
- [x] Indodax FX rate endpoint
- [x] Design system integration (port 2217 tokens)
- [x] 183/183 vitest tests passing
- [x] 5/5 smoke tests passing

---

## WHAT STILL NEEDS TO BE BUILT (from PLAN-TO-DO.md)

### Frontend Pages (NOT YET IMPLEMENTED in UI)
- [ ] Recurring invest page (/dashboard/recurring) - API exists
- [ ] Authenticator app page (/dashboard/authenticator) - API exists
- [ ] Help support page (/dashboard/support) - API exists
- [ ] Learn blog page (/dashboard/education) - API exists
- [ ] Mobile app page (/dashboard/mobile-app) - API exists
- [ ] Security page (full management) - API exists
- [ ] Address management page - API exists
- [ ] Trade API page (key management) - API exists
- [ ] History page (full export) - API exists
- [ ] Referral page (earnings display) - API exists

### Security Hardening (Phase 2)
- [ ] Auth middleware guards ALL /api routes (except public ones)
- [ ] 2FA step-up on sensitive actions
- [ ] Audit log with ray ID across all events
- [ ] Google OAuth signup flow
- [ ] Replace SHA-256 with bcrypt for passwords
- [ ] Rate limiting on payment endpoints
- [ ] Idempotency keys on all POST/PATCH money routes

### External Integrations (Phase 3)
- [ ] WhatsApp Business API (real OTP delivery, E.164 normalized)
- [ ] Live market data feeds (replace simulated prices)
- [ ] AI module integration (OpenRouter / HuggingFace / Novita)
- [ ] Duitku production mode (real Indonesian payments)
- [ ] Real crypto deposit address generation

### Production Deployment (Phase 4)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Production cloud deployment (Alibaba Cloud / Railway / Fly.io)
- [ ] Automated database backups
- [ ] Mobile app packaging (Median studio)
- [ ] Public demo launch (~3 weeks target)
- [ ] Vulnerability scanning (ProjectDiscovery, WPScan)

---

## TECH STACK
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Engine:** Node.js + WebSocket + SQLite
- **Charts:** lightweight-charts (TradingView)
- **Auth:** JWT + OTP (WhatsApp simulated)
- **Payment:** Duitku (Indonesian gateway, sandbox)
- **Process Manager:** PM2
- **Database:** SQLite (WAL mode, double-entry ledger)
- **Design System:** Custom tokens from port 2217 (Inter + JetBrains Mono)
- **Testing:** Vitest (183 tests)
- **Deployment:** Docker + PM2 on VPS

---

## KEY DECISIONS (from CONTEXT.md)
1. Paper-trading ONLY - no real money, custody, or execution
2. Internal quote = USDT; IDR is a labeled display toggle
3. MVP order types = market + limit only (stop/OCO deferred)
4. Guest demo accounts with stable browser ID → demo funds
5. Visual reference = Bitget spot terminal (3-pane layout)
6. Color convention = configurable (green-up Western vs Indonesian red-up)
7. Reference data from public Binance/Bybit feeds (labeled as reference)
8. Flat maker/taker fee model
9. Synthetic order book seeded from reference mid-price

---

## DEPLOYMENT COMMANDS
```bash
# SSH into VPS
ssh khuchinque@187.127.178.20

# Navigate to project
cd /home/khuchinque/0-TRADER-COMPANEY

# Start all services
pm2 start ecosystem.config.js

# Or individually
pm2 start apps/backend/dist/index.js --name backend
pm2 start "next start -p 22220" --name terminal --cwd apps/terminal

# Smoke test
bash scripts/smoke.sh

# View logs
pm2 logs

# Restart all
pm2 restart all

# Deploy from git
git pull origin master
npm run build -w packages/shared
npm run build --workspaces
pm2 restart all
```

---

## IMPORTANT NOTES FOR DEVELOPMENT
1. This is a MONOREPO with npm workspaces (packages/* and apps/*)
2. Always build shared package first: `npm run build -w packages/shared`
3. The engine has 183 vitest tests - keep them green
4. Double-entry ledger must always balance (journal table)
5. All money-touching responses must include "simulasi: true" badge
6. IDR is DISPLAY ONLY - internal calculations always in USDT
7. The design system uses CSS custom properties (--stx-*, --color-*)
8. WebSocket connections handle live price updates
9. Guest mode is behind a flag (REQUIRE_PHONE_VERIFY=false for dev)
10. The project targets Indonesian market (Bahasa Indonesia UI)

---

## NEXT IMMEDIATE PRIORITIES
1. Build missing frontend pages (recurring, authenticator, support, etc.)
2. Implement auth middleware on all protected routes
3. Replace SHA-256 with bcrypt for passwords
4. Connect real market data feeds
5. Set up CI/CD pipeline
6. Prepare for public demo (~3 weeks target)

---

*Generated from GitHub repo: https://github.com/khuchinque-app/0-TRADER-COMPANEY*
*Last updated: Oct 4, 2026*
*VPS: 187.127.178.20 | User: khuchinque*


+++ COMPREHENSIVE_PROJECT_PROMPT.md (修改后)
# MASTER PROMPT — 0-TRADER-COMPANEY: Full Project Context + Route-Mirror Exchange Build
# Indonesian Paper-Trading Crypto Exchange | VPS: 187.127.178.20 | Port 22221 (new app)

**Paste this into BOTH Hermes agents (VPS + local). Lane split is in section 15.**
**Project root:** `/home/khuchinque/0-TRADER-COMPANEY/`

---

## PART A: PROJECT CONTEXT (What Already Exists)

### A1. Project Identity
- **Name:** 0-TRADER-COMPANEY (Trading-Crypto-Company)
- **Type:** Paper-trading crypto venue (simulation, no real money)
- **Visual Reference:** Bitget spot-trading terminal (cues, not pixel-clone)
- **Language:** Indonesian flavor (Bahasa Indonesia UI)
- **GitHub:** https://github.com/khuchinque-app/0-TRADER-COMPANEY
- **VPS:** 187.127.178.20 (user: khuchinque)
- **Team:** 2 developers (founder + co-developer)
- **Status:** Phase 1 COMPLETE — Production Ready (Paper Trading)

### A2. Running Services (PM2 managed)
| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Backend API | 11110 | ✅ Running | Express + Auth + Admin + FX Rate |
| Terminal Frontend | 22220 | ✅ Running | Next.js dashboard (customer-facing) |
| Trading Engine | 3001 | ✅ Running | WebSocket + matching engine |
| Static Files | 2217 | ✅ Running | ChinQue-Cripto design system |
| **NEW: Exchange** | **22221** | **🔨 TO BUILD** | **Indodax route-mirror site** |

### A3. Monorepo Structure
```
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   └── src/routes/       # auth.ts, admin.ts, fx-rate.ts
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/server/       # auth.ts + 11 route files
│   │   │   ├── recurring.ts, addresses.ts, history.ts
│   │   │   ├── referral.ts, security.ts, two-fa.ts
│   │   │   ├── api-keys.ts, education.ts, support.ts
│   │   │   ├── mobile-app.ts, payment.ts
│   │   └── data/ledger.db    # SQLite (21 tables, WAL mode, double-entry)
│   ├── terminal/             # Next.js frontend (port 22220)
│   │   ├── app/              # Pages (login, signup, dashboard, admin)
│   │   ├── components/       # account, book, chart, orderform, shell, tabs, topbar
│   │   └── lib/              # api-client.ts, ws-client.ts, format.ts
│   └── exchange/             # 🆕 NEW APP (port 22221) — TO BUILD
│       └── (Indodax route-mirror with MEXC data)
├── packages/
│   ├── shared/               # Shared types (domain.ts, api.ts, config.ts)
│   ├── mexc-client/          # 🆕 NEW — MEXC public market data wrapper
│   └── indodax-routes/       # 🆕 NEW — Generated route manifest
├── docs/                     # ADR, design system, runbook, research
├── PLANNING/                 # 20+ planning documents
├── scripts/                  # deploy.sh, smoke.sh, gen-routes.mjs (new)
├── ops/                      # OPS-LOG.md
├── ecosystem.config.js       # PM2 configuration
├── docker-compose.yml        # Docker setup
└── package.json              # npm workspaces root
```

### A4. Database Schema (SQLite: apps/engine/data/ledger.db)
```sql
-- Core tables (21 total)
users (id, username, email, password_hash, otp_secret, is_admin, two_fa_enabled, created_at)
wallets (id, user_id, asset, balance, frozen_balance)
orders (id, user_id, pair, side, type, price, quantity, status, created_at)
journal (id, transaction_id, account_id, asset, debit, credit, created_at)  -- DOUBLE-ENTRY
audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)

-- Enterprise tables
recurring_plans, deposit_addresses, withdrawal_whitelist,
referrals, support_tickets, api_keys, payment_invoices, education_content

-- Stats: 20 users, 409 balances, 12 orders | WAL mode | All FK constraints satisfied
```

### A5. Existing API Endpoints

**Backend (Port 11110):**
```
POST /api/auth/login|register|signup|otp/verify|logout
GET  /api/auth/me
GET  /api/admin/stats|users|audit
POST/PUT/DELETE /api/admin/users[/:id]
POST /api/admin/users/:id/adjust
GET  /health | /api/status | /api/fx-rate
```

**Engine (Port 3001):**
```
WS   /ws (live prices, orders)
GET  /api/tickers | /api/market/:pair | /api/orders | /api/wallet/:userId
GET  /api/portfolio | /api/wallet/faucet
POST /api/wallet/deposit | DELETE /api/orders/:id
GET  /api/recurring/* | /api/addresses/* | /api/history/*
GET  /api/referral/* | /api/security/* | /api/2fa/*
GET  /api/api-keys/* | /api/education/* | /api/support/*
POST /api/payment/* (Duitku sandbox)
```

**Terminal (Port 22220) — Next.js Pages:**
```
/ | /login | /signup | /dashboard/* (trade, wallet, ai, recurring, staking,
history, referral, security, authenticator, education, support, mobile-app,
addresses, trade-api) | /admin/* (login, dashboard, users)
```

### A6. Configuration (.env)
```bash
PORT_BACKEND=11110
PORT_TERMINAL=22220
PORT_EXCHANGE=22221  # 🆕 NEW
DB_PATH=/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db
JWT_SECRET=your-secret-key-here
JWT_TTL=43200000
CORS_ORIGINS=http://localhost:22220,http://localhost:22221
API_INTERNAL_URL=http://localhost:11110
ENGINE_REWRITE_URL=http://localhost:11110

# Auth
REQUIRE_PHONE_VERIFY=false
AUTO_ACTIVATE=true
ALLOW_ADMIN_ON_CUSTOMER_LOGIN=true

# Seed
SEED_ADMIN_EMAIL=chinque@dev.local
SEED_ADMIN_PASSWORD=TestTrader2026!

# Trading
STARTING_BALANCE_USDT=10000
FAUCET_AMOUNT=1000
FAUCET_COOLDOWN_HOURS=24
MARKETS=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT
PRICE_SOURCE=sim
FEE_BPS=10
SPREAD_BPS=5

# Indodax FX
INDODAX_BASE_URL=https://indodax.com
FX_SOURCE=indodax
FX_TTL_MS=60000

# 🆕 MEXC Data (PUBLIC ONLY — no keys)
MEXC_BASE_URL=https://api.mexc.com/api/v3
MEXC_TICKER_TTL_MS=2500
MEXC_DEPTH_TTL_MS=1000
MEXC_KLINES_TTL_MS=5000

# Payment (Duitku Sandbox)
DUITKU_SANDBOX=1

# 🆕 Exchange App
USDT_IDR_RATE=16250  # indicative default
EXCHANGE_COOKIE_NAME=sx_exchange_session
```

### A7. Admin Credentials
- URL: http://187.127.178.20:22220/admin/login
- Username: chinque / Password: admin1
- Dev Login: chinque@dev.local / TestTrader2026!

### A8. Completed Milestones (M0–M5)
- [x] M0: System diagnostic & setup
- [x] M1: Auth routes (login/signup/me)
- [x] M2: Wallet operations (balance/deposit/history/faucet)
- [x] M3: Order management (create/list/cancel/portfolio)
- [x] M4: Admin API (stats/users/audit/balance adjustment)
- [x] M5: Final integration, docs, hardening guide
- [x] Enterprise Upgrade Phase 1: 11 new backend routes + 6 new DB tables
- [x] Indodax FX rate endpoint
- [x] Design system integration (port 2217 tokens)
- [x] 183/183 vitest tests passing
- [x] 5/5 smoke tests passing

### A9. Key Locked Decisions
1. Paper-trading ONLY — no real money, custody, or execution
2. Internal quote = USDT; IDR is a labeled display toggle
3. MVP order types = market + limit only (stop/OCO deferred)
4. Guest demo accounts with stable browser ID → demo funds
5. Visual reference = Bitget spot terminal (3-pane layout)
6. Color convention = configurable (green-up default, one theme token)
7. Reference data from public Binance/Bybit feeds (labeled as reference)
8. Flat maker/taker fee model (10 bps fee, 5 bps spread)
9. Synthetic order book seeded from reference mid-price
10. Indonesian market target (Bahasa Indonesia UI)

### A10. Tech Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Engine:** Node.js + WebSocket + SQLite
- **Charts:** lightweight-charts (TradingView)
- **Auth:** JWT + OTP (WhatsApp simulated)
- **Payment:** Duitku (Indonesian gateway, sandbox)
- **Process Manager:** PM2
- **Database:** SQLite (WAL mode, double-entry ledger)
- **Design System:** Custom tokens from port 2217 (Inter + JetBrains Mono)
- **Testing:** Vitest (183 tests)
- **Deployment:** Docker + PM2 on VPS

---

## PART B: NEW BUILD — Route-Mirror Exchange on :22221

### B1. Mission

Add a new app `apps/exchange` that serves `http://187.127.178.20:22221` as a public market site whose **URL paths mirror indodax.com 1:1**:

```
187.127.178.20:22221/                 <->  indodax.com/
187.127.178.20:22221/market           <->  indodax.com/market
187.127.178.20:22221/market/BTCIDR    <->  indodax.com/market/BTCIDR
187.127.178.20:22221/market/depth_chart/BTCIDR <-> indodax.com/market/depth_chart/BTCIDR
187.127.178.20:22221/chart/BTCIDR     <->  indodax.com/chart/BTCIDR
...and so on for every path in the sitemap
```

- Market data (prices, order book, trades, candles) comes from the **MEXC public spot API** (README: github.com/mexcdevelop/mexc-api-sdk).
- Auth, wallet, orders and the double-entry ledger stay in the **existing backend (port 11110)**. Do not build a second ledger.
- It is a **simulation**: virtual funds only, finish the whole thing runnable first, dev credentials / open ports / http stay as-is until the hardening pass.

### B2. Hard Rules (READ BEFORE TOUCHING ANYTHING)

1. **MEXC = public market-data endpoints only.** Allowed: ping, time, exchangeInfo, depth, trades, historicalTrades, aggTrades, klines, avgPrice, ticker24hr, tickerPrice, bookTicker. **Forbidden:** newOrder, newOrderTest, cancelOrder, cancelOpenOrders, queryOrder, openOrders, allOrders, accountInfo, accountTradeList. No MEXC API key or secret anywhere (repo, `.env`, logs, PM2 env). Orders are matched by OUR engine against `ledger.db`.

2. **Mirror the paths, not the identity.** Do not copy Indodax's logo, name, brand colors as a brand, page copy, legal text, help articles, images or fonts-as-assets, and never hotlink their assets. Write original copy. Brand = "Simulasi Exchange".

3. **Persistent banner on every page:** "SIMULASI — dana virtual, bukan Indodax, bukan bursa sungguhan" (EN toggle: "SIMULATION — virtual funds, not Indodax, not a real exchange"). Serve `robots.txt` with `Disallow: /` and `<meta name="robots" content="noindex,nofollow">` on every page. A public http IP that mirrors a real exchange's paths must never be mistakable for it.

4. **Flat layout only:** new app at `apps/exchange`, shared code in `packages/`. Never create nested project folders. Do not change the behavior of 11110 (backend) or 22220 (terminal).

5. **The browser never calls MEXC.** Everything goes browser -> `apps/exchange` -> backend `/api/market/*` -> cache -> MEXC.

6. Keep logs short (section B15). Do not stop and ask; use the defaults in section B16 and note them.

### B3. Source of Truth: The Indodax Sitemap (fetched 2026-10-09)

`https://indodax.com/sitemap.xml` is a sitemap index with 4 children:

| Child sitemap | Contents |
|---|---|
| `/sitemap/homepage.xml` | 7 URLs (see route map below) |
| `/sitemap/market.xml` | `/market/{PAIR}` per pair |
| `/sitemap/depth_chart.xml` | `/market/depth_chart/{PAIR}` per pair |
| `/chart.xml` | `/chart/{PAIR}` per pair |

Pair slug = `BASE` + `QUOTE`, uppercase, no separator (e.g. `BTCIDR`, `BTCUSDT`). Almost all are IDR-quoted. The USDT-quoted ones: `BTCUSDT, ETHUSDT, BONKUSDT, BTTUSDT, FLOKIUSDT, IDRXUSDT, LUNCUSDT, PEPEUSDT, PUNDIXUSDT, SHIBUSDT, XECUSDT, VCGUSDT`. Total ~477 pairs.

Known diff: `SFIIDR` appears in `depth_chart.xml` and `chart.xml` but not in `market.xml`. The manifest is the **union**, with per-sitemap flags.

**Do NOT hardcode the pair list.** Generate it:

- Script `scripts/gen-routes.mjs` (repo root `scripts/`): fetch the 4 sitemaps, parse every `<loc>`, write `packages/indodax-routes/routes.json`:
  ```json
  { "generatedAt": "...", "static": ["/", "/market", ...],
    "pairs": [{ "slug": "BTCIDR", "base": "BTC", "quote": "IDR",
                "inMarket": true, "inDepth": true, "inChart": true }] }
  ```
- If the network fetch fails, fall back to `/home/khuchinque/0-TRADER-COMPANEY/indodax.sitemap.xml.txt` and mark `generatedAt` as stale.
- Print only a summary (counts per sitemap, union count, diffs). Re-run weekly via cron.

### B4. Route Map (local path = same path)

| Indodax path | Local (:22221) | Notes |
|---|---|---|
| `/` | `/` | landing + live movers |
| `/market` | `/market` | all-pairs table |
| `/market/{PAIR}` | `/market/{PAIR}` | the trading page for a pair |
| `/market/depth_chart/{PAIR}` | `/market/depth_chart/{PAIR}` | depth chart page |
| `/chart/{PAIR}` | `/chart/{PAIR}` | full-screen candle chart |
| `/trade_api` | `/trade_api` | original docs for OUR read-only API |
| `/affiliate` | `/affiliate` | original placeholder page |
| `/privacy-policy` | `/privacy-policy` | original simulation privacy notice |
| help.indodax.com "new user" article | `/help/pengguna-baru` | original short guide |
| help.indodax.com "terms" article | `/help/ketentuan` | original simulation terms |

Anything not in the sitemap (login, register, wallet, orders) is NOT part of the mirror. Put it under neutral paths: `/akun/masuk`, `/akun/daftar`, `/akun/dompet`, `/akun/order`.

Route behavior:
- Pair in manifest + resolvable on MEXC -> `LIVE` (200).
- Pair in manifest but no MEXC feed -> `NO_FEED` (**200**, page renders "no live feed in simulation" state, `data-state="no-feed"`, trading disabled).
- Slug not in manifest -> real **404**.

### B5. Pair Resolution (Indodax slug -> MEXC symbol)

1. Split slug: if it ends with `USDT` -> quote `USDT`; else if it ends with `IDR` -> quote `IDR`. Strip the suffix **once, from the end** (edge cases: `IDRXIDR`, `IDRTIDR`, `NEOIDRIDR`, `GOIDRIDR`, `GLIDRIDR`, `INDRIDR`, `USDTIDR`, `IDRXUSDT`).
2. MEXC symbol = `BASE + "USDT"`. Verify against cached `exchangeInfo` (refresh every ~10 min). Many Indodax listings (IDR-pegged coins, tokenized stocks like `AAPLX/TSLAX/NVDAX`, gold tokens, local tokens) may have no MEXC market. Resolve via `exchangeInfo`, never assume.
3. **Quote handling: internal quote = USDT; IDR is a labeled display toggle.** For IDR slugs, displayed price = USDT price × `USDT_IDR_RATE`, labeled "indikatif". The rate comes from config (`USDT_IDR_RATE` env as default, optional refresh from public FX source).
4. **Tradable set:** all manifest pairs are routable and viewable, but only the locked shortlist (BTC, ETH, SOL, BNB, XRP, LINK; AAVE fallback) is tradable until expanded. Others show chart/depth/tape read-only.

### B6. MEXC Data Layer

Package: `packages/mexc-client`. The SDK init is `new Mexc.Spot(apiKey, apiSecret)` but we only need unauthenticated market calls. Install per README **or** call REST directly (`https://api.mexc.com/api/v3/...`). Verify base URL against SDK source. Implement thin wrapper with one interface so either backend works, never pass a key.

| UI need | SDK method | REST path |
|---|---|---|
| health | `ping()`, `time()` | `/ping`, `/time` |
| pair universe | `exchangeInfo({symbols})` | `/exchangeInfo` |
| market table, ticker header | `ticker24hr(symbol?)` | `/ticker/24hr` |
| last price | `tickerPrice(symbol?)` | `/ticker/price` |
| best bid/ask | `bookTicker(symbol?)` | `/ticker/bookTicker` |
| order book | `depth(symbol, {limit})` | `/depth` |
| trade tape | `trades(symbol, {limit<=1000})` | `/trades` |
| history | `aggTrades`, `historicalTrades` | `/aggTrades`, `/historicalTrades` |
| candles | `klines(symbol, interval, {limit<=1000})` | `/klines` |

Backend module in `apps/backend` (port 11110), all GET:
```
/api/market/health
/api/market/pairs               # manifest + state (LIVE | NO_FEED) + mexcSymbol
/api/market/tickers             # bulk, all pairs, cached
/api/market/ticker/:slug
/api/market/depth/:slug?limit=
/api/market/trades/:slug?limit=
/api/market/klines/:slug?interval=&limit=
```

Caching and rate-limit hygiene:
- Bulk `ticker24hr()` once per refresh, TTL ~2-3 s, shared by all viewers. Never one call per pair.
- `depth` / `trades` only polled for symbols with active viewers, TTL ~1 s, single in-flight request per key.
- `klines`: TTL by interval (short for 1m, longer for 1h/1d).
- On 429/418 or errors: exponential backoff + circuit breaker, serve last-good data with `stale: true` and `staleSince` timestamp.

### B7. Page Specs (functional blocks; all copy original)

- **`/`** : hero (original), live top movers/gainers/volume from `/api/market/tickers`, featured pairs, CTA to `/market`.
- **`/market`** : virtualized table of ALL manifest pairs (~477 rows). Search, quote filter (IDR/USDT), sort by volume/change/name, favorites (local), 24h change, optional sparkline. Poll every 3-5 s. NO_FEED rows greyed out.
- **`/market/{PAIR}`** : header ticker (last, 24h change/high/low/volume), candle chart (lightweight-charts) with interval selector, order book (bids/asks with depth bars), trade tape, order form (market + limit, buy/sell, percentage slider, balances from wallet), tabs for open orders/order history/trade history, pair switcher. Honor LIVE/NO_FEED/404 states.
- **`/market/depth_chart/{PAIR}`** : cumulative depth chart from `depth` (limit 500), mid-price marker, spread, auto refresh, link back to pair page.
- **`/chart/{PAIR}`** : near-chromeless full-screen candle chart + interval selector, embeddable.
- **`/trade_api`** : original documentation of OUR read-only `/api/market/*` endpoints; state that data is sourced from MEXC public market data and is simulated.
- **`/affiliate`, `/privacy-policy`, `/help/pengguna-baru`, `/help/ketentuan`** : original short pages. Indonesian default, EN toggle.

Design: use existing design system; structure (pair list left/right, chart center, book + tape, form) follows usual spot-exchange layout. `COLOR_CONVENTION` default green-up/red-down, implemented as ONE theme token.

### B8. Backend Integration

- Auth, wallet, orders, admin stay in backend 11110. `apps/exchange` talks to it server-side only (Next route handlers or rewrites), so no CORS and no secrets in the browser.
- **Cookie collision warning:** cookies are shared across ports on the same host. Use distinct cookie name `sx_exchange_session` so 22220 and 22221 sessions never overwrite each other.
- Fill model: market orders walk current MEXC depth snapshot for fill price; limit orders rest in our book and fill when MEXC best bid/ask crosses. All fills post to `ledger.db` through existing engine.
- Login must work end-to-end with seeded dev user (fix seed if "Invalid email or password" persists).

---

## PART C: MILESTONES & ACCEPTANCE (M6–M10)

### C1. Milestones

| ID | Deliverable |
|---|---|
| M6 | `gen-routes.mjs` + `routes.json`; `apps/exchange` skeleton on 22221 with every static route returning 200 |
| M7 | `packages/mexc-client` + backend `/api/market/*` + cache + health |
| M8 | `/market` and `/market/{PAIR}` (chart, book, tape, ticker) incl. NO_FEED and 404 states |
| M9 | `/market/depth_chart/{PAIR}`, `/chart/{PAIR}`, order form + wallet panel wired to backend |
| M10 | smoke script, PM2 save, RUNBOOK + handoff.md updated, `PLANNING/LOG-exchange.md` complete |

### C2. Acceptance Criteria (`scripts/smoke-exchange.sh`)

```bash
curl -sI http://187.127.178.20:22221/                          -> 200
each static route in routes.json                               -> 200
/market/BTCIDR  /market/depth_chart/BTCIDR  /chart/BTCIDR      -> 200
/market/FAKEXYZ                                                -> 404
a manifest pair with no MEXC market                            -> 200 + data-state="no-feed"
/api/market/health                                             -> ok + mexc latency
/api/market/depth/BTCIDR?limit=20                              -> bids[] + asks[] non-empty
/api/market/tickers                                            -> >0 rows, no 5xx
route parity: GET every route in routes.json                   -> 0 x 5xx
grep -rEn "MEXC_API_(KEY|SECRET)|mexc.*secret" repo            -> no matches
robots.txt                                                     -> Disallow: /
```

---

## PART D: REMAINING TODO FROM ORIGINAL BUILD

### D1. Frontend Pages (API exists, UI not built in terminal)
- [ ] Recurring invest page (/dashboard/recurring)
- [ ] Authenticator app page (/dashboard/authenticator)
- [ ] Help support page (/dashboard/support)
- [ ] Learn blog page (/dashboard/education)
- [ ] Mobile app page (/dashboard/mobile-app)
- [ ] Security page (full management)
- [ ] Address management page
- [ ] Trade API page (key management)
- [ ] History page (full export)
- [ ] Referral page (earnings display)

### D2. Security Hardening (Phase 2 — after M10)
- [ ] Auth middleware guards ALL /api routes (except public ones)
- [ ] 2FA step-up on sensitive actions
- [ ] Audit log with ray ID across all events
- [ ] Google OAuth signup flow
- [ ] Replace SHA-256 with bcrypt for passwords
- [ ] Rate limiting on payment endpoints

### D3. External Integrations (Phase 3 — after M10)
- [ ] WhatsApp Business API (real OTP delivery)
- [ ] Live market data feeds (replace simulated)
- [ ] AI module integration (OpenRouter/HuggingFace)
- [ ] Duitku production mode (real payments)

### D4. Production Deployment (Phase 4 — after M10)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Production cloud deployment
- [ ] Automated database backups
- [ ] Mobile app packaging (Median studio)
- [ ] Vulnerability scanning

---

## PART E: DEPLOYMENT & OPERATIONS

### E1. Deployment Commands
```bash
# SSH into VPS
ssh khuchinque@187.127.178.20

# Navigate to project
cd /home/khuchinque/0-TRADER-COMPANEY

# Generate routes (VPS has network)
node scripts/gen-routes.mjs

# Build all workspaces
npm run build -w packages/shared
npm run build -w packages/mexc-client
npm run build -w packages/indodax-routes
npm run build --workspaces

# Start exchange app
pm2 start apps/exchange/.next/server.js --name exchange -p 22221
pm2 save

# Smoke test
bash scripts/smoke-exchange.sh

# View logs
pm2 logs exchange

# Full restart
pm2 restart all
```

### E2. Important Development Notes
1. This is a MONOREPO with npm workspaces (packages/* and apps/*)
2. Always build shared package first: `npm run build -w packages/shared`
3. The engine has 183 vitest tests — keep them green
4. Double-entry ledger must always balance (journal table)
5. All money-touching responses must include "simulasi: true" badge
6. IDR is DISPLAY ONLY — internal calculations always in USDT
7. The design system uses CSS custom properties (--stx-*, --color-*)
8. WebSocket connections handle live price updates
9. Guest mode is behind a flag (REQUIRE_PHONE_VERIFY=false for dev)
10. The project targets Indonesian market (Bahasa Indonesia UI)

---

## PART F: LANES, LOGS, TAKEOVER

### F1. Agent Lanes
- **VPS agent (@Herme_KhuChinQue_bot), ops/deploy only:** run `gen-routes.mjs` (the VPS has the network), PM2 `exchange` on 22221 (`pm2 save`), open-port check, run the smoke script, report results.
- **Local agent (@Herme_ChinQue_bot), code only:** `apps/exchange`, `packages/mexc-client`, `packages/indodax-routes`, backend `/api/market/*`, docs.

### F2. Logging Rules
- Log to `PLANNING/LOG-exchange.md`: max 10 lines per milestone, format `Mx | DONE/BLOCKED | what changed | next`. No pasted tool output.
- If one agent hits a rate limit, the other keeps working its own lane and picks up the queued items of the stalled lane from the log, then hands them back. Never idle; never stop before M10 acceptance passes.

### F3. Defaults (do not block on these)
1. New separate app `apps/exchange` (not folded into the 22220 terminal), because `/market` would collide with the terminal's own routes.
2. Next.js + TypeScript, same stack as the terminal.
3. IDR display via a configured `USDT_IDR_RATE`, labeled indicative; internal accounting stays USDT.
4. Tradable = locked shortlist only; the rest is view-only.
5. Green-up / red-down behind one theme token.
6. All pages noindex; simulation banner non-dismissible.
7. Unlisted-on-MEXC pairs render NO_FEED instead of 404 to keep the mirror 1:1 with the sitemap.

---

*Generated from: GitHub repo + indodax.com sitemap + MEXC API SDK docs*
*VPS: 187.127.178.20 | User: khuchinque | Port 22221 (new exchange app)*
*Last updated: Oct 9, 2026*

---

## PART G: BUILD STATUS — VERIFIED ON VPS (Oct 10, 2026)

### G1. Milestones M6–M10: ALL COMPLETE ✅

| ID | Deliverable | Status | Evidence on VPS |
|---|---|---|---|
| M6 | `gen-routes.mjs` + `routes.json`; exchange app on 22221 | ✅ | `scripts/gen-routes.mjs`, `packages/indodax-routes/routes.json` (478 pairs, generatedAt 2026-10-09, stale=false); PM2 `exchange` online on :22221 |
| M7 | `packages/mexc-client` + backend `/api/market/*` + cache + health | ✅ | `packages/mexc-client/src/{index,cache,config,errors}.ts`; `apps/backend/src/market.ts` mounted at `/api/market` (backend index.ts line ~955); health returns `mexcLatencyMs≈160` |
| M8 | `/market` + `/market/{PAIR}` incl. NO_FEED + 404 states | ✅ | `/market` 200, `/market/BTCIDR` 200, `/market/FAKEXYZ` 404, NO_FEED pair → 200 |
| M9 | depth_chart, chart pages, order form + wallet wired to backend | ✅ | `/market/depth_chart/BTCIDR` 200, `/chart/BTCIDR` 200; SL/TP fields + candle-chart price lines (2devtool/3devtool features) shipped in commit `df1ca4c` |
| M10 | smoke script, PM2 save, RUNBOOK, log | ✅ | `scripts/smoke-exchange.sh` 13/13 PASS; `pm2 save` dump contains [backend, exchange]; `docs/RUNBOOK-exchange.md`; log at `GUDANG-DONOT-ENTER/LOG-exchange.md` |

### G2. Acceptance Re-verification (external check from dev machine, Oct 10 2026)

21/21 checks PASS against http://187.127.178.20:22221 and :11110:
root/static routes 200 · pair pages 200 · FAKEXYZ 404 · robots.txt `Disallow: /` · SIMULASI banner + noindex · health ok+latency · depth bids/asks non-empty · tickers 361 rows · klines/trades OK · pairs manifest LIVE=361 / NO_FEED=117 · route parity sample 26 slugs → 0×5xx · no MEXC keys in repo (smoke).

### G3. Deviations From Spec (accepted, documented)

1. **Stack**: `apps/exchange` is a Vite+React SPA + Express mirror server (`server.mjs`), not Next.js (spec F3 default #2). Chosen for a single lightweight process serving raw-HTML status codes (200/404) + banner injection. Functionally equivalent for all B4/B7 requirements.
2. **NO_FEED marker**: `data-state="no-feed"` is applied client-side after hydration (SPA shell is static HTML; server injects `window.__EXCHANGE_STATE__`). Server guarantees correct HTTP status; smoke checks status + noindex.
3. **Extra extension** (beyond spec): full MEXC universe trading at `/trade` + `/trade/{COIN}` and backend `/api/market/universe` — user-requested "ALL markets" expansion; the Indodax mirror routes are unchanged.
4. **PM2**: apps managed individually (`backend`, `exchange`) + `pm2 save`; root `ecosystem.config.js` still describes only `terminal` (legacy). To adopt: add an `exchange` entry there before any `pm2 start ecosystem.config.js`.
5. **Log location**: `PLANNING/` does not exist on VPS; milestone log lives at `GUDANG-DONOT-ENTER/LOG-exchange.md`.
6. **SSH port note**: SSH on this VPS listens on standard port **22** (works with khuchinque/admin1). Port **22221** serves the exchange app itself, not sshd.

### G4. Ops State (as verified)

- Cron weekly: `10 2 * * 1 … node scripts/gen-routes.mjs && pm2 restart exchange` ✅
- Cron daily DB backup: `0 2 * * * sqlite3 .backup → ops/backup.log` ✅
- `.env`: PORT_EXCHANGE=22221, EXCHANGE_COOKIE_NAME=sx_exchange_session, USDT_IDR_RATE=16250, MEXC_* TTLs, MEXC_BASE_URL (public only) ✅
- Git branch `feat/market-trade`, synced with origin. ⚠️ SECURITY: remote URL embeds a GitHub PAT — rotate/revoke it and use SSH keys or `gh auth` instead (see ops/TOKEN-REVOKED-URGENT.md history).

### G5. Remaining Work (unchanged from Part D)

D1 terminal dashboard UI pages · D2 security hardening (bcrypt, auth middleware everywhere, rate limits) · D3 real integrations (WhatsApp OTP, live feeds, Duitku prod) · D4 CI/CD + backups + packaging. Phase-2 pass should also fold `exchange` into `ecosystem.config.js` and move the log path per spec.

