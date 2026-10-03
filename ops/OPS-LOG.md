## STATUS
Milestone: M3 (Orders) COMPLETE
Working on: M4 (Admin API) + M5 (Final Integration)
Deployed sha: db03fb7

## Services
- backend: port 11110, healthy
- terminal: port 22220, healthy

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
- /api/orders → create/list/cancel orders
- /api/portfolio → positions + PnL

## Database
- Tables: users, accounts, balances, journal, journal_lines, orders, fills
- Integrity: ok:true

## Smoke Test
- scripts/smoke-test.py: 5/5 PASS

## Automation
- Backup cron: daily 02:00 UTC
- PM2: services saved for auto-restart
- Logrotate: weekly rotation configured

## Next: M4 (Admin API) + M5 (Frontend + Final)
