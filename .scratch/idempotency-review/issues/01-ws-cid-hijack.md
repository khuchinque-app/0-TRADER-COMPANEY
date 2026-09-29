# WS replay buffer is cid-hijackable (cross-account data leak + session hijack)

Status: resolved
Category: bug

Fixed 2026-09-26 — commit 9a3713e (WS handshake identity + cid namespacing; ws-auth-identity tests).

`apps/engine/src/server/ws.ts:56,80,115-127` — `replayBuffers` is a Map keyed by the attacker-chosen `?cid=` URL query param, with no authentication anywhere in ws.ts. Connecting to `ws://.../ws?cid=<victim-cid>&lastSeq=0` closes the victim's live socket (ws.ts:93-94) and replays the victim's buffered order/fill envelopes and 'resume' frame (ws.ts:115-127, 340-355).

Found by the security review lane during the 2026-09-26 idempotency-cache sweep (that fix protected REST; this is the same leak class on the WS transport).

Fix direction: bind cid to an authenticated session (JWT / session cookie) instead of trusting the query param.

Verified: CONFIRMED (code read: ws.ts full file, no auth import).
