# 0-TRADER-COMPANEY Runbook

## Quick Start
```bash
cd /home/khuchinque/0-TRADER-COMPANEY
pm2 start backend terminal engine
```

## Stop Services
```bash
pm2 stop backend terminal engine
```

## Restart After Code Changes
```bash
git pull
pm2 reload backend terminal
```

## Change Port
Edit `.env` and restart:
```bash
PORT=11110  # backend
TERMINAL_PORT=22220  # frontend
pm2 restart backend terminal
```

## Change Password
Edit `.env`:
```bash
SEED_PASSWORD=NewPassword123!
```
Then re-seed:
```bash
cd apps/backend && npm run seed
```

## Database Backup
```bash
cp apps/engine/data/ledger.db apps/engine/data/ledger.db.backup.$(date +%Y%m%d_%H%M%S)
```

## Restore Backup
```bash
cp apps/engine/data/ledger.db.backup.XXXXXX apps/engine/data/ledger.db
pm2 restart backend
```

## Smoke Test
```bash
bash scripts/smoke.sh
# or
python3 scripts/smoke-test.py
```

## SQL Diagnostics
```bash
python3 fix_sql.py
```

## Admin Credentials
- Email: chinque@dev.local
- Password: TestTrader2026! (change in .env)

## URLs
- Backend API: http://187.127.178.20:11110
- Terminal UI: http://187.127.178.20:22220
- Health: http://localhost:11110/health

## Logs
```bash
pm2 logs backend --lines 50
pm2 logs terminal --lines 50
```
