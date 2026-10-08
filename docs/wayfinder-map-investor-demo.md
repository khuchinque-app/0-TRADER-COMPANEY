# Wayfinder Map: Full Indodax Clone - Investor Demo

**Created:** 2026-10-09
**Status:** ACTIVE
**Deadline:** TODAY/TOMORROW

---

## Destination

Build a complete Indodax.com clone with full functionality (register, market browsing, trading) as a PAPER/MOCK trading platform. Deploy to http://187.127.178.20:22221 as a high-quality investor demo. All features work but no real money - paper trading only.

**Success Criteria:**
- ✅ Homepage matches indodax.com layout
- ✅ Market list shows 1000+ pairs (MEXC API)
- ✅ Market detail page with trading interface
- ✅ Functional order book + recent trades
- ✅ Working paper trade execution
- ✅ Mock login/register flow
- ✅ Real-time price updates
- ✅ Responsive design (mobile + desktop)

---

## Notes

- **Current Stack:** React 18 + Vite + Tailwind CSS + TypeScript + lightweight-charts v5
- **API:** MEXC SDK (https://github.com/mexcdevelop/mexc-api-sdk)
- **Backend:** Express.js on port 11110
- **Frontend:** Vite preview on port 22221
- **Database:** SQLite (ledger.db)
- **Theme:** Vice City Neon (already applied)
- **Language:** Indonesian (Bahasa Indonesia)
- **Portfolio Branch:** feat/market-trade

---

## Decisions So Far

- [X] **Use MEXC API over Indodax API:** MEXC has CORS support, 1500+ USDT pairs, no proxy needed
- [X] **Paper trading only:** No real money, mock wallet with balances
- [X] **IDR/USD toggle:** 1 USDT = 15,850 IDR
- [X] **Vice City theme:** Applied to all pages

---

## Open Tickets

### [TICKET-1] Grilling: Authentication & User Flow
- **Type:** HITL/Grilling
- **Status:** OPEN
- **Question:** What auth flow for investor demo?
  - A) Full JWT auth with mock backend
  - B) Simple session-based login (localStorage)
  - C) Skip auth, show "Demo Mode" banner
  - D) Social login mocks (Google, Facebook)

### [TICKET-2] Grilling: Trading Features Scope
- **Type:** HITL/Grilling
- **Status:** OPEN
- **Question:** What trading features are MUST-HAVE vs NICE-TO-HAVE?
  - MUST: Buy/Sell orders, order book, recent trades, P&L tracking
  - NICE: Stop loss, take profit, order history, position management

### [TICKET-3] Research: MEXC API Rate Limits
- **Type:** AFK/Research
- **Status:** OPEN
- **Question:** What are MEXC API rate limits and how to handle them?

### [TICKET-4] Task: Install MEXC SDK
- **Type:** HITL/Task
- **Status:** OPEN
- **Question:** Install and configure mexc-sdk in the project

### [TICKET-5] Prototype: Market Detail Page
- **Type:** HITL/Prototype
- **Status:** OPEN
- **Question:** Design the /market/BTCIDR page layout

### [TICKET-6] Task: Build Auth System (Mock)
- **Type:** HITL/Task
- **Status:** OPEN
- **Question:** Implement mock login/register flow

### [TICKET-7] Task: Build Trading Interface
- **Type:** HITL/Task
- **Status:** OPEN
- **Question:** Order book, trades, chart, order form

### [TICKET-8] Task: Integrate WebSocket for Real-time
- **Type:** HITL/Task
- **Status:** OPEN
- **Question:** Real-time price updates via MEXC WebSocket

---

## Fog of War (Not Yet Specified)

- How to handle missing IDR pairs on MEXC?
- Should we implement order history page?
- Do we need a wallet/balance page?
- What about mobile-responsive navigation?
- Should we add trading notifications?

---

## Out of Scope

- Real payment gateway integration (paper only)
- KYC/AML verification
- Admin dashboard
- Mobile app (web responsive only)
- Social features (chat, comments)
- Referral/affiliate system (for now)
