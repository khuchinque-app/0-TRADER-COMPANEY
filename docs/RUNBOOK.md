# Runbook

## Services

| Service | Port | PM2 Name | Status |
|---------|------|----------|--------|
| Backend | 11110 | backend | online |
| Terminal | 22220 | terminal | online |

## Common Commands

### Check Status
```bash
pm2 status
```

### Restart Backend
```bash
pm2 restart backend
```

### View Logs
```bash
pm2 logs backend --lines 50
pm2 logs terminal --lines 50
```

### Save Configuration
```bash
pm2 save
```

### Start on Boot
```bash
pm2 startup
pm2 save
```

## Deploy

### From Source
```bash
cd ~/0-TRADER-COMPANEY
git pull
cd apps/backend && npm run build && cd ../..
pm2 restart backend
pm2 save
```

### Smoke Test
```bash
bash scripts/smoke.sh
```

## Environment

All configuration is in `.env` at the project root:
- `PORT_BACKEND=11110`
- `DB_PATH=/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db`
- `JWT_SECRET=dev-jwt-secret-change-in-production`
- `MARKETS=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT`

## Database

SQLite database at `apps/engine/data/ledger.db`

### Backup
```bash
sqlite3 apps/engine/data/ledger.db ".backup /tmp/ledger.db.backup"
```

### Restore
```bash
cp /tmp/ledger.db.backup apps/engine/data/ledger.db
```

## Troubleshooting

### Backend wont start
