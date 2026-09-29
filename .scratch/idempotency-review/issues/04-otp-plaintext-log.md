# OTP console-dev provider logs raw phone + raw code in plaintext

Status: resolved
Category: bug

Fixed 2026-09-26 — commit b864a8c (masked phone + sha256 fp; OTP_LOG_CODE=1 opt-in; hygiene tests).

`apps/engine/src/auth/service.ts:77` — `console.log('[OTP:console-dev] ' + phone + ' -> ' + code)` writes the FULL E.164 number and the live 6-digit OTP into server.log. `users.phone` in ledger.db is also stored unmasked (verified: hex-decoded column = full number). Discovered 2026-09-26 when a reviewer lane proved the previously reported "+628****7890 masking" was actually the agent toolchain's output redactor, not application behavior — the app has NO masking today.

Risk while SIMULASI: log files + any log shipper leak phone numbers and active codes (5-min TTL window). Before real WhatsApp provider lands, the seam must mask the phone and never log the code (or log only a hash).

Fix direction: mask phone at the display layer (`+628****7890` in app code), route OTP code only to the verifying in-memory store; add a test asserting server.log capture contains neither full number nor code.

Verified: CONFIRMED (codepoint dump of normalized E.164 + raw DB column read + live log line).
