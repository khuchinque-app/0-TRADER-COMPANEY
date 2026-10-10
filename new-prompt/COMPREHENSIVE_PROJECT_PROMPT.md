I've read the full `COMPREHENSIVE_PROJECT_PROMPT.md` and researched the HollaEx Kit architecture. Here is the corrected version of your project prompt, with **HollaEx Kit** integrated as the backend engine.

---

## 🔄 Key Changes at a Glance

| Aspect | Before (Custom Backend) | After (HollaEx Kit) |
| :--- | :--- | :--- |
| **Backend** | Custom Express API on :11110 | HollaEx Kit Docker stack (nginx + postgres + redis + kit server) |
| **Trading Engine** | Custom engine on :3001 | HollaEx Kit's built-in matching engine |
| **Database** | SQLite `ledger.db` | PostgreSQL (HollaEx Kit's native database) |
| **API Prefix** | Custom routes (`/api/market/*`, etc.) | `/v2/*` (HollaEx standard: `/v2/public`, `/v2/order`, `/v2/wallet`, etc.) |
| **WebSocket** | Custom WS on :3001 | `wss://your-exchange.com/stream` |
| **Market Data** | MEXC public API via custom `packages/mexc-client` | HollaEx Kit's built-in market data + optional MEXC connector plugin |
| **Wallet & Blockchain** | Custom engine routes | HollaEx Kit's built-in wallet system (handles ETH/ERC-20 via `web3.js`, etc.) |
| **Auth** | Custom auth routes | HollaEx Kit's user management (`/v2/user`) |

---

## 📄 Corrected `COMPREHENSIVE_PROJECT_PROMPT.md`

Below is the revised document. I've marked **⚡ NEW** for sections that changed and **🔄 MODIFIED** for sections that were adjusted.

---

```markdown
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
- **Status:** Phase 1 COMPLETE — Production Ready (Paper Trading)

## ⚡ NEW: BACKEND ENGINE — HOLLAEX KIT

As of Oct 10, 2026, the backend engine has been **replaced** with **HollaEx Kit** — an open-source, self-hostable white-label crypto exchange platform.

### Why HollaEx Kit?
- **Self-hosted & MIT-licensed** — you own the code and IP
- **Complete exchange stack** — matching engine, wallet system, user management, admin panel
- **Standardized API** — `/v2/*` REST endpoints + WebSocket stream
- **Docker-native** — deploys via `docker-compose` with 4 containers (nginx, redis, postgresql, kit server)
- **Plugin system** — extend functionality without modifying core code
- **Battle-tested** — used by real exchanges in production

### HollaEx Kit Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  HOLLAEX KIT DOCKER STACK (on VPS)                          │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐  │
│  │  nginx  │  │  redis  │  │postgres │  │ kit server   │  │
│  │ (proxy) │  │ (cache) │  │  (DB)   │  │ (Express)    │  │
│  └────┬────┘  └─────────┘  └─────────┘  └──────┬───────┘  │
│       │                                         │          │
│       └─────────────────┬───────────────────────┘          │
│                         │                                  │
│                    /v2/* REST API                          │
│                    wss://.../stream                        │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  YOUR FRONTEND (apps/exchange — Next.js on :22221)          │
│                                                             │
│  - Server-side API adapter (Next route handlers)            │
│  - Calls HollaEx Kit /v2/* endpoints                       │
│  - Renders charts, order book, order form, wallet UI        │
│  - NEVER exposes API keys to browser                        │
└─────────────────────────────────────────────────────────────┘
```

### HollaEx Kit API Surface (key endpoints)
| Category | Endpoint | Purpose |
| :--- | :--- | :--- |
| **Public** | `/v2/public` | Tickers, orderbooks, trades |
| **User** | `/v2/user` | Auth, profile, 2FA |
| **Order** | `/v2/order` | Place, cancel, query orders |
| **Trade** | `/v2/trades` | Trade history |
| **Wallet** | `/v2/wallet` | Balances, transactions |
| **Deposit** | `/v2/deposit` | Deposit addresses |
| **Withdrawal** | `/v2/withdrawal` | Withdrawals |
| **Admin** | `/v2/admin` | Exchange administration |

### HollaEx Kit Node.js SDK
Use `hollaex-node-lib` in your Next.js server-side adapter:
```js
const HollaEx = require('hollaex-node-lib');
const client = new HollaEx({
  apiURL: 'http://localhost:PORT/v2',  // your Kit server
  wsURL: 'ws://localhost:PORT/stream', // your Kit WS
  apiKey: process.env.HOLLAEX_API_KEY,
  apiSecret: process.env.HOLLAEX_API_SECRET,
});
```

## CURRENT ARCHITECTURE (as of Oct 10, 2026)

### ⚡ NEW: Running Services (PM2 managed)
| Service | Port | Status | Description |
| :--- | :--- | :--- | :--- |
| **HollaEx Kit (Docker)** | varies | 🔄 To be deployed | nginx + redis + postgres + kit server |
| **Terminal Frontend** | 22220 | ✅ Running | Next.js dashboard (customer-facing) |
| **Exchange Frontend** | 22221 | 🔄 In progress | Next.js mirror of Indodax routes |
| **Static Files** | 2217 | ✅ Running | ChinQue-Cripto design system |

> **Note:** The old custom backend (:11110) and custom engine (:3001) are **deprecated**. HollaEx Kit replaces both.

### 🔄 MODIFIED: Monorepo Structure
```
0-TRADER-COMPANEY/
├── apps/
│   ├── terminal/              # Next.js dashboard (port 22220)
│   │   ├── app/               # Pages (login, signup, dashboard, admin)
│   │   ├── components/        # account, book, chart, orderform, shell, tabs, topbar
│   │   └── lib/               # api-client.ts, ws-client.ts, format.ts
│   │
│   ├── exchange/              # ⚡ NEW: Indodax-mirror frontend (port 22221)
│   │   ├── app/
│   │   │   ├── market/        # /market/{PAIR}, /market/depth_chart/{PAIR}
│   │   │   ├── chart/         # /chart/{PAIR}
│   │   │   ├── trade_api/     # API docs page
│   │   │   └── affiliate/     # /affiliate, /privacy-policy, /help/*
│   │   └── lib/
│   │       └── hollaex-adapter.ts  # ⚡ Server-side adapter to HollaEx Kit
│   │
│   └── engine/                # 🔄 LEGACY — being replaced by HollaEx Kit
│       └── (deprecated)
│
├── vendor/
│   └── hollaex/               # ⚡ NEW: HollaEx Kit (isolated)
│       ├── docker-compose.yml
│       ├── .env
│       ├── API-NOTES.md       # Endpoint reference for frontend adapter
│       └── README.md
│
├── packages/
│   ├── shared/                # Shared types (domain.ts, api.ts, config.ts)
│   ├── mexc-client/           # ⚡ Market data client (MEXC public API)
│   └── indodax-routes/        # ⚡ Route mirror logic + routes.json generator
│
├── docs/                      # ADR, design system, runbook
├── PLANNING/                  # 20+ planning documents
├── scripts/                   # deploy.sh, smoke.sh, smoke-exchange.sh
├── ops/                       # OPS-LOG.md
├── docker-compose.yml         # Your own services
├── docker-compose.vendor.yml  # ⚡ HollaEx Kit orchestration
└── package.json               # npm workspaces root
```

## 🔄 MODIFIED: DATABASE SCHEMA

The SQLite `ledger.db` is **replaced** by HollaEx Kit's **PostgreSQL** database. HollaEx Kit manages its own schema for:
- Users (authentication, 2FA, KYC)
- Wallets (balances, deposits, withdrawals)
- Orders (market, limit)
- Trades (execution history)
- Admin settings (fees, pairs, operator controls)

**Your frontend does not touch the database directly.** It calls HollaEx Kit's API. All data flows through `/v2/*` endpoints.

## 🔄 MODIFIED: BACKEND INTEGRATION (was B8)

- **Auth, wallet, orders, admin** are handled by **HollaEx Kit**, not your custom backend.
- `apps/exchange` talks to HollaEx Kit **server-side only** (Next.js route handlers or rewrites), so no CORS and no secrets in the browser.
- **Cookie collision warning:** cookies are shared across ports on the same host. Use distinct cookie name `sx_exchange_session` so 22220 and 22221 sessions never overwrite each other.
- **Fill model:** Market orders walk the current order book from HollaEx Kit; limit orders rest in the Kit's matching engine.
- **Login** must work end-to-end with HollaEx Kit's user system.

## 🔄 MODIFIED: PART C — MILESTONES & ACCEPTANCE (M6–M10)

| ID | Deliverable |
| :--- | :--- |
| M6 | `gen-routes.mjs` + `routes.json`; `apps/exchange` skeleton on 22221 with every static route returning 200 |
| M7 | **HollaEx Kit deployed** via Docker; `hollaex-adapter.ts` wraps `/v2/*` endpoints; health check passes |
| M8 | `/market` and `/market/{PAIR}` (chart, book, tape, ticker) incl. NO_FEED and 404 states |
| M9 | `/market/depth_chart/{PAIR}`, `/chart/{PAIR}`, order form + wallet panel wired to HollaEx Kit |
| M10 | smoke script, PM2 save, RUNBOOK + handoff.md updated, `PLANNING/LOG-exchange.md` complete |

### Acceptance Criteria (`scripts/smoke-exchange.sh`)
```bash
# Route parity
curl -sI http://187.127.178.20:22221/ -> 200
each static route in routes.json -> 200
/market/BTCIDR /market/depth_chart/BTCIDR /chart/BTCIDR -> 200
/market/FAKEXYZ -> 404

# HollaEx Kit health
curl -s http://localhost:PORT/v2/health -> ok

# Market data from HollaEx Kit
curl -s http://localhost:PORT/v2/public/ticker?symbol=btc-usdt -> data
curl -s http://localhost:PORT/v2/public/orderbook?symbol=btc-usdt -> bids[] + asks[]

# No secrets in browser
grep -rEn "HOLLAEX_API_(KEY|SECRET)" apps/exchange/src -> no matches (only server-side)

# Robots
robots.txt -> Disallow: /
```

## ⚡ NEW: HOLLAEX KIT DEPLOYMENT STEPS

1. **Vendor the Kit** (already in prompt):
   ```bash
   git clone https://github.com/hollaex/hollaex-kit.git vendor/hollaex
   cd vendor/hollaex && ./install.sh
   ```

2. **Configure**:
   ```bash
   hollaex server --setup
   # → Interactive: exchange name, admin credentials, domain (localhost for dev)
   ```

3. **Start**:
   ```bash
   hollaex server --start
   # → Starts Docker containers: nginx, redis, postgresql, kit server
   ```

4. **Get API keys** from the admin panel or CLI:
   ```bash
   hollaex server --apikey
   ```

5. **Add to `.env`** in your project root:
   ```
   HOLLAEX_API_URL=http://localhost:PORT/v2
   HOLLAEX_WS_URL=ws://localhost:PORT/stream
   HOLLAEX_API_KEY=your_key_here
   HOLLAEX_API_SECRET=your_secret_here
   ```

6. **Document** in `vendor/hollaex/API-NOTES.md`:
   - Base URL and port
   - Auth flow (JWT via `/v2/user/login`)
   - Key endpoints for your frontend

## ⚡ NEW: FRONTEND ADAPTER LAYER

Create `apps/exchange/lib/hollaex-adapter.ts`:

```typescript
// Server-side only — never imported in client components
import HollaEx from 'hollaex-node-lib';

const client = new HollaEx({
  apiURL: process.env.HOLLAEX_API_URL!,
  wsURL: process.env.HOLLAEX_WS_URL!,
  apiKey: process.env.HOLLAEX_API_KEY!,
  apiSecret: process.env.HOLLAEX_API_SECRET!,
});

export async function getTicker(pair: string) {
  const symbol = pair.toLowerCase().replace('idr', '-idr');
  return client.getTicker({ symbol });
}

export async function getOrderbook(pair: string) {
  const symbol = pair.toLowerCase().replace('idr', '-idr');
  return client.getOrderbook({ symbol });
}

export async function placeOrder(params: {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price?: number;
  size: number;
}) {
  return client.createOrder(params);
}

// ... wallet, trades, user endpoints
```

## PART D: REMAINING TODO FROM ORIGINAL BUILD (unchanged)

### D1. Frontend Pages (API exists, UI not built in terminal)
- [ ] Recurring invest page (`/dashboard/recurring`)
- [ ] Authenticator app page (`/dashboard/authenticator`)
- [ ] Help support page (`/dashboard/support`)
- [ ] Learn blockchain page
- [ ] Referral page
- [ ] API keys page
- [ ] Payment page

### D2. Security Hardening (Phase 2)
- [ ] Replace mock auth with bcrypt
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection
- [ ] Input validation (zod/joi)

### D3. Phase 3/4 Integrations
- [ ] Real-time WebSocket to HollaEx Kit stream
- [ ] CI/CD pipeline
- [ ] Monitoring (Prometheus/Grafana)

## PART E: TWO-AGENT LANE SPLIT (unchanged)

| Agent | Responsibility |
| :--- | :--- |
| **VPS agent** | ops/deploy only — Docker, PM2, nginx, firewall |
| **Local agent** | code only — frontend, packages, tests |

**Logging rules:** Short entries in `PLANNING/LOG-exchange.md`. Defaults listed so agents never block on decisions.

## PART F: DEFAULTS (unchanged)

| Decision | Default |
| :--- | :--- |
| Internal quote | USDT (IDR is display-only toggle) |
| Order types | Market + limit only |
| Fees | Flat 10 bps / 5 bps spread |
| Book model | Synthetic |
| Simulation flag | `simulasi: true` on all money responses |
| Color convention | Green-up / red-down (ONE theme token) |
| Robots | `Disallow: /` + `noindex` everywhere |

---

## 📌 SUMMARY OF CHANGES

| Section | Change |
| :--- | :--- |
| **Backend Engine** | ⚡ Replaced custom Express + engine with **HollaEx Kit** (Docker) |
| **API Prefix** | ⚡ Now `/v2/*` (HollaEx standard) |
| **Database** | ⚡ PostgreSQL (HollaEx native) replaces SQLite |
| **Market Data** | ⚡ HollaEx Kit built-in + optional MEXC connector |
| **Wallet & Blockchain** | ⚡ Handled by HollaEx Kit internally |
| **Frontend Adapter** | ⚡ New `hollaex-adapter.ts` in `apps/exchange/lib/` |
| **Deployment** | ⚡ HollaEx Kit via `docker-compose.vendor.yml` |
| **Node.js SDK** | ⚡ Use `hollaex-node-lib` for server-side calls |
| **Everything else** | 🔄 Unchanged (routes, milestones, UI, security plan) |
```

---

## ✅ What This Means for You

| Before | After |
| :--- | :--- |
| You built the backend yourself | HollaEx Kit is your backend |
| You managed SQLite | HollaEx Kit manages PostgreSQL |
| You wrote auth routes | HollaEx Kit handles auth via `/v2/user` |
| You wrote wallet logic | HollaEx Kit handles wallets + blockchain |
| You wrote the matching engine | HollaEx Kit has a built-in matching engine |
| **You still build** | **The frontend** — charts, UI, routes, adapter layer |

Your job **does not change**. You still build the React/Next.js frontend. You just call `/v2/*` instead of your old custom endpoints. The adapter layer (`hollaex-adapter.ts`) is the bridge between your UI and HollaEx Kit.

---

## ⚠️ Security Note (from your agent)

Your agent flagged that the original file contains **admin/dev credentials and the live VPS address** in a public GitHub repo. I recommend:

1. **Scrub credentials** from the public repo immediately
2. Move secrets to `.env` files (never committed)
3. Add `.env` to `.gitignore`
4. Rotate any exposed credentials

This applies to both the old custom backend and the new HollaEx Kit setup.

---

If you want, I can also write the **follow-up prompt** for your coding agent to actually deploy HollaEx Kit into your `vendor/` folder and build the adapter layer — the same way I did for the earlier vendoring prompt.
