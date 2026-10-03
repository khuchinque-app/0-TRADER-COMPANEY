## STATUS
Milestone: M1 (Auth) COMPLETE — READY TO USE
Working on: M1 complete, M2-M5 pending owner review
Blocked: none
Deployed on VPS: bab4e12 (10 commits ahead of origin)
Open FAILs: none

## FINAL STATUS
- Backend (port 11110): online, all endpoints working
- Terminal (port 22220): online, proxy working
- Database: ledger.db with 21 users, 12 orders
- Auth: chinque@dev.local / TestTrader2026! works
- Smoke test: PASS (all 5 checks)
- Daily backup cron installed (2 AM)
- Docs: README.md, docs/API.md, docs/RUNBOOK.md, docs/HARDENING-TODO.md

## ENDPOINTS
- Health: GET http://localhost:11110/health -> 200 OK
- Login: POST http://localhost:11110/api/auth/login -> 200 with JWT
- Me: GET http://localhost:11110/api/auth/me -> user data
- Markets: GET http://localhost:11110/api/markets -> simulated data
- Signup: POST http://localhost:11110/api/auth/signup -> 201
- Terminal proxy: /api/* on port 22220 proxies to backend

## CONFIG
- All config in root .env
- Ports: 11110 (backend), 22220 (terminal)
- Database: apps/engine/data/ledger.db
- PM2 managed, auto-restart on boot

## NOTES
- Engine not started (D1 decision: backend is sole writer)
- Owner to do: reboot test, review hardening TODO, change credentials
