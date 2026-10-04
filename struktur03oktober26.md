# Struktur Project TRADING-COMPANEY
**Tanggal**: 3 Oktober 2026  
**Tanggal update terakhir**: 4 Oktober 2026  
**Status**: Production Ready (Paper Trading Venue)  
**VPS**: khuchinque@187.127.178.20

---

## Ringkasan Eksekusi

- **Backend API**: Port 11110 ✅ Running (PM2)
- **Terminal Frontend**: Port 22220 ✅ Running (PM2)
- **Trading Engine**: Port 3001 ✅ Running (PM2)
- **Static Files**: Port 2217 ✅ Running
- **Hermes Town**: Port 24187 (localhost) + 24188 (nginx proxy) ✅ Running
- **Database**: SQLite ledger.db ✅ Active
- **Smoke Tests**: 5/5 PASS ✅

---

## Folder Structure

```
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   ├── src/routes/
│   │   │   ├── auth.ts       # Auth endpoints
│   │   │   └── admin.ts      # Admin endpoints
│   │   └── dist/
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/server/
│   │   │   └── auth.ts       # Auth middleware
│   │   ├── dist/
│   │   └── data/
│   │       └── ledger.db     # SQLite database
│   └── terminal/             # Next.js frontend (port 22220)
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   ├── login/
│       │   ├── signup/
│       │   ├── dashboard/
│       │   │   └── [section]/
│       │   └── admin/
│       │       ├── login/
│       │       ├── page.tsx
│       │       └── users/
│       ├── components/
│       │   ├── account/
│       │   ├── book/
│       │   ├── chart/
│       │   ├── common/
│       │   ├── orderform/
│       │   ├── shell/
│       │   ├── tabs/
│       │   └── topbar/
│       └── lib/
│           ├── api-client.ts
│           ├── ws-client.ts
│           └── format.ts
├── packages/
│   └── shared/               # Shared types
│       └── src/
│           ├── domain.ts
│           ├── api.ts
│           └── config.ts
├── docs/
│   ├── adr/
│   ├── DESIGN-SYSTEM-2217.md
│   ├── FINAL-REPORT.md
│   ├── RUNBOOK.md
│   └── HARDENING-TODO.md
├── scripts/
│   ├── deploy.sh
│   ├── smoke.sh
│   └── smoke-test.py
├── ops/
│   └── OPS-LOG.md
├── PLANNING/
├── package.json
├── tsconfig.base.json
├── ecosystem.config.js
├── structure.md
├── AGENTS.md
├── MASTER-PLAN.md
└── handoff.md
```

---

## API Endpoints

### Backend (11110)
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/otp/verify
GET  /api/admin/stats
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id
DELETE /api/admin/users/:id
GET  /api/admin/audit
```

### Engine (3001)
```
WS   /ws
GET  /api/tickers
GET  /api/market/:pair
POST /api/orders
GET  /api/orders
GET  /api/wallet/:userId
```

---

## Admin Access

```
URL: http://187.127.178.20:22220/admin/login
User: chinque
Pass: admin1
```

---

*Updated: 4 Oktober 2026*
