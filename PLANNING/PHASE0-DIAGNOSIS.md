# Phase 0 Diagnosis Report — Login Failure

## Symptom
**User:** http://187.127.178.20:22220/login with chinque@dev.local / TestTrader2026! shows "Login failed"

---

## Evidence Table

| Check | Result | Status |
|-------|--------|--------|
| Backend Health (port 11110) | ✅ 200 OK | Healthy |
| Backend Auth Route (/api/auth/login) | ❌ 404 Not Found | **ROOT CAUSE** |
| Frontend Login Page | ✅ Served at :22220 | Working |
| Frontend API Call | `/api/auth/login` → proxy to :11110 | Routing OK |
| Database User chinque@dev.local | ✅ EXISTS, status: active | Data OK |
| Terminal .next Build | ⚠️ Present but PM2 reports errors | Build Issue |
| PM2 Terminal Process | 🔄 Crashing loop (49 restarts) | Unstable |

---

## Confirmed Root Causes

### 1. CRITICAL: Backend Lacks Auth Routes
**File:** `apps/backend/src/index.ts`

The new backend at port 11110 does NOT implement authentication endpoints:
- ❌ No `/api/auth/login`
- ❌ No `/api/auth/register`
- ❌ No `/api/auth/me`

Auth routes exist in `apps/engine/src/server/auth.ts` but were NOT migrated to the new backend.

### 2. WARNING: Terminal Production Build Issue
**PM2 Log Error:**
```
Error: Could not find a production build in the '.next' directory.
Try building your app with 'next build' before starting the production server.
```

**Status:** The `.next` directory exists but PM2 reports it cannot find valid production builds. This causes the terminal to crash-restart in a loop (49 restarts recorded).

### 3. INFO: Login Form Calls Relative Path
**File:** `apps/terminal/app/login/page.tsx`

```typescript
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include',
});
```

This is correct — it uses relative path which gets proxied by Next.js rewrites to `http://localhost:11110/api/auth/login`.

---

## Database Verification

```sql
sqlite> SELECT id, email, status FROM users WHERE email = 'chinque@dev.local';
-- Result: 01acf9fe69a32f91|chinque@dev.local|active
```

✅ User exists and is active in database.

---

## Traffic Flow Analysis

```
Browser → :22220/login (page load) ✅
         → :22220/api/auth/login (form submit)
              → Next.js rewrite → :11110/api/auth/login
                   → Backend returns 404 ❌
```

---

## PM2 Environment Variables

| Process | Variable | Value |
|---------|----------|-------|
| backend | PORT | 11110 |
| backend | NODE_ENV | production |
| terminal | PORT | 22220 |
| terminal | NODE_ENV | production |
| terminal | NEXT_PUBLIC_ENGINE_URL | http://localhost:11110 |

**Missing:**
- No JWT_SECRET in either process
- No DB_PATH explicitly set (uses default in code)
- No CORS_ORIGIN configured

---

## Recommended Fixes (Phase 1)

1. **Add auth routes to backend** (`apps/backend/src/routes/auth.ts`)
   - Implement `/api/auth/login`
   - Implement `/api/auth/register`
   - Implement `/api/auth/me`
   - Use existing engine auth service or duplicate logic

2. **Fix terminal production build**
   - Delete `.next` directory
   - Rebuild: `npm run build`
   - Restart PM2

3. **Add missing environment variables**
   - JWT_SECRET
   - DB_PATH (explicit)
   - CORS_ORIGIN

---

## Files to Modify

| File | Action |
|------|--------|
| `apps/backend/src/routes/auth.ts` | CREATE new auth route handler |
| `apps/backend/src/index.ts` | ADD import and mount auth router |
| `apps/backend/package.json` | VERIFY dependencies (bcrypt, jsonwebtoken) |
| `apps/terminal/pm2.config.json` | ADD env vars if needed |
| `ecosystem.config.js` (root) | Consider unified config |

---

**Diagnosis Complete.** Awaiting Phase 1 implementation.

[DONE VPS phase0]
