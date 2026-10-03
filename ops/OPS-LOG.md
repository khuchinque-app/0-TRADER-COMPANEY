## STATUS
Milestone: M2 (Ledger/Wallet) COMPLETE
Working on: M3 (Orders/Matching)
Deployed sha: 2a56215

## Services
- backend: port 11110, healthy
- terminal: port 22220, healthy
- engine: port 3001, standby (D1 decision)

## Endpoints Working
- /health → {"status":"ok"}
- /api/auth/login → JWT token
- /api/auth/me → user data
- /api/markets → simulated data
- /api/admin/integrity → {"ok":true}
- /api/admin/stats → users/orders count
- /api/wallet/balance → account balances
- /api/wallet/deposit → create deposit
- /api/wallet/history → journal history
- /api/wallet/faucet → free test funds (60s cooldown)

## Smoke Test
- scripts/smoke-test.py: 5/5 PASS
- POST /api/auth/login → 200 with JWT
- GET /api/auth/me → user data
- GET /api/markets → simulated data
- GET /api/wallet/balance → account balances
- Terminal proxy: 22220 → 11110

## Database
- Tables: users, accounts, balances, journal, journal_lines, orders, fills
- Integrity: ok:true
- Schema matches MASTER-PLAN requirements

## Automation
- Backup cron: daily 02:00 UTC
- PM2: services saved for auto-restart
- Logrotate: weekly rotation configured

## Next: M3 (Orders/Matching)
- Order endpoints: create, list, cancel
- Matching engine integration
- Portfolio calculation
- Trade history
