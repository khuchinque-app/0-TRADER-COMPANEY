# 0001 — SQLite for the demo double-entry ledger (Postgres-compatible schema)

- Status: accepted
- Date: 2026-09-23
- Deciders: founder + co-developer, with agent driving

## Context
The demo venue's financial spine is a double-entry, ACID ledger (from `findings1.md` and the
notebook). The MVP target is ~3 weeks on two dev-capable humans, and this dev box has **no
local Postgres and no Docker** (verified 2026-09-23). A managed Postgres is not available to
iterate against in Rung 0.

## Decision
Use **SQLite** as the ledger store for the demo. The ledger schema is written
**Postgres-compatible** (typed decimals, `TIMESTAMPTZ`-friendly timestamps, no SQLite-only
column types), so the later migration to Postgres is a `VACUUM`-free re-import, not a rewrite.
Fees/slippage and per-user balances are off-chain sub-ledger rows — nothing touches a real
chain in the demo.

## Consequences
- ✅ Zero-ops, shippable in 3 weeks; any dev can stand up the ledger with no DB install.
- ✅ One-writer file → matches a single demo process; row-locking semantics are simple.
- ⚠️ SQLite is single-writer; if the demo later runs multi-replica or needs heavy concurrent
  writes, we migrate to Postgres — the schema stays, the driver swaps (an adapter at the seam).
- ⚠️ "Postgres-compatible" is enforced by review, not the toolchain; keep a CI check or a
  `docker run` Postgres smoke test once available.
