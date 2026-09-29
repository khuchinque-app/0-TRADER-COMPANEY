# GET /api/orders/:userId, /api/fills, /api/ledger expose other users' data without auth

Status: resolved
Category: bug

Fixed 2026-09-26 — commits 7c07e3f + 76fca2e (ownedBySession reads; reviewer APPROVE, seeded-fill tests).

`apps/engine/src/server/rest.ts:84,89,96,116` — these GETs have no mockAuth: even with AUTH_ENABLED=1 any client can enumerate other users' open orders, fills, balances, and journal rows; `/api/fills` with no param returns ALL recent fills. Same data class the idempotency-cache leak exposed, readable here with no key guesswork.

Related PLAN-TO-DO line 89-90 (auth middleware guards all /api routes except the public allowlist) — this ticket is a concrete slice of that item.

Fix direction: apply the auth seam + session-match guard (identity() pattern from wallet.ts) to per-userId reads; for /api/fills require a session and scope to the caller.

Verified: CONFIRMED.
