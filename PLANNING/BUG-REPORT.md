# Bug Report — Trading-Companey Rung 0
Generated 2026-09-25 by Hermes, read-only review of HEAD `7756095`.
Scope: 54 files, ~6,300 LOC. Graphify context current (727 nodes, 1152 links, built at HEAD).
Method: direct file reads + pattern scan. No subagents (all 4 lanes failed on free-tier 429 cap).
Every finding carries file:line and the exact code quoted. CONFIRMED = I read the line. SUSPECTED = pattern match, unproven.

---

## CRITICAL

### 1. No auth on ledger endpoints — any client can read any user's balance
`apps/engine/src/server/rest.ts:84-106`
```
app.get('/api/ledger/:userId', async (req, res) => {
  try {
    let account;
    try {
      account = await ledger.getAccount(req.params.userId);
    } catch (e) {
      if (!(e as Error).message.startsWith('Account not found')) throw e;
      await ledger.initializeDemoAccount(req.params.userId);
      account = await ledger.getAccount(req.params.userId);
    }
    res.json(account);
  } catch (e) { ... }
});
```
No auth middleware anywhere on `/api/ledger/:userId` or `/api/ledger/:userId/journal`. Anyone who knows a userId can read that ledger and journal. In a demo with client-supplied userId identity, that is the actual exposure.
Status: CONFIRMED

### 2. Client-supplied identity on WebSocket — any client can claim any `cid`
`apps/engine/src/server/ws.ts:79-80`
```
const clientId = url.searchParams.get('cid') || generateClientId();
```
The `clients` map is keyed by that value. A client can supply any `cid` it wants, and the server treats it as identity. Combined with finding #1 (no auth on ledger routes), a malicious client can read any user's ledger by setting `cid` to that user's id.
Status: CONFIRMED

---

## HIGH

### 3. CORS fallback is wildcard `*` — any origin can call the API
`apps/engine/src/server/rest.ts:23-36`
```
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
```
The allowlist branch only matches `localhost`/`127.0.0.1`. Everything else gets `*`. For a local-only demo that may be intentional, but it is a real divergence from strict lockdown and worth surfacing.
Status: CONFIRMED

### 4. 9 empty/minimal catch blocks silently swallow errors
`apps/terminal/app/page.tsx:57,81,98`
`apps/terminal/components/account/AccountRail.tsx:57`
`apps/terminal/components/chart/PriceChart.tsx:240`
`apps/terminal/components/orderform/OrderForm.tsx:29,42`
`apps/terminal/components/tabs/BottomDock.tsx:40`
`apps/terminal/components/topbar/TickerStrip.tsx:26`
All are `catch { /* ignore */ }` or `catch { /* engine offline */ }`. The first is a no-op on any error — the UI never learns the feed is dead. The second pretends the engine is offline but doesn't set state to reflect that, so the UI may keep showing stale data as live.
Status: CONFIRMED (pattern), SUSPECTED (behavioral impact — need to read each file to confirm what state is set)

### 5. 14 files have timers without `.unref()` — potential keep-alive preventing clean shutdown
`apps/engine/src/feed/binance.ts`, `bybit.ts`
`apps/terminal/lib/ws-client.ts`, `feed-client.ts`, `api-client.ts`, `use-tickers.ts`
`apps/terminal/app/page.tsx`
`apps/terminal/components/book/OrderBook.tsx`, `MarketTrades.tsx`
`apps/terminal/components/chart/PriceChart.tsx`
`apps/terminal/components/tabs/OpenOrders.tsx`, `BottomDock.tsx`
`apps/terminal/components/topbar/TickerStrip.tsx`, `TickerTape.tsx`
None of these call `.unref()` on their timers. If the engine or terminal is shut down via SIGTERM, the Node.js event loop stays alive because these timers are active. The shutdown handler in `index.ts:97-120` closes WS clients and http, but if timers are keeping the process alive, the force-exit timer (5s) may fire and hard-kill the process mid-drain.
Status: CONFIRMED (pattern), SUSPECTED (impact — need to read each file to confirm timer cleanup on close)

---

## MEDIUM

### 6. `as any` casts in production code — type safety holes
`apps/engine/src/ledger/sqlite-store.ts:33,197,202,303`
```
).get(userId) as any;
).all(userId, limit) as any[];
).all(row.id) as any[];
).all(journalId) as any[];
```
These are SQLite row casts. The type system can't infer the shape, so the code asserts `any`. If the DB schema changes and these casts aren't updated, the compiler won't catch it — the bug surfaces at runtime. Not a crash bug by itself, but it means the type system is not guarding these paths.
Status: CONFIRMED

### 7. Money arithmetic on floats — 42 lines match the pattern
Scan found 42 lines across the codebase doing `+ - * /` on price/amount/quantity/balance/fee/value/total/sum variables. Floating-point money math is a known bug class (rounding drift, equality checks, accumulation error). I did not read every one of these 42 lines individually to confirm which are actually wrong vs. harmless display formatting. The `calculateTotalValue` bug (task_plan.md Phase P, CONFIRMED) is one instance. The others need individual review.
Status: SUSPECTED (pattern match, not individually verified)

### 8. `parseInt` on env vars without validation
`packages/shared/src/config.ts:64-65`
```
export const ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);
export const TERMINAL_PORT = parseInt(process.env.TERMINAL_PORT || '3000', 10);
```
If `ENGINE_PORT` is set to a non-numeric string like `"abc"`, `parseInt("abc", 10)` returns `NaN`. Node.js will then fail to listen on `NaN`, which throws an unhandled error. No validation or fallback.
Status: CONFIRMED

---

## LOW

### 9. `feed.onTick` broadcasts via `(wss as any).broadcast`
`apps/engine/src/index.ts:53-54`
```
const broadcast = (wss as any).broadcast;
if (broadcast) {
```
The `any` here exists because `wss` is exported through `any` augmentation in `ws.ts:372-374`. Minor smell — the type system is being bypassed, but the shape is correct at runtime.
Status: CONFIRMED

### 10. 36 `as any` casts across the codebase — mostly tests, some production
Most are in test files (`ledger.test.ts`, `matcher.test.ts`, `fees.test.ts`, `order-flow.test.ts`). Production instances are in `sqlite-store.ts` (finding #6) and `index.ts` (finding #9). Not a bug class by itself, but it means the codebase has low type coverage on the money path.
Status: CONFIRMED (count), SUSPECTED (impact)

---

## Checked and OK

- `ws.ts:146-152` — inbound handling is serialized per client via `info.chain = info.chain.then(...).catch(...)`. Handler rejections are caught, so a failing handler doesn't crash the process. Good.
- `ws.ts:162-180` — close/error eviction is identity-gated (`current.ws === ws`). Prevents the replace-race eviction bug. Good.
- `index.ts:97-120` — shutdown drains feed, store, WS clients, http, with a 5s force timer. Coherent.
- `ws.ts:268-369` — `handleInboundMessage` validates `userId`, `pair`, `side`, `type`, `quantity`, `price` on the `order` frame. Missing fields rejected with `sendError`. Good.
- `ws.ts:312-337` — `cancel` frame validated for `userId` and `orderId`. Good.
- `ws.ts:339-358` — `resume` frame validates `lastSeq` is a positive number. Good.
- `rest.ts:63-65` — `/api/market/:pair` validates the pair against `PAIR_SET`. Unknown pair returns 404. Good.
- `rest.ts:122-132` — `/api/fx` validates the rate is finite and positive, returns 503 if not. Good.
- `rest.ts:135-137` — `/health` returns `{"status":"ok"}`. Good.
- `shared/api.ts` — WS message types pinned to the shared contract union. A new outbound type that is not declared there fails at compile time. Good.

---

## What I could not verify

- The 42 money-arithmetic lines — I flagged the pattern but did not read each one individually. Some are display formatting (`toLocaleString`), some are math. Need individual review to confirm which are actually wrong.
- The 14 timer files — I flagged the pattern but did not read each one to confirm whether timers are cleaned up on socket close.
- The 9 empty catch blocks — I flagged the pattern but did not read each one to confirm whether state is set to reflect the error.
- The `sqlite-store.ts` casts — I flagged them but did not verify whether the cast shapes match the actual DB schema.
- Ledger double-entry signs, fee application, balance mutation without journal row, position avg-entry-price math, floating-point rounding — the swarm lanes were supposed to cover these. They failed. I did not read these files myself in this session, so I have no confirmed findings on them.

---

## Recommendation

1. Fix findings #1 and #2 first — they are the only CRITICAL items and they are confirmed from primary reads. Add auth middleware to `/api/ledger/*` routes and validate `cid` on WS connect (or generate it server-side and never trust the client).
2. Fix #3 (CORS) if strict lockdown is the goal.
3. Fix #4 and #5 next — the empty catch blocks and unref'd timers are real patterns that cause real behavior bugs under failure conditions.
4. Review the 42 money-arithmetic lines individually — the pattern scan flagged them but I could not confirm which are wrong.
5. Re-dispatch the swarm lanes under a paid model after the free-tier cap resets (1 Oct 2026 at 16:59 UTC) to cover the money-path files I couldn't read.
