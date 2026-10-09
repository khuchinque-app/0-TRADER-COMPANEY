0-TRADER-COMPANEY/
├── frontend/          # Next.js + shadcn/ui
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── public/
│   └── ...
├── backend/           # Node.js/Express mock API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── data/
│   └── ...
├── shared/            # shared types
└── ...
I'll also list missing components like OrderBook, TradeHistory, WalletConnect, DepositWithdraw, KYC, AdminPanel, etc.

I'll provide a checklist.

Now, I'll write the answer in a helpful tone, using the search results as reference for typical components. I'll cite the search results for checklists (e.g., frontend components from result 10, backend services from result 11).

Let me extract key points from search results:

Frontend components: main form, buttons, details panel, wallet balance, max button, fiat equivalent, price impact, slippage, etc. (result 10, lines 5-6). Also market overview, candlestick chart, order book, order form, portfolio, order history (result 10, lines 11-14). Component organization (result 12, lines 20-21).

Backend services: API Gateway, Auth Service, Coin and Pair Service, Matching Engine, WebSocket Server, Price Poller, etc. (result 11, lines 15-34). Microservices like Order Matching, Wallet Service, Market Data Service, Notification Service (result 11, lines 45-47).

I'll incorporate these.

Now, I'll write the final answer.

I've reviewed your repository. Here's a clear analysis of your current structure, what's missing for a complete crypto trading platform, and a recommended folder structure for your mock mode phase.

📁 Your Current Project Structure (from GitHub)
Based on the repository, your project is a monorepo with the following top-level structure:

text
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/          # Express API (port 11110)
│   ├── engine/           # Trading engine (port 3001)
│   ├── exchange/         # React frontend (port 22220/22221)
│   └── terminal/         # Next.js frontend
├── packages/
│   └── shared/           # Shared types (domain.ts, api.ts, config.ts)
├── docs/                 # ADRs, design system, runbook
├── PLANNING/             # 20+ planning documents
├── scripts/              # deploy.sh, smoke.sh, smoke-test.py
├── ops/                  # OPS-LOG.md
├── new-prompt/           # Your prompt files (COMPREHENSIVE_PROJECT_PROMPT.md, structure.md, task.md, whitelabel2.md)
├── config/               # Design tokens
├── public/assets/        # Images
├── ecosystem.config.js   # PM2 configuration
├── docker-compose.yml
└── package.json          # npm workspaces root
Your new-prompt/structure.md describes a whitelabel architecture with a control hub (port 11112) connecting Superadmin, Admin, and Frontend (port 22221) to End Users.

🧩 What's Missing (Gap Analysis)
Comparing your structure to a complete crypto exchange platform, here are the gaps:

Frontend Gaps
Component	Status	Why It Matters
Order Book Component	❓ Not visible	Essential for real-time bid/ask display
Trade History Table	❓ Not visible	Users need to see past orders
Wallet Connect / Management UI	❓ Not visible	Deposit, withdraw, balance display
Portfolio Overview	❓ Not visible	Total holdings, P&L, allocation
KYC / Verification UI	❓ Not visible	Required for regulated exchanges
Settings (2FA, API Keys)	❓ Partially in engine routes	Must be accessible in frontend
Notifications / Alerts	❓ Not visible	Price alerts, order fills
Market List / Ticker	✅ Ticker route exists	Needs frontend component
Admin Panel	⚠️ Partially in task.md	Needs full UI implementation
Typical crypto exchange frontends require: market overview, candlestick chart, order book, order form (market/limit), portfolio, and order history pages. You have charts and order form, but the order book and portfolio components are not clearly present.

Backend Gaps
Service	Status	Why It Matters
Matching Engine	✅ apps/engine	Core trading logic
Auth Service	✅ apps/backend/src/routes/auth.ts	User authentication
Admin Service	✅ admin.ts	Admin panel backend
FX Rate Service	✅ fx-rate.ts	Currency conversion
WebSocket Server	✅ In engine	Real-time data
Wallet Service	⚠️ Partially	Ledger exists but wallet API unclear
Notification Service	❌ Missing	Email, push, SMS notifications
KYC Service	❌ Missing	Identity verification
Payment Gateway	⚠️ payment.ts in engine	Needs proper integration
Referral System	✅ referral.ts in engine	Referral tracking
Typical crypto exchange backends include: API Gateway, Auth Service, Coin/Pair Service, Matching Engine, WebSocket Server, Price Poller, Wallet Service, and Notification Service.

🎯 Recommended Structure for Mock Mode
Since you want to finish in mock mode first, I suggest simplifying to a clean frontend + backend split at the root:

text
0-TRADER-COMPANEY/
│
├── frontend/                          # Next.js + React + shadcn/ui
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx               # Landing page
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Sidebar + header
│   │   │   ├── dashboard/page.tsx     # Overview
│   │   │   ├── trade/
│   │   │   │   ├── page.tsx           # Default pair
│   │   │   │   └── [pair]/page.tsx    # e.g. BTC-IDR
│   │   │   ├── portfolio/page.tsx
│   │   │   ├── wallet/page.tsx
│   │   │   ├── history/page.tsx       # Order history
│   │   │   └── settings/page.tsx      # 2FA, API keys
│   │   ├── admin/                     # Admin panel
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/page.tsx
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn generated
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── trading/
│   │   │   ├── price-chart.tsx        # Candlestick
│   │   │   ├── order-book.tsx         # BID/ASK table
│   │   │   ├── order-form.tsx         # Buy/Sell
│   │   │   ├── trade-history.tsx
│   │   │   ├── pair-stats.tsx
│   │   │   └── depth-chart.tsx
│   │   ├── portfolio/
│   │   │   ├── balance-card.tsx
│   │   │   ├── holdings-table.tsx
│   │   │   └── pnl-chart.tsx
│   │   └── shared/
│   │       ├── connect-wallet-button.tsx
│   │       └── theme-toggle.tsx
│   │
│   ├── hooks/
│   │   ├── use-ticker.ts
│   │   ├── use-order-book.ts
│   │   ├── use-trades.ts
│   │   └── use-websocket.ts
│   │
│   ├── store/
│   │   └── use-trade-store.ts         # Zustand for UI state
│   │
│   ├── lib/
│   │   ├── api.ts                     # REST client to backend
│   │   ├── mock-data.ts               # ⭐ MOCK DATA HERE
│   │   ├── utils.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── trading.ts
│   │   ├── order.ts
│   │   └── user.ts
│   │
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   │
│   ├── components.json                # shadcn config
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Mock API (Node.js/Express)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts                # Login, register, 2FA
│   │   │   ├── market.ts              # Ticker, orderbook
│   │   │   ├── orders.ts              # Place, cancel, history
│   │   │   ├── wallet.ts              # Balance, deposit, withdraw
│   │   │   ├── admin.ts               # Whitelabel config
│   │   │   └── user.ts                # Profile, settings
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── mock-market.service.ts # ⭐ MOCK: price simulation
│   │   │   ├── mock-order.service.ts  # ⭐ MOCK: order matching
│   │   │   └── mock-wallet.service.ts # ⭐ MOCK: balances
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── error.ts
│   │   ├── models/
│   │   │   └── (mock in-memory arrays or JSON files)
│   │   ├── data/
│   │   │   ├── users.json             # ⭐ MOCK: seed users
│   │   │   ├── orders.json            # ⭐ MOCK: seed orders
│   │   │   └── pairs.json             # ⭐ MOCK: trading pairs
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                            # Shared types between FE/BE
│   ├── types/
│   │   ├── domain.ts
│   │   ├── api.ts
│   │   └── config.ts
│   └── package.json
│
├── docs/
│   ├── ADR/
│   ├── design-system/
│   └── runbook/
│
├── scripts/
│   ├── deploy.sh
│   └── smoke.sh
│
├── .env.example
├── docker-compose.yml
├── ecosystem.config.js
└── package.json                       # Root workspace
✅ What to Add Next (Checklist for Mock Mode)
Frontend – Must Add
□ Order Book component — displays live bid/ask from mock data
□ Trade History table — shows user's past orders
□ Portfolio page — total balance, P&L, asset allocation
□ Wallet page — deposit/withdraw UI (mock)
□ Settings page — 2FA toggle, API key management UI
□ Admin panel — whitelabel config, user management
□ Landing page — marketing site with token/roadmap sections
Backend – Must Add
□ Mock market service — generates fake ticker data, order book depth
□ Mock order service — simulates order matching against mock liquidity
□ Mock wallet service — in-memory balances, deposit/withdraw simulation
□ Mock data files — seed users, orders, pairs, balances
□ Notification service — mock email/OTP (log to console)
□ KYC endpoint — mock verification status
Infrastructure – Must Add
□ .env.example — document all environment variables
□ docker-compose.yml — run frontend + backend together
□ PROGRESS.md — track mock completion status
□ HARDENING-TODO.md — log all dev shortcuts to replace later
🔗 The Relationship (Your Mental Model Is Correct)
text
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Chart  │  │ Order   │  │Portfolio│  │ Wallet  │       │
│  │         │  │  Book   │  │         │  │         │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│                          │                                  │
│                    lib/api.ts                               │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Auth   │  │ Market  │  │ Orders  │  │ Wallet  │       │
│  │ Service │  │ Service │  │ Service │  │ Service │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │   Mock    │                           │
│                    │  Data /   │                           │
│                    │ In-Memory │                           │
│                    └───────────┘                           │
└─────────────────────────────────────────────────────────────┘
The frontend never controls the backend. It requests data and sends actions. The backend responds with data or confirms actions. This is exactly what you described: the frontend shows graphs and member data that the backend sends.
