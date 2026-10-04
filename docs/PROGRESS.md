# Progress Log

## 4 Oktober 2026

### Indodax Research & Integration
- ✅ Added FX rate endpoint (`GET /api/fx/usdt-idr`)
- ✅ Fetches rate from Indodax USDT/IDR ticker
- ✅ Cache with TTL (60s) and stale window (5min)
- ✅ Environment variables: INDODAX_BASE_URL, FX_TTL_MS, FX_STALE_MAX_MS
- ✅ TypeScript tests added for adapter

### Documentation Updated
- ✅ `docs/API.md` — added FX endpoint docs
- ✅ `CONTEXT.md` — updated project status and added Indodax research section
- ✅ `structure.md` — added Indodax research section with corrected counts

### Test Results
- ✅ All unit tests passing (8/8)
- ⚠️ Smoke test: 1/5 PASS (POST /api/auth/login failing — credentials issue)

---

## Pending Tasks
- [ ] Fix auth/login smoke test failure
- [ ] Add IDR display toggle in terminal frontend
- [ ] Wire terminal to use `/api/fx/usdt-idr` rate

*Last updated: 4 Oktober 2026*
