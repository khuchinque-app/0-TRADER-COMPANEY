# WS order/cancel handlers trust payload.userId (no auth seam)

Status: resolved
Category: bug

Fixed 2026-09-26 — commit 9a3713e (assertSelf on order/cancel vs handshake identity; guest mode exempt by design).

`apps/engine/src/server/ws.ts:272,285-287,320` — the WS 'order' and 'cancel' handlers call initializeDemoAccount/placeOrder/cancelOrder with `payload.userId` directly, with no mockAuth equivalent. With AUTH_ENABLED=1, money can still be moved as ANY userId over WS while REST requires a JWT. This undercuts the identity model the per-user idempotency cacheKey (orders.ts/quick.ts) relies on.

Found by the security review lane during the 2026-09-26 idempotency-cache sweep.

Fix direction: require the same JWT/session identity on the WS handshake (or first auth frame) and derive userId server-side, mirroring mockAuth.

Verified: CONFIRMED.
