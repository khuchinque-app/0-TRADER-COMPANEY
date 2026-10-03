## STATUS
Milestone: M1 (Auth) COMPLETE — READY TO USE
Working on: None — waiting for owner review
Deployed sha: 53a5da7

## Services
- backend: port 11110, healthy
- terminal: port 22220, healthy

## Endpoints
- /health → {"status":"ok"}
- /api/auth/login → JWT token
- /api/auth/me → user data
- /api/markets → simulated data
- /api/admin/integrity → {"ok":true}
- /api/admin/stats → users/orders count

## Automation
- Backup cron: daily 02:00 UTC
- PM2: services saved for auto-restart
- Smoke test: scripts/smoke-test.py (5/5 PASS)

## Known limitations
- Wallet/assets tables not present (uses accounts/balances)
- Engine not started (D1 decision)
- Dev credentials not hardened (see docs/HARDENING-TODO.md)

## Commits
53a5da7 feat: add Python smoke test script
81c4c85 fix: use single quotes for JSON in smoke test
79759c2 fix: properly escape JSON in smoke test
4b0aad6 fix: correct smoke test token extraction
d6fbff9 fix: use correct table names in integrity check (accounts, balances)
