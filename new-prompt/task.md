# SYSTEM OVERRIDE: SWARM MODE & WAYFINDER ACTIVE
**FOCUS:** Core Engineering, Rapid Execution, Investor Demo Prep
**OBJECTIVE:** Achieve a "mock finish" state ASAP for investor presentation. Stub complex backend logic if it blocks UI rendering, but ensure the frontend looks fully operational.

## 1. CONNECTION DETAILS
You are running locally but must execute the following tasks on the remote VPS.
- **Target:** `ssh khuchinque@187.1277.178.20` (Password: admin1)
- **Target Working Directory:** `~/0-TRADER-COMPANEY`
- **Context Directory:** `~/0-TRADER-COMPANEY/new-prompt` (Read all prompt, target, and devtool specs here before modifying files).

## 2. TASK LIST
Execute the following uncompleted tasks extracted from the project state:

**Critical Fixes & Edits:**
- [ ] Edit `apps/backend/src/index.ts`: Fix duplicate `initDb` (corrupted by merged edit – remove broken stub).
- [ ] Edit `apps/exchange/src/main.jsx` to support frontend requirements below.

**UI & Feature Delegation:**
- [ ] Delegate sub-agent lane: Build the trade page design matching `https://6b3bbhptcfblg.ok.kimi.link/`. Fetch its CSS/JS via agent-reach web channel.
- [ ] CandleChart: Implement SVG Stop/Take Profit horizontal dashed lines with labels (following the `3devtool.md` pattern).
- [ ] Order history table: Add and populate `stop_loss` and `take_profit` columns.

**API & Backend Implementation (Mock if necessary for demo):**
- [ ] NO_FEED fix task: Ensure `/api/market/ticker` for `ACSIDR` never returns 5xx errors; verify render is stable.
- [ ] Backend: Create `/api/admin/whitelabel` (GET/PUT) + public brand endpoint.
- [ ] Frontend: Implement `/akun/admin` login + admin panel + ensure SPA reads live brand config correctly.

**Finalization:**
- [ ] Build + rebuild + verify (Ensure CPD-render successfully renders SL/TP visible).
- [ ] Final: Smoke test + CDP-render verification + commit/push changes.

## 3. EXECUTION RULES
1. **Speed Over Perfection:** If a backend route is complex, mock the JSON response so the frontend UI renders perfectly for the investor demo.
2. **Parallel Processing:** Invoke wayfinder/swarm ability. Delegate the Trade Page UI cloning and the Backend Whitelabel endpoints to concurrent sub-routines.
3. **Validation:** Do not disconnect until the `build` succeeds and the `NO_FEED ticker task` stops throwing 500 errors.

ROLE
You are a senior integration/backend coding agent working on an authorized crypto market service.

BASE URL
http://187.127.178.20:22221

REFERENCE ENDPOINT
/market/ANIMEIDR

PRIMARY SCOPE
All routes under /market/*.
Assume there are approximately 500 market endpoints, likely one per trading pair/symbol or per market sub-resource.
Your job is to discover, document, and build a clean client/integration layer for those /market endpoints only.

HARD CONSTRAINTS
- Only access this service if you have explicit written authorization. If authorization is unclear, use mocks/fixtures only.
- Read-only operations only. Do not attempt auth bypass, fuzzing, brute force, injection, load testing, or destructive requests.
- Do not touch /admin, /user, /wallet, /withdraw, /deposit, /login, /register, or similar routes unless explicitly authorized.
- Rate limit yourself: max 1 request per second, no concurrency unless the docs explicitly allow it.
- Respect 429, 403, 5xx, and Retry-After. Back off exponentially.
- Never hardcode secrets. Use environment variables.
- Do not guess or attack undocumented endpoints. Discover them from the app’s own HTML, JS, network calls, docs, sitemap, or OpenAPI.

PRIMARY OBJECTIVE
Build an endpoint inventory and a reusable market client focused on /market/*.
Start with /market/ANIMEIDR, then generalize to all market endpoints.

DISCOVERY PLAN
1. Fetch /market/ANIMEIDR.
2. Inspect:
   - HTML source
   - linked JavaScript bundles
   - inline scripts
   - network/API calls made by the page
   - WebSocket/EventSource/GraphQL usage
3. Search for route patterns such as:
   - /market/
   - /market/{pair}
   - /market/{base}{quote}
   - /market/{pair}/ticker
   - /market/{pair}/orderbook
   - /market/{pair}/trades
   - /market/{pair}/candles
   - /market/{pair}/history
   - /market/{pair}/stats
   - /market/list
   - /market/symbols
4. Check non-invasive discovery files:
   - /robots.txt
   - /sitemap.xml
   - /openapi.json
   - /swagger.json
   - /api-docs
   - /.well-known/
5. Extract the symbol/pair list from the page, JS bundles, or a market-list endpoint.
6. Do not manually hardcode 500 endpoints. Generate them from the discovered symbol list and route templates.

ENDPOINT INVENTORY REQUIREMENTS
Create `endpoints.json` with one record per discovered /market endpoint:

{
  "method": "GET",
  "path": "/market/ANIMEIDR",
  "category": "ticker|orderbook|trades|candles|history|stats|list|unknown",
  "params": {},
  "response_schema": {},
  "auth": "none|apiKey|unknown",
  "rate_limit": "unknown",
  "sample_response": {},
  "notes": ""
}

For every endpoint, document:
- HTTP method
- Full path
- Required/optional query params
- Path params
- Response content type
- Response shape
- Status codes observed
- Whether auth is required
- Whether it is paginated
- Whether it is WebSocket/SSE/streaming
- Any rate-limit headers

CLIENT IMPLEMENTATION REQUIREMENTS
Build a typed, config-driven client.
Suggested structure:

- `config.py` or `config.ts`
- `market_client.py` or `market_client.ts`
- `endpoints.json`
- `tests/`
- `README.md`
- `discovery-report.md`

The client must:
- Use a base URL from config.
- Support generic calls like:
  - `get_market(pair)`
  - `get_market_subresource(pair, subresource, params)`
  - `list_markets()`
- Include:
  - timeout handling
  - retry with exponential backoff
  - rate limiter
  - optional caching
  - typed response models where possible
  - clear error classes
- Avoid one-off duplicated functions for all 500 endpoints. Prefer templates and configuration.

TESTING REQUIREMENTS
- Unit tests must use recorded fixtures or mocks, not live requests by default.
- Integration tests against the live service only if authorization is confirmed.
- Test:
  - successful response parsing
  - 404/429/500 handling
  - timeout handling
  - rate limiter behavior
  - pagination
  - malformed JSON

DELIVERABLES
1. `endpoints.json` containing every discovered /market endpoint.
2. A reusable market client in Python or TypeScript.
3. Tests with fixtures.
4. `README.md` explaining setup, usage, and authorization assumptions.
5. `discovery-report.md` explaining:
   - how endpoints were discovered
   - which endpoints were confirmed
   - which are inferred
   - any blocked or unclear areas
   - rate-limit and auth observations

ACCEPTANCE CRITERIA
- All discovered /market/* endpoints are documented.
- No unauthorized, destructive, or non-market routes are touched.
- The client can query /market/ANIMEIDR and other discovered market endpoints.
- The code is configuration-driven, typed where possible, and tested.
- The agent stops and asks for authorization if it cannot confirm permission.

WORKFLOW
1. Confirm authorization.
2. Discover market symbols and route patterns.
3. Build `endpoints.json`.
4. Implement the client.
5. Write tests.
6. Produce the README and discovery report.
7. Summarize findings and list any unknowns.

If you encounter an endpoint that is not under /market/*, do not explore it. Add it to a separate `out-of-scope.md` note and continue focusing on /market/*.
