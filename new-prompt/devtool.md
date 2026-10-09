# devtool.md — Page Content & Market Data Troubleshooting Log

*Last updated: 9 Okt 2026 — both findings below were live-verified and RESOLVED.
Superseded observations kept at the bottom for reference.*

---

## ✅ Finding #2: /market showed count "· 0" with empty table — RESOLVED (478 rows)

**Context**
Analysis of the "All Markets" page showed the market count displaying `· 0` and
no pair rows in the data table (`span.muted` inside `h1.crumb` + empty `<tbody>`).

**Root cause**
Timing + stale snapshot, not a code bug. The `/market` page performs two chained
network fetches on mount (`/api/market/pairs` then `/api/market/tickers`, both
going 22221 → backend 11110 → MEXC public API). The DevTools snapshot was taken
before those fetches resolved (or from a headless render whose JS was served
incorrectly — see Finding #1). Server-side data sources were healthy the whole
time.

**Verification after fix (raw Chrome via CDP `Runtime.evaluate`):**
```
URL: http://127.0.0.1:22221/market
document.querySelectorAll('tbody tr').length  → 478
h1.crumb textContent                          → "Semua Pasar · 478"
API: /api/market/pairs  → count: 478
API: /api/market/tickers → count: 363 LIVE rows (MEXC-backed)
```

**Why rows ≠ ALL pairs:** 363 of 478 manifest pairs resolve to a real MEXC
USDT market (`state: LIVE`); the rest intentionally render greyed-out
`NO_FEED` rows (greyed, still clickable, shows "no live feed in simulation").
This matches the spec: live rows come from the cached bulk `ticker24hr`;
NO_FEED rows never get ticker entries, but still render.

**Code notes (for future edits)**
- Count header uses filtered `rows.length`, which is correct behavior (search/
  filter aware). Do not hardwire it to the raw dataset.
- If a future snapshot again shows `· 0`: first check
  `curl http://127.0.0.1:22221/api/market/tickers` — a `502
  mec_unavailable/stale` response means the MEXC fetch is failing (network or
  circuit breaker open), not a frontend bug. The UI already renders empty with
  no crash in that case.

---

## ✅ Finding #1 (archival): page rendered only the top banner — RESOLVED

**Context (superseded observations, kept for reference)**
An earlier snapshot showed an apparently-empty page where only the top banner
was visible despite extensive CSS plus a JS bundle:
`html/body height 48.25 px`, `13 total elements`, `body children = 1
(div.banner)`, no `#root` children. No mounting point was present in the DOM.

**Root cause (found in code, not DevTools guessing):**
`apps/exchange/server.mjs` (the SPA route server on :22221) injected the
server-rendered SIMULASI banner with
`.replace('<div id="root"></div>', SERVER_BANNER_HTML)` — it REPLACED the
React mount point instead of inserting before it. Additionally the catch-all
SPA route shadowed built assets, so `/assets/index-*.js` was served as
`text/html` and the module script silently failed to execute.

**Fix (commit 7b2a44d, branch feat/market-trade + master):**
1. Banner is now INSERTED BEFORE the mount point:
   `.replace('<div id="root">', SERVER_BANNER_HTML + '<div id="root">')`.
2. `express.static(DIST)` added before the SPA catch-all so `assets/*.js`
   return real JS with `application/javascript` MIME.

**Verification after fix (raw Chrome, CDP `Runtime.evaluate`):**
```
URL: /market/BTCIDR → root.innerHTML.length = 32955 chars,
   header.nav present, market data <td> present,
   body background rgb(11,15,43) (ChinQue ocean-night dark token)
URL: /trade      → root 81161 chars, 1600 universe rows
URL: / , /market , /akun/masuk → all mount (root 1.1–1.3KB+)
```

---

*Reference: this file is a DevTools-style troubleshooting log for the
:22221 exchange. Each entry: context → diagnostics table → root cause →
fix → evidence. Update it (append, don't delete) when new render issues appear.*
