# MARKET FOLDER PROTOCOL — Trading Company Agents

**STATUS:** ACTIVE  
**PROJECT:** 0-TRADER-COMPANEY  
**VERSION:** 1.0  
**DATE:** 2026-10-09  

---

## 🎯 SCOPE

This protocol defines the **exact boundaries** for all coding agents working on the Market feature. Agents MUST stay within these limits.

---

## 📁 FILES AGENTS CAN MODIFY

### Frontend (terminal)
```
apps/terminal/src/pages/MarketPage.tsx        # Main market listing
apps/terminal/src/components/MarketList.tsx   # Market list component (if exists)
apps/terminal/src/data/marketsFull.ts         # Static market data fallback
apps/terminal/src/types/market.ts             # TypeScript types for markets
```

### Backend (API)
```
apps/backend/src/routes/market.ts             # Market API router (CREATE THIS)
apps/backend/src/index.ts                     # Only add: app.use('/api/market', marketRouter)
```

### Config
```
apps/backend/.env                             # Add: MEXC_API_KEY (optional)
```

---

## 🚫 FILES AGENTS MUST NOT TOUCH

- `apps/terminal/src/pages/TradePage.tsx`
- `apps/terminal/src/pages/LandingPage.tsx`
- `apps/terminal/src/pages/PortfolioPage.tsx`
- `apps/terminal/src/App.tsx` (route definitions stay unchanged)
- `apps/backend/src/routes/auth/*`
- `apps/backend/src/routes/admin.ts`
- `apps/backend/src/routes/payment.ts`
- `apps/backend/src/routes/agent.ts`
- Any database schema files
- `package.json`, `tsconfig.json`, `vite.config.ts`

---

## 🔌 ENDPOINTS AGENTS CAN USE/MODIFY

### Read-Only Endpoints (Safe to Call)
```http
GET /api/markets                    # 7 IDR pairs with live prices
GET /api/mexc/markets               # 1900+ pairs from MEXC (proxied)
GET /api/ticker/:pair               # Single pair ticker (e.g., BTCIDR)
GET /api/fx/usdt-idr                # USD/IDR exchange rate
GET /api/health                     # Health check
```

### Write Endpoints (Do NOT Modify)
```http
POST /api/auth/signup
POST /api/auth/login
POST /api/orders
POST /api/wallet/deposit
```

---

## 📋 MARKET PAGE REQUIREMENTS

### Current Implementation
- **Path:** `/market` (rendered by `MarketPage.tsx`)
- **Data Source:** Backend proxy `/api/mexc/markets` → MEXC API
- **Filter:** USDT pairs only, volume > 1000
- **Sort:** By volume (descending)
- **Category:** Auto-categorized (meme/defi/gaming/layer1/layer2)

### Required Features
1. ✅ Search by symbol/name
2. ✅ Category filter tabs
3. ✅ Sort by volume/change/name
4. ✅ IDR/USD toggle (converts prices using FX rate)
5. ✅ Pagination (50 items per page)
6. ✅ Favorites/starred pairs
7. ✅ Loading state with skeleton
8. ❌ ERROR HANDLING: Show error banner if API fails

### UI Components Needed
```typescript
// Create these files if missing:
apps/terminal/src/components/MarketCard.tsx      // Individual market row
apps/terminal/src/components/MarketFilters.tsx   // Search + category tabs
apps/terminal/src/components/MarketTable.tsx     // Paginated table
apps/terminal/src/hooks/useMarkets.ts            // Data fetching hook
```

---

## 🔧 BACKEND MARKET ROUTER

### File: `apps/backend/src/routes/market.ts`
```typescript
import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/market/available    - List all available pairs from MEXC
// GET /api/market/search?q=X    - Search pairs
// GET /api/market/category/:cat - Filter by category
// GET /api/market/stats         - Market statistics

export function createMarketRouter() {
  return router;
}
```

### Mount in index.ts
```typescript
import { createMarketRouter } from './routes/market';
app.use('/api/market', createMarketRouter());
```

---

## 🌐 API PROXY RULES

### MEXC API Proxy (Existing)
```typescript
// apps/backend/src/index.ts (already exists)
app.get("/api/mexc/markets", async (_req, res) => {
  const response = await fetch("https://api.mexc.com/api/v3/ticker/24hr", {
    signal: AbortSignal.timeout(10000)
  });
  res.json(await response.json());
});
```

### Binance API (For IDR pairs)
```typescript
// Use for: /api/markets, /api/ticker/:pair, /api/fx/usdt-idr
// These are ALREADY IMPLEMENTED - DO NOT REWRITE
```

---

## 🎨 DESIGN SYSTEM

### Colors (Vice City Neon)
```css
--color-sunset-pink: #FF5CA8;
--color-vice-cyan: #00F0FF;
--color-neon-purple: #BC6CFF;
--color-miami-peach: #FFB86B;
--color-ocean-night: #0B0F2B;
```

### Typography
- Font: Inter or system-ui
- Size: 14px base, 12px small, 16px large
- Weight: 400 regular, 600 semibold, 700 bold

### Spacing
- Gap: 16px standard, 8px small
- Padding: 24px container, 16px card

---

## ✅ VALIDATION CHECKLIST

Before submitting work, verify:
- [ ] No changes to non-market files
- [ ] All new components have TypeScript types
- [ ] API calls use existing backend endpoints (no direct MEXC/Binance calls from frontend)
- [ ] Error states handled (loading, empty, error)
- [ ] Mobile responsive (stack on small screens)
- [ ] No hardcoded prices (use API data)
- [ ] IDR conversion uses `/api/fx/usdt-idr` rate

---

## 🚀 DEPLOYMENT

### Backend
```bash
cd apps/backend
npm run build
pm2 restart backend
```

### Frontend
```bash
cd apps/terminal
npm run build
pm2 restart chinque-terminal
```

### Verify
```bash
curl http://localhost:11110/api/mexc/markets | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin))} markets')"
curl http://localhost:22221/market  # Should show 200 OK
```

---

## 📝 GIT WORKFLOW

```bash
# Branch naming
feat/market-<feature-name>

# Commit format
fix: market page search not filtering correctly
feat: add market category tabs
docs: update market API endpoint

# NEVER
fix: update everything  # ❌ Too vague
```

---

## 🆘 TROUBLESHOOTING

### Blank Market Page
- Check browser console for CORS errors
- Verify `/api/mexc/markets` returns 200
- Check Network tab for failed JS bundles

### API Returns Empty
- Verify MEXC API is reachable: `curl https://api.mexc.com/api/v3/ticker/24hr`
- Check backend logs: `pm2 logs backend --lines 50`

### Price Shows $0.00
- Ensure `/api/ticker/:pair` works: `curl http://localhost:11110/api/ticker/BTCIDR`
- Check if pair exists in Binance

---

**END OF PROTOCOL**
