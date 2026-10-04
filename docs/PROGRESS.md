# Progress Log — 4 Oktober 2026

## L1: CONTEXT.md Updated
- Fixed Project Status table (engine/smoke verified)
- Added "Indodax reference data (4 Oct 2026)" section with counts:
  - Total pairs: 477
  - IDR pairs: 465
  - USDT pairs: 12
- Added "Locked facts & decisions — Indodax" section
- Q7 stays locked: IDR display rate from Indodax USDT/IDR ticker
- New term: `IDR display rate`

## L2: Decisions Documented
- Q7 locked in CONTEXT.md
- IDR display rate = Indodax USDT/IDR ticker
- Ledger asset stays USDT, untouched by IDR display

## L3: Code Changes
- Added `IndodaxFxProvider` class in `apps/engine/src/feed/indodax.ts`
  - Fetches from `https://api.indodax.com/ticker`
  - Caches with TTL=10min, stale max=30min
  - Throttles to max 1 req/sec
  - On failure: serves last good value with `stale:true`
  - Falls back to hardcoded 15000 if no cache
- Added `GET /api/fx/usdt-idr` endpoint in `apps/engine/src/server/rest.ts`
  - Returns `{ rate, source, ts, stale }`
- Updated `FxToggle.tsx` to show "Reference rate: Indodax USDT/IDR, not a real venue" label
- Updated config constants in `packages/shared/src/config.ts`
- Added response type in `packages/shared/src/domain.ts`

## L4: Tests Created
- `apps/engine/test/feed/indodax-fx.test.ts` — unit tests for IndodaxFxProvider
  - Valid rate fetch
  - HTTP 429 handling
  - HTTP 5xx handling
  - Bad JSON handling
  - Cache TTL behavior
  - Stale serving
- `apps/engine/test/feed/indodax-catalog.test.ts` — catalog validation
  - All shortlist assets have IDR pairs
  - All shortlist assets have USDT pairs
  - Count verification (477 total, 12 USDT, 465 IDR)

## L5: Docs Updated
- `.env.example` — added INDODAX_BASE_URL, FX_SOURCE, FX_TTL_MS, FX_STALE_MAX_MS
- `docs/API.md` — documented /api/fx and /api/fx/usdt-idr endpoints

## Pending
- L6: verify.sh green → push
