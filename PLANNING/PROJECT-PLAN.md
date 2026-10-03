# Trading Company — Project Plan (3 Okt 2026)

## Status Arsitektur Saat Ini
- Port 22220: Backend Express + Login Page (running)
- Port 22221: Terminal Dashboard Next.js + STX CSS (running)
- Port 2217: ChinQue-Cripto Static (running)
- VPS: 187.127.178.20
- Dev: chinque / admin1
- DB: SQLite ledger.db (21 tables, 20 users, 409 balances)

## Backend Services (semua 200 OK)
| Service | Route | Status |
|---------|-------|--------|
| Auth | /api/auth/* | ✅ |
| Wallet | /api/wallet/* | ✅ |
| Market | /api/market/* | ✅ |
| Orders | /api/orders/* | ✅ |
| Fills | /api/fills/* | ✅ |
| Recurring | /api/recurring/* | ✅ |
| Addresses | /api/addresses/* | ✅ |
| History | /api/history/* | ✅ |
| Referral | /api/referral/* | ✅ |
| Security | /api/security/* | ✅ |
| 2FA | /api/2fa/* | ✅ |
| API Keys | /api/api-keys/* | ✅ |
| Education | /api/education/* | ✅ |
| Support | /api/support/* | ✅ |
| Mobile App | /api/mobile-app | ✅ |
| Payment (Duitku) | /api/payment/* | ✅ (sandbox) |

## Frontend Pages (Terminal 22221)
| Page | Route | Status |
|------|-------|--------|
| Home | / | ✅ |
| Wallet | /dashboard/wallet | ✅ |
| Market | /dashboard | ✅ |
| Trade | /dashboard/trade | ✅ |
| AI Vault | /dashboard/ai | ✅ |
| Recurring | /dashboard/recurring | ✅ |
| Staking | /dashboard/staking | ✅ |
| History | /dashboard/history | ✅ |
| Referral | /dashboard/referral | ✅ |
| Security | /dashboard/security | ✅ |
| Authenticator | /dashboard/authenticator | ✅ |
| Education | /dashboard/education | ✅ |
| Support | /dashboard/support | ✅ |
| Mobile App | /dashboard/mobile-app | ✅ |

## Yang Perlu Dikerjakan (Next Phase)
1. **Admin Panel** — UI untuk manage users, balances, orders
2. **Payment Production** — Switch Duitku dari sandbox ke production
3. **Redis Cache** — Untuk market data & session
4. **PostgreSQL Migration** — Dari SQLite ke PostgreSQL untuk production
5. **Nginx SSL** — HTTPS untuk semua port
6. **Monitoring** — PM2 + health checks
7. **Backup DB** — Auto backup ledger.db

## Tech Stack
- Backend: Express + TypeScript + SQLite
- Frontend: Next.js 14 + Tailwind CSS v4
- Auth: JWT + session
- Payment: Duitku (sandbox → production)
- Dev Tools: PM2, PM2 plus, Graphify

---
Created: 2026-10-03
Last Updated: 2026-10-03
