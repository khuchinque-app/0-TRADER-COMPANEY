# HANDOFF — Exchange :22221 (9 Okt 2026)

## Status: M6–M10 COMPLETE — smoke 13/13 PASS (exit 0)

### What was built
- `scripts/gen-routes.mjs` -> `packages/indodax-routes/routes.json` (478 pairs, fetched 2026-10-09T03:00Z, not stale)
- `packages/mexc-client` — MEXC public REST wrapper (no SDK, no keys)
- `apps/backend/src/market.ts` — `/api/market/health|pairs|tickers|ticker|depth|trades|klines` + 2.5s/1s/kline-TTL caches + circuit breaker; 363/478 pairs LIVE on MEXC
- `apps/exchange` — Vite+React SPA + Express mirror server on :22221:
  `/`, `/market`, `/market/{PAIR}` (candle chart, book, tape, mock order form),
  `/market/depth_chart/{PAIR}`, `/chart/{PAIR}`, `/trade_api`, `/affiliate`,
  `/privacy-policy`, `/help/pengguna-baru`, `/help/ketentuan`,
  neutral paths `/akun/{masuk,daftar,dompet}`
- Unlisted slug -> real 404. NO_FEED -> 200 + "no live feed" panel.
- Brand: ChinQue Exchange; banner SIMULASI server-rendered on every page; noindex; robots.txt Disallow /
- PM2: `exchange` (saved), old `chinque-terminal` preview stopped to free 22221 (source kept)

### User answers baked in
- ALL pairs clickable/tradable (mock fills via backend /api/orders)
- ID default + EN toggle; functions mock-OK for investor demo

### Known limits
- Every manifest static route 200 (spec does not define homepage sitemap children; union static = 7 locs, all 200)
- Fill engine: mock fill posts order row; real wallet debit is backend `orders` current behavior
- `USDT_IDR_RATE` fallback 16250, indicative-labeled

### Next (optional)
- cron `gen-routes.mjs` weekly
- wire wizard fill amount from MEXC depth (currently preview snapshot)
