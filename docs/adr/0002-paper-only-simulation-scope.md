# 0002 — Paper-only simulation: no real money, custody, or execution

- Status: accepted
- Date: 2026-09-23
- Deciders: founder (Q4 of the round-1 grill, explicit), co-developer by agreement

## Context
The endgame is a licensed PAKD (Rung 3, see `findings1.md`), but that requires IDR 100B paid-up
capital, OJK licensing, and OJK/PPATK compliance. Operating a real venue without the license is
criminal under UU P2SK Art. 304 (5–10 years + IDR 1B–1T fine). Rung 0 exists to build a real,
public, trusted product layer **without touching any of that risk surface**.

## Decision
The demo venue is **simulation-only**, as a permanent property of Rung 0, not a phase:
- No real funds, no custody, no fiat on/off-ramp, no real order execution.
- Balances are fictional demo funds; fills are against a simulated book seeded from reference prices.
- Reference data is always labeled ("reference data / demo / not a real venue / not financial advice").
- The UI, ledger, and APIs are built so the simulation boundary is a *seam*: the real venue
  (Rung 3) reuses the product layer and swaps the execution + custody adapters.

## Consequences
- ✅ Zero legal/capital exposure; shippable by two devs; safe to brand publicly in Indonesia.
- ✅ The matching engine, OMS, ledger, and terminal are genuinely buildable — the hard parts of a
  real PAKD — so the demo is real engineering evidence, not a mockup.
- ⚠️ A marketing risk: users must clearly understand it is not a real exchange or they will
  arrive expecting real trading; disclaimers are load-bearing, not cosmetic.
- ⚠️ We deliberately give up real-venue realism (liquidity depth, maker/taker fees) in the demo;
  the synthetic maker approximates it.
