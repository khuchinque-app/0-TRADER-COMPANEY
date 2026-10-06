# Trading Company — Project Structure & Workflow
**Version:** 1.0.0  
**Last Updated:** 2026-10-06 23:15 UTC  
**Author:** @Herme_KhuChinQue_bot

---

## 📁 Folder Structure

```
/home/khuchinque/0-TRADER-COMPANEY/
│
├── .git/                          # Git repository
├── .env                           # Environment variables (NEVER commit)
├── .env.example                   # Example env template
│
├── apps/
│   ├── backend/                   # FastAPI backend service
│   │   ├── src/
│   │   │   ├── index.ts          # Main entry point
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── middleware/        # Auth, rate limiting, validation
│   │   │   └── services/         # Business logic
│   │   ├── data/
│   │   │   └── ledger.db         # SQLite database (will migrate to PostgreSQL)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── terminal/                  # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── market/           # Market page (477 pairs)
│   │   │   ├── trade/            # Trade page (dynamic [pair])
│   │   │   ├── dashboard/        # User dashboard
│   │   │   └── api/              # API routes (proxied to backend)
│   │   ├── app/globals.css       # Global styles + Strata theme
│   │   ├── app/styles/
│   │   │   └── strata-theme.css  # Strata UI theme tokens
│   │   ├── public/               # Static assets
│   │   ├── next.config.js        # Next.js config + rewrites
│   │   └── package.json
│   │
│   └── engine/                    # Trading engine (simulation)
│       ├── src/
│       │   └── index.ts          # Engine logic
│       └── package.json
│
├── docs/
│   ├── API.md                     # API documentation
│   ├── PROGRESS.md               # Development progress
│   └── research/
│       ├── indodax-pairs.json    # 477 trading pairs catalog
│       └── payment-gateway-comparison.md  # (being created by scout)
│
├── scripts/
│   ├── smoke.sh                  # Smoke test suite (10 tests)
│   ├── production-audit.sh       # Production readiness audit
│   └── vps-update-wayfinder.sh   # Wayfinder installation
│
├── ops/
│   ├── handoff-from-local-agent.md      # Local agent handoff
│   └── wayfinder-agent-instructions.md  # Wayfinder usage guide
│
├── PLANNING/
│   ├── FINAL-ARCHITECTURE.md       # Architecture decisions
│   ├── PAYMENT-INTEGRATION.md      # Duitku integration research
│   ├── TASK.md                     # Task tracking
│   └── *.md                        # Various planning docs
│
├── .scratch/
│   └── wayfinder-trading-company.md  # Wayfinder map (this effort)
│
└── README.md                       # Project overview
```

---

## 🔄 Workflow: How It Runs

### Development Flow
```
1. Developer makes changes on feature branch
2. Run tests: bash scripts/smoke.sh
3. Commit: git commit -m "feat: description"
4. Push: git push origin feat/branch-name
5. VPS pulls: git pull origin feat/branch-name
6. Deploy: pm2 restart backend && pm2 restart terminal
```

### Service Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    VPS (187.127.178.20)                 │
│                                                         │
│  Port 22220 ──► Terminal (Next.js)                      │
│       │                                                     │
│       │──► Proxy /api/* ──► Port 11110                   │
│       │                     │                             │
│       │                     ▼                             │
│       │              Backend (FastAPI)                    │
│       │                     │                             │
│       │                     ▼                             │
│       │              Engine (Simulation)                  │
│       │                     │                             │
│       │                     ▼                             │
│       │              SQLite → PostgreSQL (migration)      │
│                                                         │
│  Port 11110 ──► Backend API                             │
│  Port 3001  ──► Engine (if separate)                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
```
User → Frontend (Next.js)
    │
    ▼
API Call: /api/markets, /api/ticker/:pair, /api/orders
    │
    ▼
Backend (FastAPI)
    │
    ▼
Indodax API (external) ← Price feeds
    │
    ▼
SQLite/PostgreSQL ← Ledger, orders, users
    │
    ▼
Response → Frontend → User
```

---

## 🔧 Services & Ports

| Service | Port | Process | Status |
|---------|------|---------|--------|
| Backend API | 11110 | PM2: backend | online |
| Terminal (Frontend) | 22220 | PM2: terminal | online |
| Trading Engine | 3001 | PM2: engine | online |
| Static Files | 2217 | nginx proxy | active |

---

## 🧪 Testing

### Smoke Tests
```bash
bash scripts/smoke.sh
# Expected: 10/10 PASS
```

### Production Audit
```bash
bash scripts/production-audit.sh
# Checks: permissions, services, tests, security, etc.
```

---

## 🔐 Security Checklist

- [ ] No hardcoded secrets in code
- [ ] All secrets in .env (never committed)
- [ ] JWT authentication implemented
- [ ] Rate limiting added
- [ ] Input validation (zod/joi)
- [ ] HTTPS enabled (nginx)
- [ ] Database credentials secured

---

## 📊 Database Schema

### Current (SQLite)
```sql
users, accounts, balances, journal, journal_lines,
orders, fills, audit_log
```

### Target (PostgreSQL)
```sql
Same schema, migrated with:
- Proper types (UUID, TIMESTAMP WITH TIME ZONE)
- Indexes for performance
- Connection pooling
```

---

## 🚀 Deployment Steps

### VPS Deployment
```bash
# 1. Pull latest
cd /home/khuchinque/0-TRADER-COMPANEY
git pull origin feat/market-trade

# 2. Install dependencies
cd apps/backend && npm install
cd ../terminal && npm install

# 3. Build
cd ../terminal && npm run build

# 4. Restart services
pm2 restart backend
pm2 restart terminal
pm2 restart engine

# 5. Verify
bash scripts/smoke.sh
```

---

## 📝 Branch Strategy

```
master              ← Production branch (stable)
  │
  └── feat/market-trade  ← Current feature branch
        ├── Market page (477 pairs)
        ├── Trade page (paper trading)
        ├── Strata theme
        ├── Smoke tests
        └── Wayfinder setup
```

---

## 🔮 Future Enhancements

1. **Payment Gateway** — Duitku/Midtrans integration
2. **Database Migration** — SQLite → PostgreSQL
3. **Price Feed Redundancy** — Add Binance/CoinGecko
4. **Security Hardening** — Rate limiting, input validation
5. **Monitoring** — Error tracking, performance metrics
6. **Telegram Bot** — Fix token, add notifications

---

**Document Location:** `/home/khuchinque/0-TRADER-COMPANEY/docs/STRUCTURE.md`
