# HANDOFF: 0-TRADER-COMPANEY

**Last updated:** 2026-10-04 (after Phase 0.5)
**Owner:** Vandaidr (KhuChinQue / Fandy). Writes English mixed with Bahasa Indonesia; answer in the language of the message. Wants honest, unfiltered assessments.
**Read this file, then `MASTER-PLAN.md` (the work order). This file is context and state; the plan holds the tasks.**

---

## 1. TL;DR

0-TRADER-COMPANEY is a **crypto paper-trading simulation** ("Simulasi Exchange"): headless Express backend, Next.js frontend for customers and admins, SQLite double-entry ledger. No real money, no real exchange orders.

**Current state: partially built, login broken.** The backend has no `/api/auth/*` routes, so the login form shows "Login failed". The auth logic exists in the engine (`apps/engine/src/server/`) but was never ported, and the engine is not running.

**Owner's goal:** make the whole project **complete and ready to use**. Dev credentials, open ports and plain http are **intentional for now**; the owner changes them afterwards. Therefore do **not** harden them, but keep every one configurable from **one root `.env`**.

---

## 2. Ground rules

1. **Flat structure only** under `/home/khuchinque/0-TRADER-COMPANEY/`. Never create nested project folders (no `0-0.project-*`, no `0-project-*`).
2. **Respect the lanes** (section 6). Never cross them.
3. **Do not harden yet** (no removing dev credentials, no https, no firewall, no port changes), only centralize config.
4. **Evidence over assumption.** Earlier reports contradicted each other three times. Verify with fresh commands; paste raw output.
5. **Never print secrets**: no hashes (not even a prefix or fragment), JWT secrets or `.env` values. Env var names only.
6. **Idempotent everything** (seeds, migrations, scripts). Back up `ledger.db` before touching data.
7. **This VPS also hosts other services.** Touch only this project's folder, ports and PM2 apps, and address PM2 apps by name.
8. **Report using the signal/log format** in `MASTER-PLAN.md` section 7, with your **own** lane name.

---

## 3. Structure

```text
/home/khuchinque/0-TRADER-COMPANEY/
├── apps/
│   ├── backend/    Express API (system API, admin endpoints)       → PM2 `backend`, port 11110
│   ├── engine/     Trading engine, auth logic, data/ledger.db      → NOT running, not in PM2
│   └── terminal/   Next.js UI (customer + admin)                   → PM2 `terminal`, port 22220
├── packages/       Shared types and config
├── PLANNING/       Architecture and plans
├── docs/           ADRs, API, runbook, progress log
├── ecosystem.config.js   PM2 config (use the absolute path)
├── handoff.md      this file
└── MASTER-PLAN.md  autonomous work order
```

Git remote: `https://github.com/khuchinque-app/0-TRADER-COMPANEY.git` (`origin`). Whether the VPS can pull from it non-interactively is **unverified**.

---

## 4. Environment

**Host:** VPS `khuchinque@187.127.178.20`

| Service | Port | PM2 name | Status |
|---|---|---|---|
| Backend API | 11110 | `backend` | Starts clean (the old `Cannot find module './routes/admin.js'` was a stale `dist`, cleared) |
| Terminal | 22220 | `terminal` | **Disputed**: one report says build invalid, another says valid. Rebuild fresh and read the real error |
| Engine | 3001 | none | Nothing listens on 3001 |

**URLs**
- Health: `http://localhost:11110/health` · Admin stats: `http://localhost:11110/api/admin/stats`
- Customer login: `http://187.127.178.20:22220/login` · Admin login: `http://187.127.178.20:22220/admin/login`
- `GET /` on the backend returning `Cannot GET /` is **expected** (headless API).

**Data:** SQLite at `/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db`, double-entry.

**Dev credentials (DEV ONLY, the owner rotates them later):** `chinque@dev.local` / `TestTrader2026!`, intended role `system-admin`.

**Request flow:**
```text
Browser → :22220/login → fetch('/api/auth/login')
  → Next.js rewrite /api/* → http://localhost:11110/api/*   (destination is baked at BUILD time)
  → backend: no auth router → 404 → UI shows generic "Login failed"
```
The rewrite is correct; the browser never calls `localhost` directly.

---

## 5. Known facts and open questions

**Settled**
- No auth routes in the backend. Auth code lives in the engine (`auth.ts` or `auth-routes.ts`, reports differ).
- User `chinque@dev.local` exists, `status=active`, `phone_verified=1`, id `01acf9fe69a32f91`.
- `users` has **no `role` column**. Known columns: `id, email, phone, phone_verified, password_hash, status, ...`.
- Password hashing is **scrypt** (the engine's own format; reuse it exactly so existing users keep working).
- Engine not running, 3001 free, engine missing from `ecosystem.config.js`.

**Open (resolved in `MASTER-PLAN.md` WP0/WP1)**
- R1 Who holds the lock on `ledger.db`? (one report says backend, another says an engine PID, yet no engine runs)
- R2 Is the `terminal` production build valid?
- R3 Which engine file holds the auth routes?
- R4 Does the backend open SQLite itself, and how does `/api/admin/stats` get data?
- R5 Can the VPS pull from GitHub non-interactively?
- R6 Is `ledger.db` tracked by git? If yes, a `git pull` could overwrite live data.

---

## 6. Multi-agent protocol

Both agents live in one Telegram group.

| Agent | Lane | Must NOT |
|---|---|---|
| **@Herme_KhuChinQue_bot** (VPS) | VPS infrastructure, live DB handling, PM2, deployment, `.env`, cron, logrotate, swap | Edit application code; touch other projects |
| **@Herme_ChinQue_bot** (Local) | All code in the local repo: backend, frontend, scripts, docs, tests | Run any SSH/VPS command or live PM2/deploy command |

- Scripts such as `deploy.sh`, `smoke.sh`, `backup-db.sh` are **repo code**: Local writes them, VPS runs them.
- If a prompt belongs to the other lane, stand by for their completion signal.
- A new agent that is neither of these two: ask the owner which lane to take over.
- Violations seen so far: the Local agent reported VPS-only facts and used the `VPS` label; a report printed a hash fragment. Do not repeat.
- Telegram limits a message to **4096 characters**: keep group messages to 12 lines and put long output in evidence files.

---

## 7. Design decisions (summary; full table in `MASTER-PLAN.md` section 3)

- **Single writer:** backend is the only public API and the only HTTP-facing writer of `ledger.db`; engine logic is ported or imported. A separate `engine` PM2 process only if unavoidable (then `127.0.0.1:3001` only).
- **Money:** integers at scale 1e8, `BigInt` in code, decimal strings in the API. Never floats.
- **Ledger:** double-entry, signed postings, per entry per asset sum is 0. User accounts never negative. Accounts `HOUSE`, `FEES`, `FAUCET`, `ADJUST` plus per-user `wallet` and `hold`.
- **Trading:** spot only, market and limit, fills against `HOUSE`, fees and spread configurable.
- **Prices:** `PRICE_SOURCE=binance|sim` with automatic fallback to a simulated random walk when the public API is unreachable.
- **Auth:** bearer JWT, scrypt, roles `customer | admin | system-admin` read from the DB per request. No OTP/SMS/email. Admin may use the customer login (`ALLOW_ADMIN_ON_CUSTOMER_LOGIN=true`).
- **Config:** one root `.env` + `.env.example` + a validated config module, shared by backend, terminal (build-time) and PM2.

---

## 8. Gotchas

- **Next.js rewrites are build-time.** Set `API_INTERNAL_URL` before `next build`; changing it later needs a rebuild.
- **Plain http:** never set `Secure` on cookies; the plan uses bearer tokens to avoid this.
- **SQLite:** WAL plus `busy_timeout`, one writer process. Never commit or `git pull`-overwrite `*.db`.
- **`next build` can OOM** on a small VPS: check `free -m`, add swap if needed.
- **`pm2 save`** persists the whole PM2 list, not just this project: check `pm2 status` first.
- **Do not reboot the VPS** unattended (it hosts other services). The reboot test is owner-only.
- The `chinque@dev.local` password hash may not match the documented password; the seed script resets it to the configured one.

---

## 9. Intentionally insecure (do NOT fix, DO centralize)

Dev credentials and `system-admin` role · raw public ports 11110/22220 · plain http · dev JWT secret · permissive CORS if present. Each is documented with its controlling env key in `docs/HARDENING-TODO.md` (to be created, not acted on).

---

## 10. Useful commands (VPS lane)

```bash
cd /home/khuchinque/0-TRADER-COMPANEY
pm2 status
pm2 logs backend --lines 100 --nostream
pm2 logs terminal --lines 100 --nostream
pm2 reload ecosystem.config.js --update-env
curl -i http://localhost:11110/health
curl -i -X POST http://localhost:11110/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"chinque@dev.local","password":"TestTrader2026!"}'
ss -ltnp | grep -E '11110|22220|3001'
fuser -v apps/engine/data/ledger.db
sqlite3 apps/engine/data/ledger.db ".tables" "PRAGMA table_info(users);"
git ls-remote origin
git ls-files | grep -E '\.db'
```
