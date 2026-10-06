# Progress Log

## 6 Oktober 2026

### T09 — COLOR_CONVENTION flag (green-up default)
- ✅ Single env flag `NEXT_PUBLIC_COLOR_CONVENTION` ('green-up' | 'red-up', default 'green-up') wired in
  `apps/terminal/next.config.js` (public runtime config) and applied as `data-color-convention` on `<html>` in `layout.tsx`.
- ✅ CSS variables for both modes in `globals.css`: canonical `--color-up`/`--color-down` (+dim/glow) in `:root`
  (green-up) and swapped in `[data-color-convention='red-up']`; legacy consumer tokens
  (`--gain/--loss`, `--pos/--neg`, `--stx-profit/--stx-loss`, dims) mapped onto the canonical pair so price, book,
  tape, chart and P&L flip together. Fixed the previous agent's broken `:root` structure (orphaned port-2217 tokens)
  and the literal `--gain/--loss` redefinitions that would have overridden the convention.
- ✅ Trade page wired: book depth rows (asks=down color, bids=up color), market tape (buy=up color, sell=down color),
  header 24h change colored by direction; chart candles already read `--gain/--loss` via `cssVar()`.
- ✅ Decision recorded in CONTEXT.md (Locked facts) — green-up default, flag to flip; ASSUMPTIONS.md T09 entry.
- ✅ `autopilot/verify/T09.sh` — 8/8 PASS (flag referenced, layout/next.config default, CSS vars both modes, trade page
  200 + SSR `data-color-convention="green-up"`).

---

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
