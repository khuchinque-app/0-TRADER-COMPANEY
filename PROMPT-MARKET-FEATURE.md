# PROMPT — Market Feature Development

**FOR:** All coding agents (scout, dev, executor)  
**PROJECT:** 0-TRADER-COMPANEY  
**BRANCH:** `feat/market-trade`  

---

## CONTEXT

You are working on the **Market feature** for ChinQueTrade — an Indonesian crypto trading platform. The market page shows 1900+ trading pairs from MEXC exchange, filtered and categorized for Indonesian users.

**URL:** http://187.127.178.20:22221/market  
**Status:** Basic implementation exists, needs improvements.

---

## YOUR TASK

Read the full protocol: `/home/khuchinque/0-TRADER-COMPANEY/MARKET-PROTOCOL.md`

Then implement ONE of these features (pick based on your role):

### Option A: Market Search & Filter (Frontend)
**File:** `apps/terminal/src/components/MarketFilters.tsx`

Create a search bar + category tabs component:
- Search input (debounced 300ms)
- Category tabs: All, Meme, DeFi, Gaming, Layer1, Layer2
- Active state styling (yellow accent)
- Pass filters to parent MarketPage

**Test:** `curl http://localhost:22221/market` — should show search bar

### Option B: Backend Market Router (API)
**File:** `apps/backend/src/routes/market.ts`

Create endpoint handlers:
```typescript
GET /api/market/available    // All pairs from MEXC
GET /api/market/search?q=BTC // Search pairs
GET /api/market/stats        // Total pairs, 24h volume
```

**Mount in:** `apps/backend/src/index.ts` (add one line)

**Test:** `curl http://localhost:11110/api/market/stats`

### Option C: Market Data Hook
**File:** `apps/terminal/src/hooks/useMarkets.ts`

Create custom hook:
```typescript
function useMarkets(filters: MarketFilters) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch from /api/mexc/markets
  // Apply filters (search, category, sort)
  // Return { markets, loading, error, refresh }
}
```

**Use in:** `MarketPage.tsx`

---

## CONSTRAINTS

✅ CAN modify:
- `apps/terminal/src/pages/MarketPage.tsx`
- `apps/terminal/src/components/*.tsx` (create new)
- `apps/backend/src/routes/market.ts` (create new)
- `apps/backend/src/index.ts` (add router mount only)

❌ CANNOT modify:
- TradePage.tsx, LandingPage.tsx, PortfolioPage.tsx
- Auth routes, admin routes, payment routes
- Database schema
- Package files

---

## ACCEPTANCE CRITERIA

After implementation:
1. `npm run build` passes in both apps/backend and apps/terminal
2. `pm2 restart backend && pm2 restart chinque-terminal` works
3. `curl http://localhost:11110/api/market/stats` returns JSON
4. Browser shows updated market page at http://187.127.178.20:22221/market

---

## REPORT FORMAT

```
[STATUS] Brief summary (2 sentences max)

[Bukti] 
- Command output showing success
- Screenshot path if applicable

[Butuh dariku] Any blockers or questions
```

---

**START NOW.**
