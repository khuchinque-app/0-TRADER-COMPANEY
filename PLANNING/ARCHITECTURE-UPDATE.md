# Trading Company — Architecture Update (3 Okt 2026)

## Port Architecture (NEW)
```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS: 187.127.178.20                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Port 11110 ──► BACKEND (Express + New API)                     │
│                Controls frontend & orchestrates services         │
│                PM2: backend                                      │
│                                                                 │
│  Port 22220 ──► FRONTEND (Next.js Terminal)                     │
│                Serves dashboard UI                               │
│                PM2: terminal                                     │
│                                                                 │
│  Port 2217  ──► STATIC (ChinQue-Cripto PRO)                     │
│                Branding & static assets                          │
│                PM2: chinque-cripto                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## New Backend (Port 11110)
**Location**: `apps/backend/`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | System status overview |
| GET | `/api/frontend/status` | Frontend status |
| POST | `/api/frontend/restart` | Restart frontend service |
| POST | `/api/frontend/stop` | Stop frontend service |
| POST | `/api/frontend/start` | Start frontend service |

### Tech Stack
- Express.js + TypeScript
- Helmet (security headers)
- CORS enabled
- PM2 managed

### File Structure
```
apps/backend/
├── src/
│   ├── index.ts           # Main entry point
│   ├── routes/
│   │   └── frontend-control.ts  # Frontend management API
│   ├── middleware/
│   │   └── auth.ts        # Auth middleware (placeholder)
│   └── utils/
│       └── helpers.ts     # Utility functions
├── package.json
├── tsconfig.json
└── ecosystem.config.js    # PM2 config
```

## Existing Services (Unchanged)
### Engine Backend (Port 22220 → will move later)
**Location**: `apps/engine/`
- All trading APIs (auth, wallet, orders, market, payment, dll)
- SQLite database: `data/ledger.db`
- Login page at `GET /`

### Terminal Frontend (Port 22221 → will move to 22220)
**Location**: `apps/terminal/`
- Next.js 14 dashboard
- 18 pages (wallet, trade, AI vault, dll)
- CSS STX theme applied
- Proxy API calls to engine

## Migration Plan
1. **DONE**: Create new backend on port 11110
2. **TODO**: Migrate frontend from 22221 to 22220
3. **TODO**: Migrate engine APIs to be controlled by backend
4. **TODO**: Update nginx/Apache routing
5. **TODO**: Update environment variables in terminal

## PM2 Service List
```
backend   → port 11110 (NEW)
engine    → port 22220 (existing)
terminal  → port 22221 (will move to 22220)
```

---
Created: 2026-10-03
Status: Phase 1 Complete (Backend Created)
