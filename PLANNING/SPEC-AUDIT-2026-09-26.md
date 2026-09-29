# Spec-audit 2026-09-26 — TASK.md deliverables 2 & 3

Produced by the swarm spec-audit lane (read-only, evidence = file:line). PLAN-TO-DO.md was extended the same day by the code-reviewer lane (lines 101-152).

## 1. Route map: spec (ENDGOAL-PROJECT section C/D) vs repo reality

| Route (spec line) | Exists? | Matches spec? | Delta |
|---|---|---|---|
| /api/market/* (Marketplace) | yes | partial | GET /api/market/:pair (rest.ts:59) + GET /api/tickers (rest.ts:42); allowlist name /api/market/ticker has no exact route |
| /api/orders/* (Marketplace) | yes | partial | POST /api/orders (orders.ts:35), GET /api/orders/:userId (rest.ts:84) — userId in path/body, spec implies session-scoped |
| /api/fills (Marketplace) | yes | partial | GET /api/fills/:userId? (rest.ts:89) — optional param instead of session scope |
| /ws (Marketplace) | yes | yes | ws.ts:50 |
| /api/wallet/* (Wallet) | yes | partial | GET/POST /api/wallet/:userId[/deposit,/withdraw] (wallet.ts:73,92,117) — :userId in path; session cross-check only when AUTH_ENABLED=1 (wallet.ts:47-54) |
| /api/quick/* (Quick Buy/Sell) | yes | yes | quick.ts:39,57 |
| /api/recurring/* | no | no | placeholder page only |
| /api/staking/* | no | no | placeholder only; /api/staking/subscribe absent |
| /api/2fa/* | no | no | zero TOTP code in engine (grep clean) |
| /api/support/* | no | no | absent |
| /api/content/* | no | no | absent |
| /api/app/* + /download | no | no | absent, no /download page |
| /api/education/* | no | no | absent |
| /api/ai/* | no | no | absent; /api/ai/subscribe absent |
| /api/me, /api/me/preferences, /api/me/avatar | no | no | closest = GET /api/auth/me (auth-routes.ts:206); PATCH preferences absent |
| /api/security/* | no | no | absent |
| /api/addresses/* + withdraw-whitelist | no | no | absent |
| /api/api-keys/* | no | no | absent |
| /api/history/* | no | partial | adjacent reads exist (orders/:userId, fills/:userId?, ledger journal); no unified family, no tx/deposits/withdrawals/pnl/export |
| /api/referral/* | no | no | absent; /api/referral/claim absent |
| /api/auth/logout, /logout-all | yes | yes | auth-routes.ts:203-204 |
| Extra (not in spec): /api/auth/{signup,otp/*,login,refresh}, /api/ledger/:userId[/journal], /api/fx, /health | yes | n/a | matches spec section A journey |

Terminal pages today: landing, /login, /signup, /dashboard/{marketplace,quick,wallet,[section]}. Nav items 4-11 render the [section] placeholder, not dead links.

## 2. Edge rules (section D) status

| Rule | Status | Evidence |
|---|---|---|
| Auth middleware all /api/* + allowlist | 0% as a mechanism | opt-in mockAuth on 4 money POSTs only; all GETs unguarded; mockAuth no-ops at default AUTH_ENABLED=0 (auth.ts:18,42-45) |
| Idempotency-Key on 10 money/security POSTs | 4/10 exist AND enforce | orders.ts:36-42, quick.ts:58-64, wallet.ts:56-63 enforced; /api/auth/logout* exists WITHOUT enforcement; other 5 families absent. Stores: in-memory Maps (lost on restart, documented) vs wallet's restart-safe SQLite entry ids |
| 2FA step-up | NOT IMPLEMENTED | no TOTP/step-up code; all 6 target actions live on missing routes |
| Rate limit per-user + per-IP on auth/order/withdraw | PARTIAL | IP-only bucket on /api/auth (auth-routes.ts:59-94); zero limiting on order/withdraw |
| SIMULASI badge server-side | largely done | simulasi:true + X-Simulated/X-Simulasi on money routes; gaps: GET /api/ledger/:userId, GET /api/orders/:userId unbadged; hardcoded, not keyed to paper-mode flag |
| Audit row + ray_id (auth/order/security/ledger) | PARTIAL | auth fully audited w/ ray lineage (auth-routes.ts:116-119 mints; service.ts writes); ledger rows ray_id=null in guest mode (index.ts:108-113); ORDER events write NO audit row (orders.ts/quick.ts) |

## 3. Conflicts vs existing repo docs (LISTED, not reconciled, per TASK.md)

1. Visual ref: CONTEXT.md locks Bitget 3-pane terminal; ENDGOAL-PROJECT is an Indodax-style 11-vertical nav (~8 verticals beyond locked scope).
2. Identity-in-URL (/api/wallet/:userId) vs spec session-scoped naming (/api/wallet/*); guest mode trusts body/path userId outright.
3. Guest default (CONTEXT Q8, AUTH_ENABLED=0) vs spec A journey (signup→OTP→JWT→/dashboard) and D's auth-on-everything.
4. Spec's 12 backend services vs single Express process (index.ts:87-123).
5. Rung naming: spec D ties badge to "Rung 1 paper mode"; CONTEXT ladder calls current build Rung 0 — badge hardcoded true.
6. /api/me (spec) vs /api/auth/me (implemented) path family.

## 4. Corrections applied to the coding agent's draft map
- /ws was missing from draft enumeration (registered, ws.ts:50).
- Draft's 15-family MISSING list confirmed correct.
- /api/me and /api/history deltas are naming/family, not total capability loss (see table).
- /api/auth/logout does NOT enforce Idempotency-Key despite spec D listing it.
