# Trading Company — Final Architecture (3 Okt 2026)

## Port Architecture (FINAL)
```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS: 187.127.178.20                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Port 11110 ──► BACKEND API (Express + Kontrol)                │
│                • Health checks                                   │
│                • Frontend management                             │
│                • System orchestration                            │
│                PM2: backend                                      │
│                                                                 │
│  Port 22220 ──► FRONTEND (Next.js Terminal)                    │
│                • Dashboard UI                                    │
│                • 18 trading pages                                │
│                • Proxy ke backend API                            │
│                PM2: terminal                                     │
│                                                                 │
│  Port 2217  ──► STATIC (ChinQue-Cripto PRO)                    │
│                • Branding & marketing                            │
│                • Landing page                                    │
│                PM2: chinque-cripto                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Service Status
| Service | Port | Status | PM2 |
|---------|------|--------|-----|
| Backend API | 11110 | ✅ Running | backend |
| Frontend Terminal | 22220 | ✅ Running | terminal |
| Static Server | 2217 | ✅ Running | chinque-cripto |
| Engine (old) | 22220 | ⏹️ Stopped | engine |

## Backend API Endpoints (Port 11110)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | System overview |
| GET | `/api/frontend/status` | Frontend status |
| POST | `/api/frontend/restart` | Restart frontend |
| POST | `/api/frontend/stop` | Stop frontend |
| POST | `/api/frontend/start` | Start frontend |

## Frontend Pages (Port 22220)
| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page |
| Wallet | `/dashboard/wallet` | Balance & deposits |
| Market | `/dashboard` | Live market data |
| Trade | `/dashboard/trade` | Order placement |
| AI Vault | `/dashboard/ai` | AI investment |
| Recurring | `/dashboard/recurring` | DCA plans |
| Staking | `/dashboard/staking` | Staking positions |
| History | `/dashboard/history` | Transaction history |
| Referral | `/dashboard/referral` | Referral program |
| Security | `/dashboard/security` | Security settings |
| Authenticator | `/dashboard/authenticator` | 2FA setup |
| Education | `/dashboard/education` | Learning resources |
| Support | `/dashboard/support` | Help center |
| Mobile App | `/dashboard/mobile-app` | Mobile download |

## Database
- **Type**: SQLite
- **File**: `apps/engine/data/ledger.db`
- **Tables**: 21 (users, accounts, balances, orders, fills, journal, dll)
- **Data**: 20 users, 409 balances, 12 orders

## Dev Credentials
- **Email**: chinque
- **Password**: admin1
- **Access**: http://187.127.178.20:22220/login

## Migration Notes
1. Port 22220 sebelumnya untuk Engine Backend → sekarang untuk Frontend
2. Port 22221 dihentikan → frontend pindah ke 22220
3. Port 11110 baru untuk Backend API orchestration
4. Engine backend dihentikan (bisa di-restart jika diperlukan)

---
Created: 2026-10-03
Last Updated: 2026-10-03
Status: PRODUCTION READY
