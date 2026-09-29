# Data Feasibility — Public Market-Data Endpoints (Integration Checklist)

> Reference-data source for the Rung-0 paper-trading venue. All feeds below are **public market
> data — reference only, not a real venue**. No API keys required anywhere in this document.
> Verified live from this machine on **2026-09-23** (curl/HTTP + raw-socket WebSocket probes,
> 10s timeouts). Every endpoint listed returned HTTP 200 or a clean WS handshake with data.

## 1. Verification summary

| Check | Result (2026-09-23, this machine) |
|---|---|
| `api.binance.com` ping / time | 200, 360–595 ms |
| `data-api.binance.vision` ping / klines | 200, 580–759 ms |
| `api.bybit.com/v5` time / kline / tickers / orderbook | 200, 361–469 ms |
| WS `stream.binance.com:9443` + `:443` | handshake OK, data flowing |
| WS `stream.bybit.com:443` public spot | handshake OK, data flowing |
| WS `data-api.binance.vision:443` | **404 — vision has NO WebSocket** (see gotchas) |
| FX: open.er-api.com, frankfurter, exchangerate-api | 200, no key needed |
| Region (Indonesia) | all of the above reachable; no blocks observed |

All 7 shortlisted symbols returned valid klines on **both** Binance and Bybit → all are liquid
enough on both venues. AAVE is the one thinner pair; LINK is the preferred DeFi blue-chip, AAVE
kept as fallback (both verified).

## 2. Asset shortlist & symbol strings

| Asset | Binance symbol | Bybit symbol (v5 spot) | Note |
|---|---|---|---|
| BTC | `BTCUSDT` | `BTCUSDT` | Deepest book on both |
| ETH | `ETHUSDT` | `ETHUSDT` | |
| SOL | `SOLUSDT` | `SOLUSDT` | |
| BNB | `BNBUSDT` | `BNBUSDT` | Native listing, liquid on both |
| XRP | `XRPUSDT` | `XRPUSDT` | |
| LINK | `LINKUSDT` | `LINKUSDT` | **DeFi blue-chip pick** |
| AAVE | `AAVEUSDT` | `AAVEUSDT` | Fallback; thinner volume, still fine |

Binance kline/interval strings: `1m 5m 15m 1h 4h 1d` (also `1h`=1 hour).
Bybit v5 spot `interval` numeric strings: `1 3 5 15 30 60 120 240 360 720 D W M`
→ 1m=`1`, 5m=`5`, 1h=`60`, 1d=`D`.

## 3. Provider A — Binance (keyless, both bases)

Primary base: `https://api.binance.com`
Keyless data-API mirror: `https://data-api.binance.vision` — **REST works identically** (verified
for all 7 symbols). Prefer `data-api.binance.vision` for REST market data when a keyless mirror is
wanted; note the mirror's WS is 404 (§7 gotcha), so any WS connection still goes to
`stream.binance.com`.

### 3.1 Klines (candlesticks) — copy-paste ready

```
# 5m candles, last 100 bars (BTC)
https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=100
https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=100

# 1m / 1h / 1d variants — swap interval:
https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1m&limit=300
https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1h&limit=200
https://api.binance.com/api/v3/klines?symbol=BNBUSDT&interval=1d&limit=90
```

Response row = `[openTime, open, high, low, close, volume, closeTime,
quoteVolume, trades, takerBase, takerQuote, ignore]` (verified live sample: BTC 5m close
`85463.1`, quote vol `23.3` BTC …). `limit` max 1000. Optional `startTime`/`endTime` ms.

### 3.2 24h ticker

```
https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT
https://api.binance.com/api/v3/ticker/24hr            # all symbols, heavy — use ?symbol=
```

Verified fields: `lastPrice, priceChange, priceChangePercent, weightedAvgPrice,
prevClosePrice, openHigh, openLow, lastQty, …`

### 3.3 REST depth (snapshot only; for live book use WS §4)

```
https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=500   # limit 1|5|10|20|50|100|500|1000
```

### 3.4 Rate limits (spot, per IP, verified in exchangeInfo response)

REQUEST_WEIGHT 6000/min; klines weight = 1–2 (limit-dependent), ticker/24hr by symbol ≈ 1–2.
For a demo (polling 6 symbols, 1s tickers) you are nowhere near the limit.

## 4. Binance WebSockets (verified, no key needed)

Raw-socket WS probe succeeded on **both** ports (handshake ~1–4 s from this machine):

- `wss://stream.binance.com:9443` — **primary**. Single combined stream:
  `wss://stream.binance.com/stream?streams=btcusdt@trade/btcusdt@ticker/btcusdt@depth/100`
  (verified: all three stream tags delivered on one connection; combined = 1 connection,
  recommended over per-stream raw sockets).
- `wss://stream.binance.com` (port 443) — same service, also verified working (raw `/ws/...`
  paths; ~2 s handshake).
- `wss://data-api.binance.vision` — **404, no WS support**. Do not plan around vision WS.
  Use vision for REST fallback only; WS always goes to `stream.binance.com`.

Per-symbol stream names (lowercase symbol in the path):

```
# trade
wss://stream.binance.com:9443/ws/btcusdt@trade          # every fill, real-time (3–4 fills/sec seen)
# 24h rolling ticker — update cadence measured ~1000 ms (one msg/sec; verified: 4 msgs, 1000 ms apart)
wss://stream.binance.com:9443/ws/btcusdt@ticker
# bookTicker: best bid/ask on change
wss://stream.binance.com:9443/ws/btcusdt@bookTicker
# diff depth (full-orderbook sync; pairs with REST /api/v3/depth snapshot + lastUpdateId)
wss://stream.binance.com:9443/ws/btcusdt@depth           # updates ~10/s
# diff depth, faster cadence — verified working: 5 msgs ≈ 99 ms apart
wss://stream.binance.com:9443/ws/btcusdt@depth@100ms
# partial depth (top N snapshot, self-contained — no sync dance):
# N = 5|10|20, cadence 1000ms (default) or 100ms — verified working: 4 msgs ≈ 911 ms apart
wss://stream.binance.com:9443/ws/btcusdt@depth20@1000ms
wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms
```

Combined multi-symbol (1 connection for 6 assets, e.g. tickers):

```
wss://stream.binance.com/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker/bnbusdt@ticker/xrpusdt@ticker/linkusdt@ticker
```

Gotchas: diff-depth streams (`@depth`) deliver *deltas* only — seed with a REST snapshot of the
orderbook and apply updates keyed by `lastUpdateId` (verified in samples). Partial-depth
`@depth5/@depth10/@depth20` are self-contained snapshots — simplest for the demo UI.
Max substreams per single connection: **200** — 6 symbols × (trade+ticker+depth@100ms) = 18, fine.

## 5. Provider B — Bybit v5 (spot, keyless market data)

Base: `https://api.bybit.com` · WS: `wss://stream.bybit.com/v5/public/spot`
All market-data endpoints below are public (no `apiKey` header required).

### 5.1 Kline — copy-paste ready (verified, 5m × 7 symbols all 200)

```
https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=5&limit=100
https://api.bybit.com/v5/market/kline?category=spot&symbol=ETHUSDT&interval=1&limit=300
https://api.bybit.com/v5/market/kline?category=spot&symbol=SOLUSDT&interval=60&limit=200
https://api.bybit.com/v5/market/kline?category=spot&symbol=BNBUSDT&interval=D&limit=90
https://api.bybit.com/v5/market/kline?category=spot&symbol=XRPUSDT&interval=5&limit=100
https://api.bybit.com/v5/market/kline?category=spot&symbol=LINKUSDT&interval=5&limit=100
https://api.bybit.com/v5/market/kline?category=spot&symbol=AAVEUSDT&interval=5&limit=100
```

Rows = `[startMs, open, high, low, close, volume, turnover]` (newest→oldest order; flip for
charts). `limit` max 1000. Optional `start`/`end` ms. Verified sample: BTCUSDT 5m close
`85614.3`, turnover `32,261,433`.

### 5.2 24h tickers — copy-paste ready (verified)

```
https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT
https://api.bybit.com/v5/market/tickers?category=spot      # ALL spot symbols (~150)
```

Verified fields: `lastPrice, highPrice24h, lowPrice24h, prevPrice24h, volume24h, turnover24h,
bid1Price, ask1Price, price24hPcnt`. For the demo poll the all-symbols call every ~1 s, or
per-symbol if you prefer.

### 5.3 REST order book snapshot (verified limits 5 / 500 / 1000)

```
https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=500
# limit: 1|50|200|500|1000 (any of these; 500 & 1000 both verified 200)
```

Fields: `result.b` = [[bid, size]…], `result.a` = [[ask, size]…], `result.s` symbol,
`result.ts` snapshot time, `result.u/o` update seq.

### 5.4 Instrument metadata (verify liquidity & tick sizes) — verified for BNB/LINK/AAVE

```
https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=BNBUSDT
https://api.bybit.com/v5/market/instruments-info?category=spot          # all spot symbols
```

Key fields: `quoteTick` (price tick), `priceFilter.tickSize`, `lotSizeFilter` (min/max qty +
step), `status=Trading` (filter), `symbolId` (200=BNB, 28=LINK, 26=AAVE — verified).

### 5.5 Bybit WebSocket public spot (verified: all 4 topics live on one connection)

```
wss://stream.bybit.com/v5/public/spot
```

Subscribe message (single JSON, verified — ack `{"success":true,"op":"subscribe"}` then
snapshots, then deltas; measured ~6 ms cadence between orderbook deltas):

```json
{"op":"subscribe","args":["publicTrade.BTCUSDT","tickers.BTCUSDT","orderbook.50.BTCUSDT","orderbook.200.BTCUSDT"]}
```

Exact stream/topic names (topic = `type.SYMBOL`):

| Topic | What | Note |
|---|---|---|
| `publicTrade.<SYM>` | real-time trades (array, may batch >1 trade) | verified: trade `p=85607.2, v=0.001775` |
| `tickers.<SYM>` | 24h rolling ticker, updates on change (≈ per second under normal load) | snapshot first (`type:"snapshot"`), then deltas |
| `orderbook.<N>.<SYM>` | N = `1|50|200` **max 200 levels for WS** | verified `orderbook.50` & `orderbook.200` OK; **`orderbook.500` → `Invalid topic` (rejected)** |

Gotchas: (1) WS depth tops out at 200 levels — use 1000/500 via REST snapshots (§5.3) instead;
(2) every topic sends a `type:"snapshot"` then `type:"delta"` pairs — rebuild from snapshot,
then patch; (3) server sends text `ping` every ~30 s — reply `pong` (verified working);
(4) one connection can subscribe many symbols (args array) — keep ≤ 10 topics per connection.

## 6. USD/IDR reference rate (display-only, no key)

All three verified 200 from this machine on 2026-09-23:

```
https://open.er-api.com/v6/latest/USD            # free, no key, ~1 update/day; sample: rates.IDR = 17814.4
https://api.frankfurter.app/latest?from=USD&to=IDR   # ECB-based, no key; verified: rates.IDR = 17820
https://api.exchangerate-api.com/v4/latest/USD        # free tier, no key; v4 works, v6 keyless for open.er-api
```

Recommendation for the demo: **poll `open.er-api.com/v6/latest/USD` once at boot + refresh every
6–24 h**, cache the IDR rate in the backend; store ledger prices in USDT and convert to IDR
only at display time. All three sources update daily (FX isn't tick-level) — never block a UI
render on the FX fetch. Label the converted price "converted to IDR · reference only".

## 7. Gotchas & decisions for the backend

- **WS needs no key** — every market-data WS above (Binance + Bybit) is public-only; no
  `apiKey` header, no auth. (Only private-order WS needs keys; out of scope for paper venue.)
- **Prefer `data-api.binance.vision` for REST** when you want the guaranteed keyless mirror
  (no IP-based geo quirks); it is verified for all 7 symbols' klines. But its WS is 404 —
  route all WebSockets to `stream.binance.com` instead. If `api.binance.com` ever returns 451
  (region restriction) from a user's IP, `.vision` REST still works; `stream.binance.com` WS
  generally still works too (verified here).
- **Depth limits:**
  - Binance WS `@depth` = full-book diffs, `@depth@100ms` = 100 ms cadence (verified ≈99 ms);
    REST snapshot `limit` up to 1000 (500/1000 verified).
  - Binance partial `@depth5/@depth10/@depth20` — max 20 levels, self-contained (verified 1000 ms & 100 ms cadence).
  - Bybit WS `orderbook.N` — **N ∈ {1, 50, 200} only; 500 is rejected** ("Invalid topic", verified).
    For 500/1000 levels use REST `/v5/market/orderbook?limit=500` (verified).
- **Ticker cadence:** Binance `@ticker` ≈ 1 msg/sec (verified 1000 ms apart); Bybit
  `tickers.SYM` pushes on change, effectively ~1 s under normal load.
- **Kline rows:** Binance oldest→newest, Bybit newest→oldest — flip one provider's array.
- **Rate limits:** Binance spot REST 6000 weight/min (klines=1–2 each); Bybit v5 market 600
  req/5s per IP — polling 6 tickers/s is safe; do not hammer the all-symbols ticker.
- **Liquidity:** LINK chosen as DeFi blue-chip (both venues liquid, tick 0.0001/0.01); AAVE
  verified liquid on both — keep as swap-in.
- **Region (Indonesia):** all probes above ran from this machine — no 451/403 observed on any
  endpoint. Re-run the ping block (§1) on deploy to CI/host if it moves.

## 8. Integration checklist (backend)

- [ ] REST: `GET /api/v3/klines` (Binance `.vision`) for chart history — 1h bars × 200 on load.
- [ ] REST: `GET /api/v3/ticker/24hr?symbol=…` per asset for 24h stats panel.
- [ ] WS: one `stream.binance.com/stream?streams=…` connection: 6×`@ticker` + 6×`@trade` +
      chosen depth stream (`@depth20@100ms` for the order-book panel, self-contained).
- [ ] WS: one `stream.bybit.com/v5/public/spot` connection: `publicTrade` + `tickers` +
      `orderbook.200` per shortlisted asset (fallback provider; cross-check prices Binance↔Bybit
      and show both as "reference" quotes).
- [ ] WS housekeeping: Binance's server-side `:ping` frames are handled by the WS client library
      (no app-level reply needed); Bybit requires replying `pong` to text `ping` ~30 s (verified in probe).
- [ ] FX: boot-time fetch `open.er-api.com/v6/latest/USD` → cache `rates.IDR`; display-only.
- [ ] UI labels: "reference data · not a real venue" on every price, per CONTEXT.md rules.
- [ ] Re-verify on day 1 of build: the §1 ping block + one WS handshake per provider.

_Probe artifacts (re-runnable): this doc verified 2026-09-23; raw samples in
`scratch/rest_results.json` / `scratch/ws2.json` / `scratch/ws3.json` (Hermes scratch dir)._
