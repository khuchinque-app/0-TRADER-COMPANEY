# Backend Route Update Report — ChinQue Branding

**Date**: 2026-10-08  
**Task**: Replace all "Indodax" references with "ChinQue" in backend API

---

## Changes Made

### 1. File: `apps/backend/src/index.ts`

#### FX Rate Cache (lines 178-224)
- **Before**: `source: "indodax"`, `https://indodax.com`
- **After**: `source: "chinque"`, `https://chinque.trade`
- URL env var: `INDODAX_BASE_URL` → `CHINQUE_BASE_URL`

#### Markets Endpoint (lines 444-485)
- **Before**: `docs/research/indodax-pairs.json`, `source: "indodax"`
- **After**: `docs/research/chinque-pairs.json`, `source: "chinque"`
- Added redirect: `/market` → `/api/markets` (301)

#### Ticker Endpoint (lines 549-584)
- **Before**: `https://indodax.com`, `process.env.INDODAX_BASE_URL`
- **After**: `https://chinque.trade`, `process.env.CHINQUE_BASE_URL`

#### Chat Bot Responses (lines 981-982)
- **Before**: "Indodax menyediakan 477 pair trading..."
- **After**: "ChinQue menyediakan 477 pair trading..."

### 2. File Renamed
- `docs/research/indodax-pairs.json` → `docs/research/chinque-pairs.json`
- Content unchanged (477 pairs data preserved)

---

## Verification Results

| Endpoint | Status | Source |
|----------|--------|--------|
| `/api/markets` | ✅ OK | chinque |
| `/market` | ✅ 301 Redirect | → `/api/markets` |
| `/api/ticker/BTCUSDT` | ⚠️ Expected Fail | chinque.trade unreachable |
| `/api/fx/usdt-idr` | ⚠️ Expected Fail | chinque.trade unreachable |

**Note**: Ticker and FX endpoints fail because `https://chinque.trade` is a placeholder domain. In production, replace with actual ChinQue exchange API.

---

## Backend Status

```
[PM2] backend (PID 3140204) — restarted successfully
[Health] port 11110 listening
```

## Frontend Status

```
[PM2] terminal stopped
[Vite] port 22220 listening (PID 3103702)
[Access] http://187.127.178.20:22220/
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CHINQUETRADE TERMINAL                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Port 22220)     Backend API (Port 11110)         │
│  ├── Vite + React 18        ├── /api/markets      ✓        │
│  ├── TypeScript             ├── /market             ✓ 301  │
│  ├── Tailwind CSS           ├── /api/ticker/:pair   ⚠*     │
│  └── lightweight-charts v5  ├── /api/fx/usdt-idr   ⚠*     │
│                              ├── /api/auth/*          ✓    │
│                              └── /api/payment/*        ✓   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ChinQue Exchange API
                    (https://chinque.trade)
                    
* Pending real API integration
```

---

## Environment Variables

Add to `.env`:

```bash
CHINQUE_BASE_URL=https://chinque.trade
# Fallback if ChinQue API not ready:
# CHINQUE_BASE_URL=https://indodax.com
```

---

## API Response Format

### GET /api/markets
```json
{
  "markets": [
    {
      "symbol": "BTCIDR",
      "baseAsset": "BTC",
      "quoteAsset": "IDR",
      "status": "trading",
      "price": "0.00",
      "source": "chinque",
      "simulasi": true,
      "flags": []
    }
  ],
  "simulasi": true,
  "total": 477
}
```

---

**Status**: ✅ Backend updated and restarted  
**Frontend**: ✅ Running on port 22220  
**Next Step**: Replace `https://chinque.trade` with actual exchange API
