# AUTH & ADMIN — member accounts + password-gated admin console

**Applies to:** `apps/backend` (API) + `apps/exchange` (SPA, port 22221)
**Branch:** `feat/market-trade`
**Date:** 2026-10-09

Simulation only — no real money, no custody. All balances are virtual.

---

## 1. Member accounts

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | none | member self-registration (the UI uses this) |
| `POST` | `/api/auth/signup` | none | same handler, kept for backwards compatibility |
| `POST` | `/api/auth/login` | none | member sign-in |
| `POST` | `/api/auth/guest` | none | throwaway demo account (unchanged) |
| `GET` | `/api/auth/me` | bearer | current member; includes `role` + `isAdmin` |

### Registration

`POST /api/auth/register` `{ name?, email, password }` → `201`

```jsonc
{
  "ok": true,
  "userId": "u_…",
  "accountId": "acct_…",
  "token": "<jwt>",                       // signed in immediately
  "user": { "id": "u_…", "email": "…", "name": "…", "role": "customer", "status": "active" },
  "wallet": { "accountId": "acct_…", "balance": 10000, "currency": "USDT", "balances": [ … ] },
  "simulasi": true
}
```

Registration is atomic (one SQLite transaction) and creates all four rows a member needs:
`users` + `accounts` + `balances` + the matching `journal`/`journal_lines` entry, plus an
`audit_log` event. New members are funded with the same simulated starting balance guests get,
so a freshly registered account can trade immediately.

Rejections:

| Status | `error.code` | Cause |
|---|---|---|
| `400` | `invalid_email` | not a valid email address |
| `400` | `weak_password` | shorter than `MEMBER_MIN_PASSWORD` (default 8) |
| `409` | `email_taken` | email already registered |

### Login

`POST /api/auth/login` `{ email, password }` → `200` with `token` + `user`, or:

| Status | `error.code` | Cause |
|---|---|---|
| `401` | `bad_credentials` | wrong email *or* password — one generic message, never reveals which |
| `403` | `account_suspended` | status is `suspended` |
| `403` | `pending_verification` | status is `pending` |
| `429` | `rate_limited` | more than `MEMBER_LOGIN_MAX_ATTEMPTS` (default 10) per IP+email per 15 min |

Sessions are stateless JWTs carrying `exp` (default 30 days). `getUserId()` enforces `exp`, so
**every** existing route that resolves the caller through it now honours session expiry.

### Pages

| Route | Component |
|---|---|
| `/akun/daftar` (and `/daftar`) | `RegisterPage` — name, email, password, confirm |
| `/akun/masuk` | `LoginPage` — email + password, plus the Guest Demo button |
| `/akun/dompet` | `WalletPage` — simulated balances |

---

## 2. Admin console

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/admin/login` | none (password) | operator sign-in |
| `POST` | `/api/admin/logout` | none | acknowledged; tokens are stateless |
| `GET` | `/api/admin/session` | system-admin | current admin identity |
| `GET` | `/api/admin/overview` | system-admin | counts + brand + recent members + audit |
| `GET` | `/api/admin/users` | system-admin | member list |
| `PUT` | `/api/admin/users/:id/status` | system-admin | `active` \| `pending` \| `suspended` |
| `GET` / `PUT` | `/api/admin/whitelabel` | system-admin | brand config |
| `GET` | `/api/admin/stats` | system-admin | **newly gated** |
| `GET` | `/api/admin/integrity` | system-admin | **newly gated** |

### Signing in

`POST /api/admin/login` `{ password }` → `200`

```jsonc
{ "ok": true, "token": "<jwt>", "admin": { "id": "dev_…", "email": "admin@chinque.local", "role": "system-admin" },
  "expiresAt": 1791584916224, "simulasi": true }
```

The console is a **single shared operator password**, not a member account. On success the
server mints a short-lived (default 12 h) session for the seeded `system-admin` identity, so
every pre-existing role-guarded `/api/admin/*` route keeps working untouched.

- Wrong password → `401 bad_credentials`; more than `ADMIN_LOGIN_MAX_ATTEMPTS` (default 8) per
  IP per 15 min → `429` with a `Retry-After` header.
- The password is compared with a length-tolerant `timingSafeEqual`, and is never stored or
  logged. A successful sign-in is written to `audit_log` (`admin_login`).
- The admin session lives under its own `localStorage` key (`sx_admin_jwt`), so signing into
  the console never disturbs a member session, and vice versa.

### UI

`/admin` and `/akun/admin` both render `AdminConsole`:

| Tab | Shows |
|---|---|
| Dashboard | members / admins / non-active / accounts / orders / open orders / fills / journal lines, live feed health, newest registrations |
| Members | member list with **aktifkan** / **suspend** actions |
| Brand | whitelabel editor (writes `config` table, live on `/api/brand`) |
| Audit | most recent `audit_log` events |

---

## 3. Configuration

| Env var | Default | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | `admin1` | **change before exposing the service**; boot log warns while default |
| `ADMIN_EMAIL` | `admin@chinque.local` | label shown in the console header |
| `ADMIN_SESSION_TTL_MS` | `43200000` (12 h) | admin session lifetime |
| `ADMIN_LOGIN_MAX_ATTEMPTS` | `8` | per IP per window |
| `ADMIN_LOGIN_WINDOW_MS` | `900000` (15 min) | attempt window |
| `MEMBER_START_USDT` | `GUEST_START_USDT` (10000) | simulated starting funds |
| `MEMBER_MIN_PASSWORD` | `8` | minimum password length |
| `MEMBER_SESSION_TTL_MS` | `2592000000` (30 d) | member session lifetime |
| `MEMBER_LOGIN_MAX_ATTEMPTS` | `10` | per IP+email per window |
| `MEMBER_LOGIN_WINDOW_MS` | `900000` (15 min) | attempt window |
| `JWT_SECRET` | `dev-secret-change-in-production` | boot log warns while default |

The seeded staff account (`DEV_EMAIL` / `DEV_PASS`, default `dev@example.com` /
`devpass123`) still works through `/api/auth/login` and holds `role = system-admin` — that is
an alternative route into the role-guarded endpoints, useful for API-level admin work.

---

## 4. Fixes shipped with this work

| Fix | Why it mattered |
|---|---|
| `GET /api/admin/stats` and `/api/admin/integrity` were **completely unauthenticated** | ledger internals were readable by anyone; both are now behind `requireSystemAdmin` |
| `users.status` CHECK only allowed `('pending','active')` | `PUT …/status {suspended}` — which the admin panel offers — failed with a constraint error. The table is rebuilt once, in a transaction, and the migration **aborts unless the row count is preserved** |
| Register/login assumed a `users.name` column that does not exist | caused a `500` on register-follow-up calls; the display name lives on `accounts.name` and is now read via a join |
| `/akun/daftar` was a placeholder telling users to use Guest Demo | replaced with a real registration form |

---

## 5. Verification

```bash
node scripts/verify-auth.mjs --base http://localhost:11110   # 32 checks
node scripts/cdp-render-proof.mjs                            # 28 render checks
bash scripts/smoke-exchange.sh                               # 13 checks
```

`verify-auth.mjs` covers registration validation, duplicate email, login success/failure,
session expiry, `/me` identity, the **authorization boundary** (a member token must be
rejected from every `/api/admin/*` route), the admin password gate, the console payloads, and
suspend → blocked-login → restore.

`cdp-render-proof.mjs` renders `/market/{PAIR}`, `/akun/daftar`, `/akun/masuk` and `/admin` in
real Chrome and asserts the forms mount with no uncaught exceptions.

> **Local edit required for one config:** these two scripts plus the existing
> `scripts/cdp-verify.mjs` live in the repo, but `cdp-render-proof.mjs` is the only browser
> check that can run on this VPS (Chrome here cannot open any http URL — see
> `packages/market-client/discovery-report.md`, finding F1).

---

## 6. Known limitations / risks

1. **The admin password is a shared secret, not per-operator identity.** Every sign-in becomes
   the same `system-admin` user, so the audit trail cannot attribute an action to a person.
2. **`ADMIN_PASSWORD` defaults to `admin1`** and `JWT_SECRET` to a development value. Both are
   loudly warned about at boot, but they are **not** enforced — set them before any exposure.
3. **The login throttles are in-process and per-IP.** They reset on restart and do not survive
   multiple instances. Sufficient to blunt casual brute force, not a replacement for a
   gateway/WAF.
4. **`signJWT` is a keyed SHA-256, not a real HMAC** (`sha256(header.body.secret)`). It is
   functionally sound for a demo but is not a hardened token scheme; switching to
   `createHmac` would invalidate existing sessions, so it was left as-is and reported instead.
5. **No password reset, email verification, 2FA or refresh tokens.** Registration is
   first-come; `phone`/`phone_verified` columns remain unused.
