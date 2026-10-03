# MASTER PLAN: autonomous build of 0-TRADER-COMPANEY

**Read `handoff.md` first** (context, lanes, ports, rules). This file is the *work order*: what to build, in what order, how to loop, how to log, when you are done.
**Owner is away.** Do not wait for the owner for anything this file already decides. Work until section 10 (Definition of Done) is met.

---

## 1. Mission and autonomy contract

Make the whole project **complete, runnable and ready to use** as a crypto **paper-trading simulation** (no real money, no real exchange orders).

- Dev credentials, raw ports and plain http **stay as-is** (owner changes them later), but **every one of them must live in the root `.env`**.
- Two agents, two lanes (handoff section 6). **Local = code only, never runs SSH/VPS commands. VPS = ops only, never edits application code.**
- Everything you claim needs **evidence**: paste raw command output or a commit SHA. No evidence, no DONE.
- Failures: retry with a *different* approach, max 3 attempts, then post `BLOCKED` with the exact need and **move on to independent work**. Never idle, never loop silently.
- Only the items in section 12 are owner-only. Everything else: decide using section 3 and keep going.
- No scope creep. Anything not in section 4 goes into `docs/BACKLOG.md` and is **not built** before the Definition of Done is met.

---

## 2. State of play (after Phase 0 and 0.5)

**Settled (both agents agree):**
- Backend (11110) has **no auth routes**; `POST /api/auth/login` returns 404. That is why the UI shows "Login failed".
- Auth code exists only in the engine (`apps/engine/src/server/`; one report says `auth.ts`, the other `auth-routes.ts`). The engine is **not running** (nothing on 3001, not in PM2).
- User `chinque@dev.local` exists and is `active`. The `users` table has **no `role` column**. Password hash algorithm is **scrypt**.
- The old backend error `Cannot find module './routes/admin.js'` was a **stale `dist`**; backend now starts clean.
- Git remote exists: `https://github.com/khuchinque-app/0-TRADER-COMPANEY.git`.

**Disputed, resolve with evidence in WP0/WP1 (do not trust either report):**

| # | Question | Conflict | Owner of the check |
|---|---|---|---|
| R1 | Who holds `ledger.db`? | VPS: "backend". Local: "engine PID 2997251, backend never opens SQLite". But no engine is running. | VPS: `fuser -v` / `lsof` on the file, then `ps -o pid,ppid,etime,cmd -p <pid>`, map to PM2 with `pm2 jlist` |
| R2 | Is the terminal build valid? | VPS: files exist but validation fails. Local: BUILD_ID exists, no errors. | VPS: delete `.next`, rebuild with env, paste the real error |
| R3 | Which file has the engine auth routes? | `auth.ts` vs `auth-routes.ts` | Local: read both |
| R4 | Does the backend open SQLite itself? How does `/api/admin/stats` work? | Local says no | Local: read `apps/backend/src` |
| R5 | Can the VPS pull from GitHub non-interactively? | unknown (private repo?) | VPS: `git ls-remote origin` |
| R6 | Is `ledger.db` tracked by git? | unknown. If tracked, `git pull` could overwrite live data. | VPS: `git ls-files \| grep -E '\.db'` |

**Process violations to not repeat:**
- The Local agent's 0.5 report contained VPS-only facts (a PID and lock) and was labelled `[DONE VPS phase0.5]`. Use your **own** lane name. Local agent: never run commands on the VPS; if you need VPS facts, ask the VPS agent in the group.
- A report printed a hash fragment (`scrypt:a1e...`). Never print any part of a hash, secret or `.env` value.

---

## 3. Decisions already made (do not ask, do not re-debate)

| ID | Decision |
|---|---|
| D1 | **Single writer.** The backend is the only public API and the only process that serves HTTP writes to `ledger.db`. Reusable engine logic (auth, ledger, orders) is **ported or imported** into the backend (optionally as `packages/engine-core`). Run a separate PM2 `engine` process **only** if the engine contains a long-running component that cannot live in the backend; if so it listens on `127.0.0.1:3001` only and the backend stays the only public surface. Record the choice in `docs/adr/0001-single-writer.md` after reading the code. |
| D2 | **Port, don't reinvent.** Existing schema and logic win. Extend with **additive, idempotent migrations** tracked in a `schema_migrations` table, run on backend startup. Never drop or rewrite existing tables. |
| D3 | **DB path unchanged:** `apps/engine/data/ledger.db`, set via `DB_PATH`. Never commit `*.db`. Shared db helper sets `journal_mode=WAL`, `busy_timeout=5000`, `foreign_keys=ON`. Use `better-sqlite3` if the repo does not already use another driver. |
| D4 | **Money is integer, never float.** All amounts are integers at scale 1e8 (8 decimals) for every asset, handled as `BigInt` in code (`safeIntegers`). The API sends and receives amounts as **decimal strings**. |
| D5 | **Double-entry** with signed postings. For every journal entry and every asset, postings sum to **0**. Accounts: per-user `wallet` and `hold` (per asset), plus system accounts `HOUSE`, `FEES`, `FAUCET`, `ADJUST`. User accounts can never go negative (checked inside the transaction); system accounts may. |
| D6 | **Trading model:** spot only, no leverage, no shorting. Order types `market` and `limit`. All fills are against `HOUSE` (simulated liquidity). Placing an order moves funds wallet to hold; fill settles from hold; cancel releases. Fees `FEE_BPS` (default 10) and spread `SPREAD_BPS` (default 5) are config. |
| D7 | **Markets:** quote asset USDT; `MARKETS` default `BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT`. |
| D8 | **Prices:** provider interface with `PRICE_SOURCE=binance\|sim`. `binance` polls public market-data REST (no key) every 2 s; verify from the VPS with `curl` whether `api.binance.com` or `data-api.binance.vision` answers, and use whichever works. After 3 consecutive failures auto-fall back to `sim` (random walk starting at the last known price) and expose `source` per market in `/api/markets`. With `PRICE_SOURCE=sim`, an admin-only endpoint can set a price so tests are deterministic. |
| D9 | **Auth:** bearer JWT (HS256, TTL `JWT_TTL` default 12h), scrypt hashing in the engine's **exact existing format** so current users keep working. Roles `customer`, `admin`, `system-admin`; role read from the DB on every request, not trusted from the token. Authorization correctness (admin routes, ownership checks on orders and wallets) is part of "working", **not** hardening. |
| D10 | **No OTP/SMS/email/KYC.** `REQUIRE_PHONE_VERIFY=false`, `AUTO_ACTIVATE=true`. Keep existing columns; if the engine has an OTP flow, keep it behind the flag, off. |
| D11 | **Admin on customer login:** `ALLOW_ADMIN_ON_CUSTOMER_LOGIN=true` by default (the owner tests with the admin account on `/login`). Admin login rejects non-admin roles. Seed also creates a separate dev customer. |
| D12 | **Starting funds:** new active users get `STARTING_BALANCE_USDT` (default 10000) via a ledger entry from `FAUCET`. A faucet endpoint with cooldown (`FAUCET_AMOUNT`, `FAUCET_COOLDOWN_HOURS`) tops up later. |
| D13 | **Frontend:** keep the existing Next.js stack and styling (dark theme, brand "Simulasi Exchange", English UI). The browser only calls same-origin `/api/*`; Next rewrites to `API_INTERNAL_URL`, read from env **at build time**. Add a visible "SIMULATION: no real funds" banner. |
| D14 | **Config:** one root `.env` (+ committed `.env.example`) and one validated config module (zod, fail fast on missing keys), shared by backend, terminal (`next.config` loads the root `.env` explicitly) and `ecosystem.config.js` (loads it with dotenv). No hardcoded ports, URLs, secrets or credentials anywhere else. |
| D15 | **Deploy mechanics:** `scripts/deploy.sh <sha>`, `scripts/smoke.sh`, `scripts/backup-db.sh`, `scripts/verify.sh` are **repo code authored by Local** and **executed by VPS**. VPS may edit only: `.env`, cron, logrotate, PM2 startup, swap. |
| D16 | **Tests:** use the repo's existing runner (else `vitest`). `scripts/verify.sh` = typecheck + tests + build. **Local never pushes red.** |

Env keys to define at minimum: `PORT_BACKEND` (11110), `PORT_TERMINAL` (22220), `API_INTERNAL_URL`, `DB_PATH`, `JWT_SECRET`, `JWT_TTL`, `CORS_ORIGINS`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_EMAIL`, `SEED_CUSTOMER_PASSWORD`, `ALLOW_ADMIN_ON_CUSTOMER_LOGIN`, `REQUIRE_PHONE_VERIFY`, `AUTO_ACTIVATE`, `STARTING_BALANCE_USDT`, `FAUCET_AMOUNT`, `FAUCET_COOLDOWN_HOURS`, `PRICE_SOURCE`, `MARKETS`, `FEE_BPS`, `SPREAD_BPS`. The VPS agent creates the VPS `.env` from `.env.example` and generates a random `JWT_SECRET` (`openssl rand -hex 32`); the dev credentials come from handoff section 4.

---

## 4. Scope: what "ready to use" means

**Customer**
- Register, login, `/me`
- Wallet: balances, faucet, ledger history
- Markets list with live prices
- Place market and limit orders, cancel open orders
- Orders and trades history
- Portfolio: holdings, average cost, realized and unrealized PnL, total equity

**Admin** (`/admin/login`, `/admin/*`)
- Stats: users, balances per asset, open orders, trades 24h, volume, fees collected, house net position
- Users list and detail, change status, change role (system-admin only), adjust balance (needs a reason, writes ledger entry and audit row)
- Audit log (admin actions, logins success and failure)
- Integrity check: runs the double-entry invariant on live data and returns `ok: true|false`

**Platform**
- Matcher and price poller run inside the backend process (per D1)
- Same code path on local and VPS, configured only by `.env`
- Daily DB backup, PM2 survives reboot (config in place), log rotation
- `README.md` quickstart, `docs/API.md`, `docs/RUNBOOK.md`, `docs/HARDENING-TODO.md`

**Stretch (only after Definition of Done, otherwise BACKLOG):** candlestick chart, OTP, stop orders, CSV export, rate limiting, Playwright e2e.

---

## 5. API contract (create `docs/API.md` in WP1 and keep it current)

```text
GET  /health
POST /api/auth/register | /api/auth/login        GET /api/auth/me
GET  /api/markets                                 GET /api/markets/:symbol/ticker
GET  /api/wallet     POST /api/wallet/faucet      GET /api/wallet/ledger
POST /api/orders     DELETE /api/orders/:id       GET /api/orders?status=   GET /api/trades
GET  /api/portfolio
GET  /api/admin/stats | /users | /users/:id | /audit | /integrity
POST /api/admin/users/:id/adjust | /status | /role
POST /api/admin/markets/:symbol/price            (only when PRICE_SOURCE=sim)
```

Errors are JSON `{ "error": { "code": "...", "message": "..." } }` with correct codes (400, 401, 403, 404, 409, 429). Validate every input with zod; use parameterized SQL only. Shared zod schemas and types live in `packages/shared`, used by backend and terminal.

---

## 6. Work loop and signals

Each **cycle** is:

```text
LOCAL builds → scripts/verify.sh green → push → posts  [LOCAL][WPx] DONE ... sha=<short>
VPS   runs scripts/deploy.sh <sha> → scripts/smoke.sh → posts PASS or FAIL (+ evidence file)
FAIL → LOCAL fixes → new sha → repeat.     PASS → next milestone.
```

- Local does **not** wait for deploys: after pushing a milestone, start the next work package immediately; only fix-ups for a FAIL take priority.
- VPS has idle time between milestones: use it for WP0 and infra items, then poll the group.
- If VPS cannot pull from GitHub (R5), fallback: VPS creates a bare repo `/home/khuchinque/repos/0-trader.git`, posts its SSH URL, Local adds it as remote `vps` and pushes there too.
- Signals are exactly the log format in section 7. Group messages are **12 lines max**. Long output goes to an evidence file (`ops/evidence/<wp>-<ts>.txt` on the VPS, gitignored) and the message names the file.
- If a task runs longer than 30 minutes, post one `NOTE` heartbeat line.

---

## 7. Logging (owner reads this when back)

**Line format**, used in the group and in the log files:

```text
[YYYY-MM-DD HH:MM UTC][LOCAL|VPS][WPx.y] STATUS: one-line summary (evidence or sha)
STATUS = START | DONE | PASS | FAIL | BLOCKED | DECISION | NOTE
```

**Files**
- **Local:** `docs/PROGRESS.md`, committed on every push.
- **VPS:** `ops/OPS-LOG.md` (gitignored).

Both files have the same layout:

```markdown
## STATUS (overwrite this block every update; the owner reads only this)
Milestone: M2 in progress | Last green smoke: sha abc123, 2026-10-04 14:10 UTC
Working on: WP4 price service | Blocked: none | Next: WP5 orders
Deployed on VPS: sha abc123 | Open FAILs: none

## LOG (append only, newest at the bottom, one line per event)
```

Log **every** START, DONE, FAIL, BLOCKED, DECISION. Keep it short but complete: someone reading only the file must be able to tell what was done, what failed and why.

---

## 8. Work packages and milestones

### WP0: VPS, start now (parallel with WP1). No code edits.
1. `node -v; npm -v; free -m; df -h /; swapon --show`. If RAM is under about 2 GB and there is no swap, create a 2 GB swapfile (log it) so `next build` does not OOM.
2. Resolve R1, R2, R5, R6 (section 2) with raw output.
3. Check `git status -sb`; make sure `.env`, `ops/`, `*.db`, `*.bak*`, `dist`, `.next` are in `.gitignore` (report if not; Local fixes it).
4. Create `ops/` and `ops/OPS-LOG.md` with the layout from section 7.
5. `pm2 status` and write down the **names** of other projects' processes. This VPS also hosts other services: **never** touch anything outside this project (section 11).
6. Post `[VPS][WP0] DONE` with a 10-line summary. Then wait for the first deploy request.

### WP1: LOCAL, start now. Foundation.
1. Resolve R3 and R4 by reading the code. Write `docs/adr/0001-single-writer.md` (D1) with the findings.
2. Root `.env.example`, `packages/config` (zod), shared db helper (D3), migration runner (D2).
3. Fix the `admin.js` import path; backend builds with `tsc` and starts from `dist`; the build must fail loudly on a bad import.
4. `scripts/verify.sh`, `.gitignore` fixes, `docs/PROGRESS.md`, `docs/API.md` skeleton.
5. Commit, push.

### WP2: LOCAL. Auth, roles, seed, login UI → **M1**
1. `apps/backend/src/routes/auth.ts`: register, login, me. Port the engine logic and hash format (D9, D10, D11). Mount in `index.ts`.
2. Migration: add `users.role TEXT NOT NULL DEFAULT 'customer'` (check `PRAGMA table_info` first). Admin middleware.
3. `scripts/seed-dev.*`: upsert dev admin (role `system-admin`, password **reset** to the configured one with the engine's scrypt format) and the dev customer. Idempotent.
4. Frontend: `next.config` rewrite from `API_INTERNAL_URL` (build-time), login and register pages show the server's real error message, admin login page.
5. `scripts/deploy.sh <sha>` (backup DB via `sqlite3 .backup`, `git fetch`, checkout sha, install with the repo's lockfile, build backend and terminal, run migrations and seed, `pm2 reload ecosystem.config.js --update-env`, wait for `/health`), `scripts/smoke.sh` (auth part), `scripts/backup-db.sh` (7 daily copies).
6. Update `ecosystem.config.js` (reads root `.env`; `terminal` runs `next start -p $PORT_TERMINAL`; add `engine` only per D1).
7. Tests: auth, roles, hash compatibility with an existing-format hash. `verify.sh` green, push, post `DONE sha=...`.

**M1 acceptance (VPS):** login works on `:22220/login` **and** `:22220/admin/login` with the dev credentials, wrong password gives a readable error, `GET /api/auth/me` works through the frontend proxy, backend and terminal both stable (restart counter not rising for 5 minutes).

### WP3: LOCAL. Ledger and wallet → **M2**
Schema additions (only what is missing; existing schema wins): `accounts`, `journal_entries`, `postings`. Ledger service (`post(entry)` inside `BEGIN IMMEDIATE`, rejects unbalanced entries and negative user balances). Wallet endpoints, faucet with cooldown, starting balance on activation, ledger history. **Property test:** 500 random operations (deposits, orders, cancels, fills, adjustments), then assert: per entry per asset sum is 0; no user account negative; per asset all accounts sum to 0; stored balances equal the sum of postings. Extend smoke. Push.
**M2 acceptance:** smoke wallet steps pass, invariant test passes, `/api/admin/integrity` returns `ok:true` on live data.

### WP4: LOCAL. Market data
Provider interface, `binance` and `sim` providers (D8), poller in the backend, `/api/markets`, `/api/markets/:symbol/ticker`, admin price-set endpoint in sim mode. Unit tests for fallback logic.

### WP5: LOCAL. Orders, matching, portfolio → **M3**
Orders with validation (min notional, tick/step from config), hold/release, market fills at ask/bid with spread, limit fills when price crosses (immediately as taker, or by the matcher tick), fees to `FEES`, trades table, cancel, PnL with weighted-average cost, `/api/portfolio`. Tests for resting-limit fill (sim provider), partial funds, double-cancel, ownership (user A cannot read or cancel user B's orders). Extend smoke. Push.
**M3 acceptance:** smoke trading steps pass, invariant test still passes with real trading ops.

### WP6: LOCAL. Admin API
Stats, users, user detail, status, role (system-admin only), adjust (reason required, ledger entry + audit row), audit log (including login attempts), integrity. Tests including 401 and 403 cases.

### WP7: LOCAL. Frontend complete → **M4** (with WP6)
Inventory existing pages first and list mismatches in `docs/PROGRESS.md`. Customer: `/login`, `/register`, `/dashboard`, `/trade`, `/orders`, `/wallet`, `/portfolio`. Admin: `/admin/login`, `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/audit`. Loading and error states everywhere, simulation banner, typed API client from `packages/shared`.
**M4 acceptance:** smoke full run, every page above returns 200 through `:22220` and contains its marker text, admin flows work.

### WP8: LOCAL + VPS. Ops finish → **M5**
- Local: `README.md`, `docs/RUNBOOK.md` (start, stop, deploy, restore backup, change a port or password), `docs/HARDENING-TODO.md` (each intentionally weak item and the env key that controls it), Phase 5 grep for hardcoded ports, URLs and credentials.
- VPS: install the daily backup cron (`scripts/backup-db.sh`), `pm2 install pm2-logrotate`, `pm2 save` (run `pm2 status` first and check that the saved list is what the owner expects), confirm `pm2 startup` unit exists and is enabled (`systemctl is-enabled pm2-<user>`). **Do not reboot the VPS** (section 12).
- Both: final full smoke on the VPS from a clean `deploy.sh <sha>` run.

---

## 9. Smoke test spec (`scripts/smoke.sh`, exits non-zero on first failure, prints one PASS/FAIL line per step)

Parameters from env: `BASE_API` (default `http://127.0.0.1:11110`), `BASE_WEB` (default `http://127.0.0.1:22220`), admin credentials.

1. `GET /health` → 200
2. Register a random user → 201; duplicate register → 409; short password → 400
3. Login → 200 with token; wrong password → 401 with a readable message
4. `GET /api/auth/me` → 200, role `customer`
5. `GET /api/markets` → 200, every price > 0
6. Faucet → 200 and balance up; second call inside cooldown → 429
7. Market buy → filled; USDT down, base asset up, fee booked
8. Resting limit buy below market → open, funds held; cancel → funds released; second cancel → 404 or 409
9. `GET /api/portfolio` → holdings and PnL present
10. Customer token on `/api/admin/stats` → 403; no token → 401
11. Admin login → stats 200; adjust balance → 200 and an audit row exists
12. `GET /api/admin/integrity` → `ok:true`
13. Same login through the frontend proxy `${BASE_WEB}/api/auth/login` → 200
14. `${BASE_WEB}` pages `/login`, `/register`, `/dashboard`, `/admin/login` → 200

---

## 10. Definition of Done and final report

All true, with evidence:
- `scripts/smoke.sh` passes on the VPS from a clean `scripts/deploy.sh <sha>` run.
- Invariant property test passes locally and `/api/admin/integrity` is `ok:true` on the VPS.
- Both login pages work in the browser with the dev credentials.
- PM2 shows `backend` and `terminal` (and `engine` only if D1 required it) online with a stable restart count for 10 minutes.
- Changing a port, password, secret, API URL or CORS origin requires editing **only the root `.env`** (then rebuild/reload per the runbook).
- Daily backup cron installed, `pm2 save` done, logrotate installed.
- `README.md`, `docs/API.md`, `docs/RUNBOOK.md`, `docs/HARDENING-TODO.md` exist and are accurate.

Then both agents post a **FINAL REPORT** (max 20 lines) and stop:

```text
FINAL REPORT
Deployed sha: <sha>   Smoke: PASS (evidence file)
URLs: customer ..., admin ..., health ...
Where config lives: root .env (list of keys in .env.example)
What works: (one line per area)
Known limitations: ...
Owner-only to do: reboot test, review docs/HARDENING-TODO.md
```

---

## 11. Safety rails (both agents)

- This VPS also hosts other services. Touch **only** this project's folder, ports and PM2 apps (`backend`, `terminal`, and `engine` if created). Address PM2 apps **by name**. Never run `pm2 kill`, `pm2 delete all`, `pm2 restart all`, `pm2 flush` without a name, or kill a PID whose command line is not inside `/home/khuchinque/0-TRADER-COMPANEY/`.
- Back up `ledger.db` (`sqlite3 ... ".backup ..."`) before every migration or seed on the VPS. Never `DROP`, never delete the DB file. `*.db` is never committed and git must never overwrite it.
- `rm -rf` is allowed only on `dist`, `.next` and `node_modules` inside this project.
- Never print hashes, JWT secrets, or `.env` values. Report env var **names** only.
- Never change ports, credentials or hardening posture except through `.env`.
- Local lane: no SSH or VPS commands of any kind. VPS lane: no application code edits (config, cron, PM2, swap and `.env` only).
- Flat structure only: never create nested project folders.

---

## 12. Owner-only items (post `BLOCKED` and keep working on everything else)

1. GitHub access from the VPS if `git ls-remote origin` fails and the bare-repo fallback is not wanted.
2. **Reboot test:** the VPS hosts other services, so an unattended reboot is not allowed. The owner reboots when convenient and checks that `backend` and `terminal` return.
3. Any decision about hardening (credentials, ports, https, firewall).
4. Anything that would delete data, change DNS, or touch other projects on the VPS.
