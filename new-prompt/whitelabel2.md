# MASTER IMPLEMENTATION PROMPT: WHITE-LABEL CRYPTO PLATFORM (v2, hardened)

You are a coding agent. Read this entire file before writing any code, then execute
the phases in order. Nothing here is optional unless it says "optional".

---------------------------------------------------------------------------------------
## 0. HOW YOU MUST WORK
---------------------------------------------------------------------------------------
- 0.1 Every task has an ID, an `A:` (acceptance) and a `V:` (verification). A box is
  ticked ONLY after V has been run and passed. Paste the command and its result into
  `PROGRESS.md` under the task ID. No evidence = not done.
- 0.2 Forbidden in shipped code: stubs, empty handlers, `TODO` bodies, `console.log` as a
  handler, `href="#"`, mock data presented as live data. A control either works end to end
  or it is not rendered.
- 0.3 If blocked, write `BLOCKED: <task id> - <reason>` in `PROGRESS.md`, continue with
  independent tasks, and list every blocker in the final report. Never guess silently.
- 0.4 Follow the repo's existing flat layout (apps/*, packages/*). Do not create nested
  project folders. Dev shortcuts (http, open ports, dev credentials) are allowed for now,
  but every one must be logged in `HARDENING-TODO.md`.
- 0.5 Secrets live only in `.env` (never committed, never in a client bundle). Ship a
  `.env.example`.
- 0.6 Do not say "done" unless the Section 9 final gate passes with the exact counts it asks for.

---------------------------------------------------------------------------------------
## 1. LOCKED DECISIONS (change them here and nowhere else)
---------------------------------------------------------------------------------------
- Database: PostgreSQL 15+. Required for Row-Level Security. MySQL is NOT supported by this spec.
- API gateway and tenancy engine: TypeScript, Node 20+, port `11112`.
- Ledger and webhook worker: Python 3.11+, internal only, `127.0.0.1:11113`. Never exposed publicly.
  Node calls it with an `X-Internal-Token` header and always passes `tenant_id` explicitly.
  Python re-applies tenant scoping on its own DB connection (it never trusts the caller blindly).
- Frontend: Next.js (App Router) + TypeScript, port `22221`.
- Market data: public MEXC spot REST/WebSocket through a gateway proxy (cached, rate-limited).
  The browser never calls MEXC directly. Trades are simulated against the internal ledger.
- Charts: TradingView `lightweight-charts`.
- Money: integer minor units (`NUMERIC(38,0)` in SQL, `BigInt`/`decimal.js` in Node, `Decimal`
  in Python). Floats are forbidden anywhere a price, quantity, balance or fee is touched.
- Time: UTC, ISO-8601.
- Colors: Vice City palette (Appendix A). Everything else visual: the reference site (Phase 0).
- Default up/down convention: up = Vice Cyan, down = Sunset Pink (not red/green), always paired with
  a non-color cue (arrow glyph and +/- sign). Tenant-overridable.

---------------------------------------------------------------------------------------
## PHASE 0: PREFLIGHT AND REFERENCE CAPTURE
---------------------------------------------------------------------------------------
- [ ] 0.1 **Preflight.** Confirm toolchain, free ports, DB reachability.
      V: `node -v; python3 -V; psql "$DATABASE_URL" -c 'select 1'; ss -ltnp | grep -E '11112|11113|22221' || echo ports-free`
- [ ] 0.2 **Capture the reference CSS.** Reference: https://dash-cloud-storage-en.ok.kimi.link
      It is a client-rendered app, so its raw HTML contains almost no styles (only meta tags:
      `theme-color #19191c`, `viewport-fit=cover`). Do ALL of the following:
      a. `curl -sL <url>`: list every `<link rel="stylesheet">` and `<script src>`; download each to `reference/raw/`.
      b. With Playwright (Chromium), load the page at widths 375, 768 and 1440 after network idle and dump:
         (i) every rule from `document.styleSheets` (this catches injected and CSS-in-JS styles),
         (ii) all `:root` custom properties,
         (iii) computed styles for every distinct primitive: button variants, input, search field, select,
              tab, card, list row, table row, sidebar item, top bar, modal, toast, dropdown menu, tooltip,
              skeleton, empty state, scrollbar, plus hover / active / focus-visible / disabled states,
         (iv) full-page screenshots.
      c. Save: `reference/reference.css`, `reference/tokens.json` (colors, font families/sizes/weights/
         line-heights, spacing scale, radii, shadow geometry, borders, z-index, transitions, breakpoints),
         `reference/primitives.json`, `reference/shots/*.png`.
      d. Honor `viewport-fit=cover`: apply `env(safe-area-inset-*)` padding on fixed top/bottom bars.
      A: all files exist and are non-empty; `tokens.json` contains every category listed in (c).
      V: `node scripts/verify-reference.mjs` exits 0.
      IF THE URL IS UNREACHABLE OR GATED: write BLOCKED, stop all Phase 5/6 styling work, and ask the
      owner for the CSS or screenshots. Do NOT invent a look-alike.
- [ ] 0.3 **Parity precedence rules** (apply to every later phase):
      1. COLOR: Appendix A always wins. Zero reference colors may appear in shipped CSS. Produce
         `reference/color-map.json` mapping each reference neutral to a Vice City semantic token.
      2. EVERYTHING ELSE (type, spacing, radii, shadow geometry, border widths, transitions, breakpoints,
         component anatomy, states): the reference wins verbatim. Appendix A non-color values are fallbacks
         used only where the reference has no equivalent.
      3. The reference is a file-storage app. It has no order book, chart or order ticket. Compose those
         ONLY from reference primitives (card, list row, table row, tabs, input, button). Inventing a new
         visual language for them counts as a parity failure.

---------------------------------------------------------------------------------------
## PHASE 1: DATABASE ARCHITECTURE (PostgreSQL)
---------------------------------------------------------------------------------------
- [ ] 1.1 **`tenants`**: `id uuid pk default gen_random_uuid()`, `slug citext unique`, `company_name`,
      `is_active bool default true`, `config jsonb not null default '{}'`, `created_at`, `updated_at`.
      A: every write to `config` is validated against the schema in 5.6 (reject, never coerce).
- [ ] 1.2 **`tenant_domains`**: `host unique`, `tenant_id fk`, `is_primary`, `verified`. Used for Origin/Referer mapping.
- [ ] 1.3 **Global registries** (no tenant_id):
      `cryptocurrencies(ticker pk, full_name, precision_decimals, is_deposit_enabled, is_withdraw_enabled, is_trading_enabled)`
      `markets(pair pk, base, quote, price_precision, qty_precision, min_notional, is_active)`
      `tenant_markets(tenant_id, pair, is_enabled, fee_bps_override)`
- [ ] 1.4 **Tenant-scoped tables**: `users` (role in 'user'|'admin', `email citext`, argon2id hash, `kyc_status`),
      `wallets` (`available`, `locked`, CHECK >= 0), `orders`, `trades`, `ledger_entries` (append-only: revoke
      UPDATE/DELETE), `favorites`, `kyc_submissions`, `webhook_endpoints`, `webhook_outbox`, `audit_log`,
      `idempotency_keys`. EVERY one has `tenant_id uuid NOT NULL REFERENCES tenants(id)`.
- [ ] 1.5 **`platform_admins`**: separate table, NO tenant_id (the single intentional exception). Superadmins are
      never rows in `users`.
- [ ] 1.6 **Composite integrity**: `UNIQUE (tenant_id, id)` on every scoped table, `UNIQUE (tenant_id, email)` on
      `users`, and child tables reference parents by `(tenant_id, parent_id)`. A wallet must be physically
      unable to point at another tenant's user.
- [ ] 1.7 **Row-Level Security** (the real isolation layer): `ENABLE` and `FORCE ROW LEVEL SECURITY` on every scoped
      table; policy `USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (<same>)`.
      The app DB role is NOT the table owner and has NO `BYPASSRLS`. Superadmin queries use a separate
      `platform_role` connection. Unset context returns zero rows (fail closed).
- [ ] 1.8 **Migrations + seed**: versioned, reversible, idempotent. Seed two demo tenants (`alpha`, `beta`) with
      different theme configs, each with 1 admin, 2 users and funded wallets, for testing.
      V: `npm run db:migrate && npm run db:rollback && npm run db:migrate && npm run db:seed`
      V: `psql` as the app role with no context: `select count(*) from users;` returns 0.

---------------------------------------------------------------------------------------
## PHASE 2: GATEWAY AND MULTI-TENANCY ENGINE (TypeScript / Node.js, port 11112)
---------------------------------------------------------------------------------------
- [ ] 2.1 **Boot** on `11112`. Endpoints: `/healthz` (process up), `/readyz` (DB and ledger reachable).
      Graceful shutdown on SIGTERM.
      V: `curl -fsS localhost:11112/readyz`
- [ ] 2.2 **CORS allowlist handshake.** Build the allowed-origin set from `tenant_domains` plus env
      `CORS_EXTRA_ORIGINS` (dev default includes `http://187.127.178.20:22221`).
      - Echo the exact matching origin. NEVER `*` together with credentials. Always send `Vary: Origin`.
      - Send `Access-Control-Allow-Credentials: true`.
      - Allow headers: `X-Tenant-ID, Authorization, Content-Type, Idempotency-Key`. Expose `X-Request-ID`.
      - Answer `OPTIONS` preflight with 204, `Allow-Methods`, `Max-Age: 600`.
      V: curl preflight from an allowed origin returns the headers; from a disallowed origin returns none.
- [ ] 2.3 **Tenant resolution, in this exact priority order:**
      1. AUTHENTICATED requests: the tenant is the JWT claim `tid`. This is authoritative. If a header- or
         origin-derived tenant differs, return 403 `TENANT_MISMATCH` and write an audit entry.
      2. PUBLIC / pre-auth routes (login, register, theme-config, market data): `X-Tenant-ID` (slug), else
         `Origin`/`Referer` host looked up in `tenant_domains`.
      3. Dev only (`NODE_ENV != production`): `DEFAULT_TENANT_SLUG` env as a last resort.
      4. No match: 404.
      Why: headers, Origin and Referer are all client-controlled. They may only select a tenant BEFORE
      authentication, never override an authenticated identity. Note that all tenants share one IP:port in dev,
      so Origin alone cannot distinguish them; that is what `X-Tenant-ID` and `tenant_domains` are for.
- [ ] 2.4 **Request context** (AsyncLocalStorage): `{tenantId, userId, role, requestId}`. Unknown tenant and inactive
      tenant return the SAME 404 body `{"error":{"code":"TENANT_OFFLINE","message":"Tenant Profile Offline"}}`
      (no enumeration).
- [ ] 2.5 **Two-layer query isolation.**
      Layer 1 (hard): each request runs in one transaction that starts with
      `select set_config('app.tenant_id', $1, true)`, so RLS applies to every statement.
      Layer 2 (soft): an ORM/SQL interceptor that appends `tenant_id = ctx.tenantId` to every select, update
      and delete on scoped tables, and THROWS in dev/test if a scoped query lacks the predicate.
      Direct pool access is allowed only in migrations and `platform_role` modules (lint rule
      `no-restricted-imports` enforces this).
- [ ] 2.6 **Uniform errors**: `{error:{code,message,requestId}}`. No stack traces to clients. `X-Request-ID` on every response.
- [ ] 2.7 **Limits**: body size cap, per-IP and per-account rate limits (login: 5/min per IP+email; order submit:
      10/s per user).

---------------------------------------------------------------------------------------
## PHASE 3: MULTI-LEVEL RBAC
---------------------------------------------------------------------------------------
- [ ] 3.1 **Tokens**: access JWT 15 min; refresh 7 days, rotating, httpOnly cookie; claims `sub, tid, role, jti, exp`.
      Superadmin tokens use a separate secret and issuer, `role:"superadmin"`, no `tid`.
- [ ] 3.2 **Superadmin** `/api/v1/superadmin/*`: platform_role connection, bypasses tenant filters. Cross-tenant
      analytics, billing tiers, tenant onboarding and suspend/activate.
- [ ] 3.3 **Tenant admin** `/api/v1/admin/*`: `role=admin` AND `token.tid === ctx.tenantId`, else 403. Brand/theme
      settings, trading fees, markets on/off, KYC review, webhook settings, user list.
- [ ] 3.4 **End user** `/api/v1/user/*`: `role=user`. Orders, balances, trades, favorites.
- [ ] 3.5 **Deny by default**: one `permissions.ts` table maps every route to allowed roles. A test iterates all
      registered routes and fails if any route lacks a policy.
- [ ] 3.6 **Audit log** on every admin/superadmin write: actor, tenant, action, before/after, IP, requestId.
      V: `npm test -- rbac` runs the full route x role matrix and asserts the expected status for each cell.

---------------------------------------------------------------------------------------
## PHASE 4: LEDGER AND WEBHOOKS (Python)
---------------------------------------------------------------------------------------
- [ ] 4.1 **Double-entry ledger.** Each fill is ONE DB transaction: lock wallets with `SELECT ... FOR UPDATE` in sorted
      order, write balanced `ledger_entries`, update wallets, insert the trade, enqueue the outbox event.
      All-or-nothing.
- [ ] 4.2 **Invariants** (script `verify_ledger.py`, non-zero exit on drift, runs in tests and nightly):
      per (tenant, user, ticker) `available + locked == sum(entries)`; per tenant+ticker, all entries including
      system/fee accounts sum to 0. No query ever joins across tenants.
- [ ] 4.3 **Idempotency**: `Idempotency-Key` is required on `POST /user/orders`. A replay returns the stored response.
- [ ] 4.4 **Simulated execution**: market orders walk the proxied order book depth (with slippage); limit orders rest
      and a worker matches them when price crosses; fee = `tenant_markets.fee_bps_override`, else
      `tenants.config.fee_bps`, credited to the tenant fee account.
- [ ] 4.5 **Outbox webhook dispatcher**: worker uses `FOR UPDATE SKIP LOCKED`. Headers:
      `X-Platform-Event`, `X-Platform-Delivery-ID`,
      `X-Platform-Signature: t=<unix>,v1=<hex(HMAC_SHA256(secret, t + "." + raw_body))>`
      (the timestamp inside the signature lets receivers reject replays).
      Retries with backoff 10s, 1m, 5m, 30m, 2h, 12h; then dead-letter and surface it in the admin UI.
- [ ] 4.6 **Per-tenant secret**: generated by the Tenant Admin flow, shown ONCE, stored encrypted (AES-GCM, key from env),
      rotatable. Webhook URLs must be https in production and must not resolve to private/link-local IPs
      (SSRF guard; a dev flag may relax it).
      V: `pytest -q` covers: concurrent orders cannot overdraw; a cross-tenant fill is impossible; signature
      verifies with a reference implementation; replayed idempotency key returns the same order.

---------------------------------------------------------------------------------------
## PHASE 5: WHITE-LABEL DESIGN SYSTEM (Vice City, cozy)
---------------------------------------------------------------------------------------
- [ ] 5.1 **Token file** `apps/web/styles/tokens.css` = Appendix A. It is the ONLY file in the repo allowed to contain
      hex/rgb color literals.
- [ ] 5.2 **Theme endpoint** `GET /api/v1/public/theme-config`: returns the validated, whitelisted theme for the resolved
      tenant (`primaryColor, bgMain, bgSurface, textBase, textMuted, borderColor, borderRadius, upColor,
      downColor, warnColor, brandName, logoUrl, faviconUrl`). Sends `ETag` and `Cache-Control: max-age=60,
      must-revalidate`.
- [ ] 5.3 **Injection with no flash of default theme.** The server fetches the theme during SSR and inlines
      `<style id="wl-theme">:root{...}</style>` in `<head>`. A client boot script re-checks the ETag and, only if it
      changed, applies values with `document.documentElement.style.setProperty`. The SERVER maps keys to CSS
      variable names; the client never receives arbitrary variable names. Last good theme is cached in
      `localStorage` keyed by tenant slug.
      Charts do not read CSS variables on their own: on boot and on every theme change, read the computed values and
      call `chart.applyOptions(...)` (and re-style series).
- [ ] 5.4 **Utility scopes**: `.btn-primary`, `.btn-buy`, `.btn-sell`, `.text-up`, `.text-down`, `.tint-up`, `.tint-down`,
      `.card`, `.input`, `.tab` (Appendix A). Geometry comes from reference primitives. Components may use ONLY
      `var(--wl-*)` for color.
- [ ] 5.5 **Cozy-to-the-eye rules (all mandatory):**
      1. No pure `#000` or `#FFF` anywhere. Background is Ocean Night; text is soft lavender-white.
      2. Full-saturation neon is reserved for: primary buttons, up/down values, the focus ring, the active-tab
         indicator, small icons. Large areas use bg tokens or tints of 14% alpha or less.
      3. Glow: blur 14px or less, alpha 30% or less, only on `:focus-visible` and primary hover. No text-shadow glow
         (logo only).
      4. Price ticks fade a soft tint over 450ms. No flashing, blinking or marquee. Under
         `prefers-reduced-motion` ticks change instantly without animation.
      5. Body text 14-15px, line-height 1.5, `font-variant-numeric: tabular-nums` on all numbers. Muted text
         at least 4.5:1 contrast on its surface; main text at least 7:1.
      6. Dense tables: 1px dividers at 60% alpha. Order book depth bars: 12% tint.
      7. Ambient background: a faint radial primary-tint glow rising from the bottom edge (echoing the palette art),
         applied once on `body`, never per card.
      8. `color-scheme: dark`; themed scrollbars and `::selection`; `meta theme-color` = `--wl-bg-main`.
      9. Motion 150-200ms ease-out; every non-essential animation disabled under `prefers-reduced-motion`.
      V: `node scripts/contrast-report.mjs` prints a table of every text/surface pair; all pass.
- [ ] 5.6 **Tenant override validation** (server-side, on save AND on read):
      - colors must match `^#[0-9a-fA-F]{6}$` (no other CSS syntax can ever reach a stylesheet: this prevents CSS injection)
      - `borderRadius` integer 0-16 (px)
      - `logoUrl`/`faviconUrl` only from the upload endpoint (png/webp/jpg, max 512 KB, MIME-sniffed; SVG is not
        accepted)
      - contrast guard: `textBase`/`bgMain` >= 7:1, `textMuted`/`bgSurface` >= 4.5:1, up/down vs `bgSurface` >= 3:1,
        `onPrimary` auto-chosen to reach >= 4.5:1. A failing save returns 422 with the exact failing pair and ratio.
- [ ] 5.7 **Reference parity gate**: `scripts/css-parity.mjs` loads the reference and the app at 375/768/1440, compares
      computed styles of every primitive in `reference/primitives.json` (ALL properties except color-valued ones),
      and writes `reports/css-parity.json`.
      A: zero unexplained diffs. Each allowed diff is listed with a reason in `reports/css-parity-allowed.md`.

---------------------------------------------------------------------------------------
## PHASE 6: MARKET PAGE `/market/<coinname>*`
---------------------------------------------------------------------------------------
- [ ] 6.1 **Routes.** `/market` (list) and `/market/[slug]`. The trailing `*` means: accept a coin slug with an optional
      quote/pair suffix, case-insensitive (`/market/btc`, `/market/btcusdt`, `/market/BTCIDR`). Resolve to the
      canonical pair through the registry from 1.3 and redirect (308) to the canonical URL. Unknown slug renders
      a themed "Market not found" page with a link back to `/market` (HTTP 404, never a crash).
- [ ] 6.2 **Layout** (built only from reference primitives, see 0.3):
      - >= 1280px: three columns. Left: market list. Center: pair header, chart, order book / recent trades.
        Right: order ticket. Below: Open orders / History / Trades / Balances tabs.
      - 768-1279px: two columns (ticket below the chart).
      - < 768px: single column with section tabs (Chart / Book / Trades) plus a sticky bottom "Trade" button
        that opens the ticket as a bottom sheet.
- [ ] 6.3 **Live data**: gateway WebSocket fan-out `/ws/v1/stream` (one upstream connection, many clients). Reconnect
      with backoff, 2s polling fallback, visible "Stale" badge after 5s without data. Private channels (orders,
      balances) require the token and are tenant-scoped.
- [ ] 6.4 **States on every panel**: loading skeleton (reference skeleton primitive), empty, error with a working Retry,
      offline banner with "Reconnect now". Guests see the ticket with "Log in to trade" instead of submit.
- [ ] 6.5 **100% reference CSS on this route**: Phase 5.7 must pass on `/market` and `/market/btcusdt`. The route's
      own stylesheet may contain NO color literals, NO font stacks and NO spacing values that are not tokens
      from `reference/tokens.json` or Appendix A.
      V: `node scripts/css-parity.mjs --routes /market,/market/btcusdt` exits 0, and
      `grep -rEn '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' apps/web --include=*.css --include=*.tsx --include=*.ts | grep -v 'styles/tokens.css'`
      returns nothing.
- [ ] 6.6 **Quality floor**: responsive to 360px, visible `:focus-visible` on every control, full keyboard operation,
      `prefers-reduced-motion` honored, no horizontal scroll, safe-area insets applied.

---------------------------------------------------------------------------------------
## PHASE 7: CONTROL WIRING (every button works, in the right place)
---------------------------------------------------------------------------------------
- [ ] 7.1 Implement every control in Appendix B. Save the matrix as `docs/button-matrix.json` (one object per row).
      Every interactive element carries `data-testid="ctl-<ID>"`.
- [ ] 7.2 **Rules for every control:**
      - Correct element and type: `<button type="button">` (or `type="submit"` inside a form); real `<a href>` for navigation.
      - Icon-only controls have `aria-label`. Target size >= 40px (44px on touch). Visible `:focus-visible`.
      - States are implemented: default, hover, active, focus, disabled (with a reason tooltip), loading
        (disabled + spinner), success, error.
      - Double-click safe: disabled while pending; order submit also sends a fresh `Idempotency-Key`.
      - Destructive actions (cancel all, reset theme, rotate secret, suspend tenant) use the down color and a
        confirm dialog. Esc closes dialogs; focus returns to the trigger.
      - Wording: sentence case, verb first, and the toast reuses the same verb ("Save changes" -> "Changes saved").
      - No dead controls: if the backend is not ready, the control is not rendered. No placeholders.
      - Role gating happens in BOTH the UI (hidden) and the API (403). The UI is never the security boundary.
- [ ] 7.3 `scripts/audit-controls.mjs` crawls `/market`, `/market/btcusdt`, `/admin`, `/superadmin` and collects every
      `button, [role=button], [role=tab], a[href], select, input[type=checkbox]`.
      A: every element has a `ctl-` test id present in the matrix, and every matrix row exists in the DOM for its
      role. Zero orphans in either direction.

---------------------------------------------------------------------------------------
## PHASE 8: VALIDATION
---------------------------------------------------------------------------------------
- [ ] 8.1 **Boot checks**: `npm run build && npm run start` brings up 11112 and 22221; `python -m ledger` brings up 11113.
      V: `curl -fsS localhost:11112/readyz && curl -fsSI localhost:22221/market | head -1`
- [ ] 8.2 **Cross-tenant intrusion tests** (automated, all must pass):
      - Token of tenant A + `X-Tenant-ID: beta` -> 403 `TENANT_MISMATCH`.
      - Token of A requesting an order/wallet/user id belonging to B -> 404 (do not reveal existence); logged.
      - Token of A attempting PUT on B's theme or fees -> 403/404, nothing changed (assert DB row unchanged).
      - Raw SQL with no tenant context returns 0 rows (RLS fail-closed).
      - Tenant admin token on `/superadmin/*` -> 403. User token on `/admin/*` -> 403.
      - Inactive tenant and unknown tenant produce identical responses.
      - Webhook secret of A never validates a payload of B.
- [ ] 8.3 **Button E2E**: Playwright spec generated from `docs/button-matrix.json`. Each row performs the click as the
      allowed role, asserts the expected network call and UI result, and asserts a disallowed role cannot
      see or call it.
      V: `npx playwright test controls` shows N passed, where N = number of matrix rows. 0 skipped.
- [ ] 8.4 **Visual and comfort checks**: screenshots of `/market`, `/market/btcusdt` and `/admin` at 375/768/1440 for
      tenants `alpha` and `beta` (two different brand configs) saved to `reports/shots/`. Run axe-core: 0
      serious/critical. Keyboard-only walkthrough of the order flow recorded in `PROGRESS.md`.
- [ ] 8.5 **Theme robustness**: set an invalid color, a low-contrast pair and an SVG logo through the admin UI; each must be
      rejected with a clear message. Change a tenant color and confirm: page, chart and order book update
      without reload and without a flash of the default theme on next load.

---------------------------------------------------------------------------------------
## PHASE 9: FINAL GATE AND REPORT
---------------------------------------------------------------------------------------
Write `docs/IMPLEMENTATION-REPORT.md` containing:
- Per task ID: PASS / FAIL / BLOCKED with the evidence command and its output.
- Matrix coverage: `controls implemented = controls in matrix = controls passing` (all three numbers equal).
- CSS parity: number of diffs, number allowed (each justified).
- Color-literal scan result (empty).
- Contrast table, axe result, intrusion-test summary.
- Deviations from this spec, each with a reason. Open items go to `HARDENING-TODO.md`.
You may report "done" only if there are no FAIL rows and no unexplained BLOCKED rows.

---------------------------------------------------------------------------------------
## APPENDIX A: TOKENS (`apps/web/styles/tokens.css`)
---------------------------------------------------------------------------------------
Colors are final. Non-color values marked FALLBACK are used only when `reference/tokens.json` has no equivalent.

```css
:root {
  color-scheme: dark;

  /* Vice City palette (source: palette image) */
  --vc-ocean-night: #0B0F2B;
  --vc-sunset-pink: #FF5CA8;
  --vc-vice-cyan:   #00F0FF;
  --vc-neon-purple: #BC6CFF;
  --vc-miami-peach: #FFB86B;

  /* Semantic hooks (overwritten by validated tenant config) */
  --wl-primary-color: var(--vc-neon-purple);  /* CTAs, active tab, focus, selection */
  --wl-bg-main:       #0B0F2B;                /* app background (Ocean Night) */
  --wl-bg-surface:    #131838;                /* cards, order book, ticket */
  --wl-bg-raised:     #1B2150;                /* hover rows, popovers, selected */
  --wl-bg-inset:      #0F1333;                /* inputs, wells */
  --wl-text-base:     #ECEAFB;                /* primary text (never pure white) */
  --wl-text-muted:    #9AA0D0;                /* labels, secondary text */
  --wl-border-color:  #2A3163;                /* separators */
  --wl-up-color:      var(--vc-vice-cyan);    /* buy / positive */
  --wl-down-color:    var(--vc-sunset-pink);  /* sell / negative / destructive */
  --wl-warn-color:    var(--vc-miami-peach);  /* favorites, pending, warnings */
  --wl-border-radius: 10px;                   /* FALLBACK: reference radius wins */

  /* Derived (tenants never set these) */
  --wl-on-primary:    var(--wl-bg-main);
  --wl-on-up:         var(--wl-bg-main);
  --wl-on-down:       var(--wl-bg-main);
  --wl-primary-hover: color-mix(in srgb, var(--wl-primary-color) 88%, white);
  --wl-primary-press: color-mix(in srgb, var(--wl-primary-color) 80%, black);
  --wl-primary-soft:  color-mix(in srgb, var(--wl-primary-color) 14%, transparent);
  --wl-up-soft:       color-mix(in srgb, var(--wl-up-color) 12%, transparent);
  --wl-down-soft:     color-mix(in srgb, var(--wl-down-color) 12%, transparent);
  --wl-warn-soft:     color-mix(in srgb, var(--wl-warn-color) 14%, transparent);
  --wl-focus-ring:    0 0 0 3px color-mix(in srgb, var(--wl-primary-color) 45%, transparent);
  --wl-glow:          0 0 14px color-mix(in srgb, var(--wl-primary-color) 28%, transparent);
  --wl-shadow-card:   0 6px 24px rgba(5, 7, 24, .45);   /* FALLBACK geometry */
  --wl-bg-ambient:    radial-gradient(120% 60% at 50% 115%,
                        color-mix(in srgb, var(--wl-primary-color) 14%, transparent), transparent 60%);
}

body {
  background: var(--wl-bg-ambient), var(--wl-bg-main);
  background-repeat: no-repeat;
  color: var(--wl-text-base);
}
::selection { background: var(--wl-primary-soft); }
:focus-visible { outline: none; box-shadow: var(--wl-focus-ring); }

.btn-primary { background: var(--wl-primary-color); color: var(--wl-on-primary); }
.btn-primary:hover  { background: var(--wl-primary-hover); box-shadow: var(--wl-glow); }
.btn-primary:active { background: var(--wl-primary-press); }
.btn-buy  { background: var(--wl-up-color);   color: var(--wl-on-up); }
.btn-sell { background: var(--wl-down-color); color: var(--wl-on-down); }
.btn:disabled, [aria-disabled="true"] { opacity: .45; cursor: not-allowed; box-shadow: none; }

.card  { background: var(--wl-bg-surface); border: 1px solid var(--wl-border-color);
         border-radius: var(--wl-border-radius); box-shadow: var(--wl-shadow-card); }
.input { background: var(--wl-bg-inset); color: var(--wl-text-base);
         border: 1px solid var(--wl-border-color); border-radius: var(--wl-border-radius); }
.text-up   { color: var(--wl-up-color); }    .tint-up   { background: var(--wl-up-soft); }
.text-down { color: var(--wl-down-color); }  .tint-down { background: var(--wl-down-soft); }
.text-warn { color: var(--wl-warn-color); }
.num { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Client runtime override (5.3 fallback path; keys come from the server, already validated):
```javascript
const t = serverConfig.cssVars;   // e.g. { "--wl-primary-color": "#BC6CFF", ... } built server-side
for (const [name, value] of Object.entries(t)) {
  document.documentElement.style.setProperty(name, value);
}
```

---------------------------------------------------------------------------------------
## APPENDIX B: CONTROL MATRIX (every row must be implemented and tested)
---------------------------------------------------------------------------------------
Columns: ID | Where | Control | Click does | Endpoint | Who | States / feedback

MARKET PAGE (`/market`, `/market/<slug>`)
M01 | Pair header   | Favorite star (aria "Add to favorites") | optimistic toggle, rollback on error | PUT/DELETE /user/favorites/:pair | user (guest -> login dialog) | pressed, loading; toast only on error
M02 | Chart         | Timeframe 1m 5m 15m 1h 4h 1D 1W | reload candles, keep `?tf=` in URL | GET /public/markets/:pair/klines?tf= | all | selected, skeleton
M03 | Order book    | Depth toggle Both / Bids / Asks | filter book view | none (client) | all | selected
M04 | Order book    | Precision select | regroup price levels | GET /public/markets/:pair/depth?step= | all | loading
M05 | Order book    | Price cell / qty cell click | fill ticket price (switch to Limit) / amount | none (client) | all | row hover
M06 | Ticket        | Buy / Sell tabs | switch side; submit button label+color change | none (client) | all | selected
M07 | Ticket        | Market / Limit tabs | show or hide price field | none (client) | all | selected
M08 | Ticket        | 25% 50% 75% 100% | amount from available balance, fee-aware, rounded to qty precision | none (client) | user | disabled when no balance
M09 | Ticket        | Submit "Buy BTC" / "Sell BTC" | place order with fresh Idempotency-Key | POST /user/orders | user | idle, validating, submitting, success, error; toast "Order placed"; refresh balances and open orders; field-level errors
M10 | Ticket        | "Log in to trade" (guest only) | open login dialog | none | guest | n/a
M11 | Orders panel  | Cancel (per row) | cancel one order | DELETE /user/orders/:id | user | loading; toast "Order cancelled"
M12 | Orders panel  | Cancel all | confirm dialog, then cancel all for this pair | DELETE /user/orders?pair= | user | confirm, loading; toast "Orders cancelled"
M13 | Bottom tabs   | Open orders / History / Trades / Balances | switch and fetch | GET /user/orders|trades|balances | user | selected, skeleton, empty
M14 | Market list   | Quote tabs | filter list by quote asset | none (client) | all | selected
M15 | Market list   | Sort headers (name, price, change, volume) | sort asc/desc, aria-sort | none (client) | all | active arrow
M16 | Market list   | Search clear (x) | clear query | none (client) | all | hidden when empty
M17 | Market list   | Favorites filter | show favorites only | GET /user/favorites | user | selected
M18 | Market list   | Row click | navigate to `/market/<slug>` (real link) | none | all | current row marked
M19 | Any panel     | Retry (error state) | refetch that panel | panel's own GET | all | loading
M20 | Banner        | Reconnect now | force WebSocket reconnect | /ws/v1/stream | all | connecting
M21 | Top bar       | Log in / Sign up | open auth dialog | none | guest | n/a
M22 | Top bar       | User menu > Log out | revoke refresh token, clear state, stay on page as guest | POST /auth/logout | user/admin | loading; toast "Logged out"
M23 | Mobile        | Section tabs Chart / Book / Trades | switch section | none | all | selected
M24 | Mobile        | Sticky "Trade" + sheet close (X, Esc, backdrop) | open/close ticket sheet, focus trap | none | all | open/closed

AUTH DIALOG
A01 | Auth | Log in / Create account (submit) | authenticate | POST /auth/login or POST /auth/register | guest | loading, inline error
A02 | Auth | Show/hide password | toggle input type | none | guest | pressed
A03 | Auth | Switch Log in <-> Sign up | swap form | none | guest | n/a
A04 | Auth | Close | close dialog, focus returns to trigger | none | guest | n/a

TENANT ADMIN (`/admin`)
T01 | Theme   | Save changes | validate + persist theme, live preview already shown | PUT /admin/theme | admin | disabled until dirty; 422 shows failing pair; toast "Changes saved"
T02 | Theme   | Reset to default | confirm, restore Vice City defaults | POST /admin/theme/reset | admin | confirm; toast "Theme reset"
T03 | Theme   | Upload logo | upload png/webp/jpg <= 512 KB | POST /admin/theme/logo | admin | uploading, error
T04 | Theme   | Color inputs (hex field + swatch) | live preview, inline validation | none (client) | admin | invalid state
T05 | Fees    | Save fees | persist commission | PUT /admin/fees | admin | toast "Fees saved"
T06 | Markets | Enable/disable market toggle | toggle tenant_markets row | PATCH /admin/markets/:pair | admin | pending, rollback on error
T07 | KYC     | Approve / Reject (reject requires a reason) | change kyc_status, write audit log | POST /admin/kyc/:id/approve|reject | admin | confirm on reject
T08 | Webhook | Rotate secret | confirm, show new secret once | POST /admin/webhook/rotate-secret | admin | confirm; one-time reveal
T09 | Webhook | Copy secret | copy to clipboard | none (client) | admin | "Copied" for 2s
T10 | Webhook | Send test webhook | enqueue signed test event, show delivery result | POST /admin/webhook/test | admin | pending, success/failed

SUPERADMIN (`/superadmin`)
S01 | Tenants | Create tenant | create tenant + first admin, show credentials once | POST /superadmin/tenants | superadmin | validating, success
S02 | Tenants | Suspend / Activate | confirm, set `is_active` | PATCH /superadmin/tenants/:id | superadmin | confirm; audit
S03 | Tenants | Change billing tier | persist tier | PATCH /superadmin/tenants/:id | superadmin | toast "Tier updated"
S04 | Analytics | Date range buttons | refetch cross-tenant stats | GET /superadmin/analytics?range= | superadmin | selected, skeleton
