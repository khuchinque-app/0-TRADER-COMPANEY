# LOG-exchange

## Defaults applied (grill timeout, 9 Okt 2026)
1. Stop pm2 `chinque-terminal` preview, port 22221 handed to exchange app
2. Stack: Vite+React SPA + small Express SSR shell server on 22221
3. `/api/market/*` added inside existing `apps/backend` (port 11110)
4. MEXC = raw REST wrapper, no SDK, no keys
5. Tradable shortlist per spec: BTC ETH SOL BNB XRP LINK (+AAVE fallback)
6. gen-routes run locally on VPS (this machine has network)
7. UI: Bahasa Indonesia default + EN toggle
8. Order fill: market walks MEXC depth, limit rests in our book; if engine integration fragile → view-only, BLOCKED logged
9. Old Vite app source kept, nothing deleted
10. PM2 name `exchange`, ecosystem.config.js updated, `pm2 save`

---

## Milestone log
M6 | DONE | gen-routes.mjs + routes.json (478 pairs, live fetch) + packages/indodax-routes | next M7
M7 | DONE | packages/mexc-client (REST, no keys) + apps/backend/src/market.ts (/api/market/*, cache, breaker) — 363/478 LIVE | next M8
M8 | DONE | apps/exchange SPA: /, /market (478 rows, search/sort/filters), /market/{PAIR} live chart+book+tape, NO_FEED + 404 states | next M9
M9 | DONE | /market/depth_chart/{PAIR} cumulative SVG, /chart/{PAIR} fullscreen candles, mock order form wired to backend /api/orders + /akun/{masuk,dompet} | next M10
M10 | DONE | scripts/smoke-exchange.sh 13/13 PASS exit 0; PM2 exchange saved on 22221; RUNBOOK-exchange.md + planning/HANDOFF.md; chinque-terminal stopped (source kept) | next: investor demo
R+ | DONE | fill engine (MEXC depth walk → orders/fills/balances/journal, tx wrapper), /api/market/orders + myorders, /akun/order page, proxy auth fix, .env A6 keys | code-review fixes R1/R4/R5/R7 verified; smoke 13/13 exit 0; double-entry 4/4
R++ | DONE | full MEXC universe (1502 coins) via /api/market/universe + /trade/{COIN} pages; limit orders: funds-locked place, 5s matcher (MEXC bookTicker cross), settle to ledger double-entry, cancel/unlock; /trade universe table UI | verified: limit sell@1 auto-filled, cancel restores funds, smoke 13/13, public 200
R+T | DONE | dark/light theme: [data-theme] CSS var palettes (light #ffffff/#111418, tuned up/down+panel/line), no-FOUC bootstrap script, 🌙/☀️ toggle in nav persisted (xs_theme) | contrast 18.5:1 light / 16.4:1 dark; smoke 13/13
