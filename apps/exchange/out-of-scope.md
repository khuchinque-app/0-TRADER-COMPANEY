# Out of scope — HollaEx adapter

The following HollaEx Kit surfaces are **deliberately not called** by the
exchange adapter unless the owner explicitly authorizes it. They require auth
and/or move money, so they stay out of this read-only integration.

| Surface | Why excluded |
| :--- | :--- |
| `/v2/admin` | Exchange administration lives in HollaEx's built-in admin panel, not a custom route. |
| `/v2/user` | Auth, profile, 2FA — auth is handled by the Kit separately. |
| `/v2/wallet` | Balances / deposits / withdrawals — funds. |
| `/v2/withdrawal` | Moves funds. |
| `/v2/deposit` | Moves funds. |
| `/v2/login`, `/v2/register` | Account lifecycle — no custom auth flow. |

Also obsolete and intentionally left untouched:

- `apps/backend/` — replaced by HollaEx Kit.
- `apps/engine/` — replaced by HollaEx Kit's matching engine.
- Any `initDb` / SQLite `ledger.db` code.

If order placement or wallet reads become required, the adapter should gain
explicitly authorized methods that read `HOLLAEX_API_KEY` / `HOLLAEX_API_SECRET`
from server env only (never bundled).
