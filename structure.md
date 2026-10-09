# Struktur Project 0-TRADER-COMPANEY
**Tanggal pembuatan**: 3 Oktober 2026
**Tanggal update terakhir**: 10 Oktober 2026 — WHITELABEL PLATFORM (see new-prompt/structure.md)

---

## 0. WHITELABEL ARCHITECTURE (new-prompt/structure.md — CANONICAL for whitelabel)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    WHITELABEL PLATFORM ARCHITECTURE                       ║
╚══════════════════════════════════════════════════════════════════════════╝

                            ┌─────────────────────────┐
                            │   WHITELABEL BACKEND    │
                            │      (Control Hub)      │
                            │     port :11112         │
                            └────────────┬────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │      SUPERADMIN       │                 │        ADMIN          │
        │   (Master Control)    │                 │   (Tenant Control)    │
        ├───────────────────────┤                 ├───────────────────────┤
        │ • Manage Whitelabels  │                 │ • Manage Content      │
        │ • Global Config       │                 │ • Manage Users        │
        │ • Billing / Plans     │                 │ • View Reports        │
        │ • System Settings     │                 │ • Tenant Settings     │
        │ • All Tenants Access  │                 │ • Scoped to Tenant    │
        └───────────┬───────────┘                 └───────────┬───────────┘
                    └────────────────────┬────────────────────┘
                                         │  REST API / Auth Token
                                         ▼
                            ┌─────────────────────────┐
                            │    FRONTEND (Client)    │
                            │   (Admin Login Portal)  │
                            │     port :22221         │
                            └────────────┬────────────┘
                                         ▼
                            ┌─────────────────────────┐
                            │      END USERS          │
                            │  (Web / Mobile Browser) │
                            └─────────────────────────┘
```

| Component | Port | Location on VPS | Purpose |
|-----------|------|-----------------|---------|
| Whitelabel Backend (Control Hub) | **11112** | `apps/whitelabel-backend` | Multi-tenant whitelabel management: superadmin + per-tenant admin, JWT auth, SQLite store |
| Frontend (Admin Login Portal) | **22221** | `apps/exchange` (rebuilt) | Admin/Superadmin login portal + whitelabel-branded exchange UI served to end users |
| Legacy Backend API | 11110 | `apps/backend` | Existing trading/auth API (unchanged, still running) |
| Terminal | 22220 | `apps/terminal` | Existing Next.js frontend (unchanged) |
| Engine | 3001 | `apps/engine` | Trading engine + ledger.db (unchanged) |

### Roles & Capabilities
- **SUPERADMIN** (master control): manage whitelabels (tenants), global config, billing/plans, system settings, access all tenants.
- **ADMIN** (tenant control): manage content, manage users, view reports, tenant settings — strictly scoped to its own tenant.

### Whitelabel Backend API (port 11112)
```
POST /api/auth/login                # Login (superadmin or tenant admin) -> { token, role, tenant }
GET  /api/auth/me                   # Current identity (requires Bearer token)

# Superadmin only
GET    /api/whitelabels             # List tenants
POST   /api/whitelabels             # Create tenant { slug, name, primaryColor, logoUrl, plan, adminUser, adminPass }
GET    /api/whitelabels/:slug       # Tenant detail + branding
PUT    /api/whitelabels/:slug       # Update tenant (branding, plan, active)
DELETE /api/whitelabels/:slug       # Remove tenant
GET    /api/config                  # Global config
PUT    /api/config                  # Update global config
GET    /api/tenants/:slug/users     # All-tenants user access
GET    /api/reports                 # Cross-tenant report summary

# Tenant-scoped (superadmin OR that tenant's admin; scope enforced by JWT)
GET    /api/admin/content           # Tenant content items
POST   /api/admin/content           # Create content
PUT    /api/admin/content/:id       # Edit content
DELETE /api/admin/content/:id       # Delete content
GET    /api/admin/users             # Tenant users
GET    /api/admin/reports           # Tenant-only report
GET    /api/admin/settings          # Tenant settings (branding fields editable)
PUT    /api/admin/settings          # Update tenant settings

# Public branding (consumed by frontend)
GET    /api/brand/:slug             # { name, primaryColor, logoUrl, theme } for login page theming
```

### Frontend Routes (port 22221)
```
GET  /login               # Admin Login Portal (branded via ?tenant=slug -> /api/brand/:slug)
GET  /admin               # Tenant admin console (content/users/reports/settings)
GET  /superadmin          # Master control console (whitelabels/global config/billing)
GET  /*                   # Rest: existing whitelabel-branded exchange pages (unchanged)
```

### Deployment (VPS 187.127.178.20)
```bash
pm2 list   # whitelabel-backend (:11112), exchange (:22221), backend (:11110), terminal (:22220), engine (:3001)
```

---

## 1. RINGKASAN EKSEKUSI

| Item | Status | Detail |
|------|--------|--------|
| **Backend API** | ✅ Running | Port 11110 (PM2: backend, PID 3374694) |
| **Terminal Frontend** | ✅ Running | Port 22220 (PM2: terminal, PID 3374702) |
| **Static Files** | ✅ Running | Port 2217 (chinque-cripto design system) |
| **Engine** | ✅ Running | Port 3001 (PM2: engine, PID 3374719) |
| **Database** | ✅ SQLite | `apps/engine/data/ledger.db` |
| **Admin Panel** | ✅ Accessible | `/admin/*` routes |
| **Smoke Tests** | ✅ 5/5 PASS | All endpoints verified |

**VPS**: 187.127.178.20  
**Dev Login**: chinque / admin1

---

## 2. PROJECT STRUCTURE (Updated: 4 Oktober 2026)

```
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   └── routes/
│   │   │       ├── auth.ts   # Auth routes (login/register/otp)
│   │   │       └── admin.ts  # Admin routes (stats/users)
│   │   └── dist/             # Compiled output
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/
│   │   │   ├── server/
│   │   │   │   └── auth.ts   # Auth middleware
│   │   │   └── index.ts      # Engine entry
│   │   ├── dist/
│   │   └── data/
│   │       └── ledger.db     # SQLite database
│   └── terminal/             # Next.js frontend (port 22220)
│       ├── app/
│       │   ├── layout.tsx    # Root layout
│       │   ├── page.tsx      # Homepage
│       │   ├── globals.css   # Tailwind + design tokens
│       │   ├── login/        # Login page
│       │   ├── signup/       # Registration page
│       │   ├── dashboard/    # Trading dashboard
│       │   │   └── [section]/# Dynamic dashboard sections
│       │   └── admin/        # Admin panel
│       │       ├── login/    # Admin login
│       │       ├── page.tsx  # Admin dashboard
│       │       └── users/    # User management
│       ├── components/
│       │   ├── account/      # Account UI
│       │   ├── book/         # Orderbook
│       │   ├── chart/        # TradingView charts
│       │   ├── common/       # Shared components
│       │   ├── orderform/    # Order placement
│       │   ├── shell/        # Layout shell
│       │   ├── tabs/         # Bottom tabs
│       │   └── topbar/       # Ticker strip
│       └── lib/
│           ├── api-client.ts # REST API client
│           ├── ws-client.ts  # WebSocket client
│           └── format.ts     # Number formatting
├── packages/
│   └── shared/               # Shared types & config
│       └── src/
│           ├── domain.ts     # Core types
│           ├── api.ts        # API contracts
│           └── config.ts     # Config constants
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── DESIGN-SYSTEM-2217.md # Design tokens from port 2217
│   ├── FINAL-REPORT.md       # Project completion report
│   ├── RUNBOOK.md            # Operations guide
│   └── HARDENING-TODO.md     # Security checklist
├── scripts/
│   ├── deploy.sh             # Deployment script
│   ├── smoke.sh              # Smoke tests
│   └── smoke-test.py         # Python smoke tests
├── ops/
│   └── OPS-LOG.md            # Operations log
├── PLANNING/                 # Planning documents
│   └── ENDGOAL-PROJECT/      # Reference projects
├── package.json              # Root workspace config
├── tsconfig.base.json        # TypeScript config
├── ecosystem.config.js       # PM2 config
├── structure.md              # This file
├── AGENTS.md                 # Agent instructions
├── MASTER-PLAN.md            # Project roadmap
└── handoff.md                # Session handoff notes
```

---

## 3. INDODAX RESEARCH (4 Oktober 2026)

### Sitemap Analysis
- **Total URLs**: 1,438 (7 homepage + 477 market + 477 depth_chart + 477 chart)
- **Unique trading pairs**: 477 (465 IDR + 12 USDT)
- **Unique web pages**: 484 (7 homepage + 477 market)
- **CORRECTION**: Previous report of "~955 unique pages" was INCORRECT; real count is 484

### Trading Pairs Shortlist Status
| Asset | IDR Pair | USDT Pair | Status |
|-------|----------|-----------|--------|
| BTC | ✅ | ✅ | Match |
| ETH | ✅ | ✅ | Match |
| SOL | ✅ | ❌ | IDR only |
| BNB | ✅ | ❌ | IDR only |
| XRP | ✅ | ❌ | IDR only |
| LINK | ✅ | ❌ | IDR only |
| AAVE | ✅ | ❌ | IDR only |

### Research Files
- `docs/research/indodax-sitemap.md` - Full sitemap report
- `docs/research/indodax-api-samples.md` - API endpoint documentation
- `docs/research/indodax-pairs.json` - 477 pairs catalog with flags

| Port | Service | Description |
|------|---------|-------------|
| 11110 | Backend API | Express REST API (auth, admin) |
| 22220 | Terminal | Next.js frontend (customer facing) |
| 2217 | Static | Design system reference (chinque-cripto) |
| 3001 | Engine | Trading engine (WebSocket + matching) |
| 24187 | Hermes Town | Agent visualization (localhost only) |
| 24188 | Nginx Proxy | External access to Hermes Town |

---

## 5. API ENDPOINTS

### Backend (Port 11110)
```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
POST /api/auth/otp/verify     # OTP verification
GET  /api/admin/stats         # Admin statistics
GET  /api/admin/users         # User list
POST /api/admin/users         # Create user
PUT  /api/admin/users/:id     # Update user
DELETE /api/admin/users/:id   # Delete user
GET  /api/admin/audit         # Audit log
```

### Engine (Port 3001)
```
WS   /ws                       # WebSocket connection
GET  /api/tickers              # Market tickers
GET  /api/market/:pair         # Market details
POST /api/orders               # Place order
GET  /api/orders               # Get orders
GET  /api/wallet/:userId       # Wallet balance
```

### Terminal (Port 22220)
```
GET  /                         # Homepage
GET  /login                    # Login page
GET  /signup                   # Registration page
GET  /dashboard                # Trading dashboard
GET  /dashboard/trade          # Trade section
GET  /dashboard/wallet         # Wallet section
GET  /admin/login              # Admin login
GET  /admin                    # Admin dashboard
GET  /admin/users              # User management
```

---

## 6. DATABASE SCHEMA

**SQLite Database**: `apps/engine/data/ledger.db`

### Tables
```sql
-- Users
users (id, username, email, password_hash, otp_secret, is_admin, created_at)

-- Wallets
wallets (id, user_id, asset, balance, frozen_balance)

-- Orders
orders (id, user_id, pair, side, type, price, quantity, status, created_at)

-- Ledger (double-entry)
journal (id, transaction_id, account_id, asset, debit, credit, created_at)

-- Audit log
audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)
```

---

## 7. RUNNING SERVICES (PM2)

```bash
pm2 list
```

| ID | Name | Port | Status | Uptime | Memory |
|----|------|------|--------|--------|--------|
| 0 | backend | 11110 | online | 8h | 85.9mb |
| 1 | terminal | 22220 | online | 8h | 116.5mb |
| 2 | engine | 3001 | online | 8h | 111.9mb |

---

## 8. ADMIN CREDENTIALS

```
Username: chinque
Password: admin1
Base URL: http://187.127.178.20:22220/admin/login
```

---

## 10. RECENT UPDATES (4 Oktober 2026)

- ✅ Indodax sitemap research completed (1,438 URLs, 477 pairs)
- ✅ API endpoints documented (docs/research/)
- ✅ Pair catalog generated (477 pairs: 465 IDR + 12 USDT)
- ✅ Structure files updated with real file tree
- ⚠️ CORRECTION: Unique pages = 484 (not ~955 as previously reported)
- ⚠️ Smoke test: 1/5 PASS (POST /api/auth/login failing - credentials issue)

---

## 11. DUPLICATE STRUCTURE FILES

| File | Date | Status |
|------|------|--------|
| `structure.md` | 4 Okt 2026 | ✅ CANONICAL (English, detailed) |
| `struktur04oktober26.md` | 4 Okt 2026 | Duplicate |
| `struktur03oktober26.md` | 4 Okt 2026 | Duplicate (updated from 3 Okt) |
| `strucktur03oktober26.md` | 4 Okt 2026 | Duplicate (typo fixed, updated) |

**Action**: Keep `structure.md` as canonical. Others are historical duplicates.

---

*Last updated: 4 Oktober 2026*

```bash
# Check admin stats
curl http://localhost:11110/api/admin/stats
# Response: {"users":21,"orders":14,"simulasi":true}

# Check smoke tests
bash scripts/smoke.sh
# Expected: 5/5 PASS
```

---

## 9. DEPLOYMENT

```bash
# Full deployment
bash scripts/deploy.sh

# Smoke test
bash scripts/smoke.sh

# Restart all services
pm2 restart all

# View logs
pm2 logs
```

---

## 10. RECENT UPDATES (4 Oktober 2026)

- ✅ Hermes Town plugin installed and configured (port 24187/24188)
- ✅ Nginx reverse proxy configured for external town access
- ✅ Firewall rules added for port 24187
- ✅ Documentation updated with current structure
- ✅ All smoke tests passing (5/5)

---

## 11. FILES REFERENCE

| File | Purpose |
|------|---------|
| `MASTER-PLAN.md` | Complete project roadmap |
| `docs/RUNBOOK.md` | Operations runbook |
| `docs/HARDENING-TODO.md` | Security hardening checklist |
| `docs/DESIGN-SYSTEM-2217.md` | Design tokens from chinque-cripto |
| `ops/OPS-LOG.md` | Operations log |
| `handoff.md` | Session handoff notes |

---

*Last updated: 4 Oktober 2026*
