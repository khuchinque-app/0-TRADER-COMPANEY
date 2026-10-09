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
