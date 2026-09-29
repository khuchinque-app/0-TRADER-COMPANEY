# CONTEXT — Trading-Crypto-Company (paper-trading demo)

**Scope:** a Rung-0 *paper-trading* crypto venue, Indonesian flavor. Public demo target ~3 weeks.
Team = two dev-capable humans (founder + co-developer). Endgame (licensed PAKD / Rung 3) is
documented as deferred, NOT part of this build. See `.planning/findings.md` for the options ladder.

**Visual reference:** Bitget's spot-trading terminal (cues, not a pixel-clone / not their brand).
**Data:** reference prices from public Binance/Bybit feeds, clearly labeled.

## Glossary (domain terms only — no implementation detail)

- **Demo venue** — our product. A simulation of a crypto exchange: users place *simulated*
  orders; a matching engine fills them against live *reference* prices; balances are fictional.
  No real money, custody, or fiat.
- **Reference data** — market prices pulled from external public exchange APIs (Binance/Bybit),
  used to price the simulation. Always labeled "reference / not our own book / not a real venue."
- **Asset** — a tradeable digital asset in the demo (BTC, ETH, USDT, ...). Indonesian-flavored list.
- **Simulated balance / demo funds** — the fictional starting funds in a user's demo wallet.
- **Rung 0 / Rung 3** — options ladder from `.planning/findings.md`. Rung 0 = shippable product layer now;
  Rung 3 = owning a licensed PAKD (deferred endgame).

## Locked facts & decisions (grill round 1, 2026-09-23)
- Scope = paper-trading venue now; licensed PAKD (Rung 3) is the deferred endgame.
- Simulation-only hard line: no real money, custody, or execution (ADR 0002).
- Team = 2 dev-capable humans: founder + co-developer (boss is also a dev).
- Target = public demo in ~3 weeks.
- Stack delegated to agent: Next.js/TS UI, Node, SQLite ledger (ADR 0001).
- Visual reference = **Bitget** spot terminal; Indonesian asset flavor; reference prices via public feeds.
- Terminal = 3-pane Bitget shape (orderbook+chart left ~80%, order-form+account right ~20%).
- Pairs: internal quote = USDT; IDR is a labeled **display toggle** (Q7), not an internal currency.
- MVP order types = **market + limit** only (stop/OCO deferred); fills against a synthetic book
  + simulated maker; flat maker/taker fee (Q9).
- Accounts = guest demo (stable browser id → demo funds), ledger keeps per-user rows so real
  accounts are a clean add-on later (Q8).
- Asset shortlist: BTC, ETH, SOL, BNB, XRP, LINK (AAVE fallback).
- Chart lib = `lightweight-charts`; depth bars = our own CSS.

## Resolved domain terms (settled in rounds 1–2, 2026-09-23)
- **Order** — a simulated buy/sell instruction placed by a demo account. MVP types: *market*
  and *limit* only.
- **Fill** — the execution of an order against the synthetic book; emits a ledger posting.
- **Position / Holdings** — the base-asset balances a demo account currently holds.
- **Order Book** — the synthetic bids/asks the terminal shows; in the demo it is seeded from
  the reference mid, not a real order flow.
- **Ticker** — the 24h reference price stats shown in the asset strip.
- **Demo account** — the guest, funded-by-fiction identity a browser carries (stable user id).
- **Market trades / tape** — the recent-fill scroll below the book (simulated maker fills).

## Still open
- **Color convention**: green-up (Western, recommended) vs. Indonesian red-up. Kept as a
  config flag `COLOR_CONVENTION`; not yet decided.
