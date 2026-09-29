# DECISIONS-LOG — durable decisions from the founder (etern)

Authoritative log (memory store is size-capped; this file is not). Newest first.

## 2026-09-27 — grill round 2 (answerq1q5.txt A1–A5 — consumed, file deleted)
1. A1: proceed straight into journey/dashboard tasks; founder manually ticks the
   4 Phase-1 boxes during his next sweep; do NOT halt execution waiting for them.
2. A2: backend = STUB for now — just enough happy-path logic so frontend clicks
   work seamlessly; real SQLite logic comes later.
3. A3: priority = journey + dashboard shell first, then jump straight to
   "Invest in AI" + "Staking" (both now built); profile, security, static
   content modules de-prioritized.
4. A4: auth flows stay strictly behind AUTH_ENABLED flag; guest demo must stay
   green and frictionless for investor presentations.
5. A5: keep core Bitget terminal look for trading UI; landing page + dashboard
   shell heavily localized to Indonesian market (Tokocrypto/Indodax style) with
   marketing hooks "Invest in AI" vault and "Mulai dari Rp10.000" prominent.

## 2026-09-26 — founder interview (round 1, grilling skill) — full record in `interview-result.md`
1. Project = the founder's OWN crypto company; INDODAX + Tokocrypto define the
   FUNCTION surface, plus AI added on top. "Complete this project" = the whole
   `TRADING-COMPANEY` repo, no scope cut-down. Root folder is the project.
2. Provider credentials stay SIMULATED SEAMS behind flags (real keys later).
3. LOOK: terminal for trading (style kit `sitemenu-complete-style-grafik`);
   dashboard/marketplace view follows INDODAX. New pages use the style-kit
   language, not the neon dribbble palette.
4. AUTH now REQUIRED for the product (/dashboard behind login). Seed a dev
   account: username `chinque`, password `admin1`.
5. Market data = LIVE ONLY (retire the mock-ticker fallback).
6. Referral label genericized: `INDODAX Referral` → `Referral`.
7. Next priority: UI/styling/routing for **Staking** then **Invest in AI**,
   tangible on screen. Open questions O1–O7 recorded in `interview-result.md`.

## 2026-09-26 — grill round (q1q5.txt → answerq1q5.txt)
1. "ENDGOAL-PROJECT" is just a codename/target for motivation. The locked visual
   reference stays as-is: Bitget spot terminal, 3-pane shape (CONTEXT.md decision).
   No conflict with sitemenu structure — structure governs NAV/ROUTES, Bitget
   governs LOOK.
2. INDODAX Referral naming: change/genericize is fine, small problem, user noticed.
3. External credentials (WhatsApp Business API, Cloudflare Turnstile, Google OAuth):
   "least in my mind" — build SIMULASI seams, never block on real keys. What the
   user cares about: the site LOOKS PROFESSIONAL AND TRUSTED.
4. Route renaming (userId-in-path vs session-scoped): "not important" → keep
   existing :userId paths, no breaking renames.
5. Guest mode vs auth journey: same answer as 3 — do not block; auth journey is
   built behind flags, demo stays functional.
6. Single process vs 12 services: "do as you want. I really care about the results."
7. Phase 1 must be 100% completed and green BEFORE Rung-1 page work. Founder's
   principle: "If 1 bad structure or single wrong code gets skipped, it can become
   dangers. In the end, we're handling people's money. Customer trust is our
   BREATH — have a little bug, we die that day." → structural strictness mandatory;
   no skipping verification lanes.

## Standing protocol (from PLANNING/RULE.md, restated here so it survives memory pressure)
- PLAN-TO-DO.md: swarm code-reviewer subagent is the ONLY writer of task text
  (dispatch after EVERY completed task). Coding agent proposes; reviewer corrects.
- The coding agent NEVER ticks, adds, or removes checkboxes. The USER ticks [x]
  as the acceptance gate.
- Every 3rd write/update of the list = full project verification sweep
  (find + fix bugs/gaps) before appending new items.
- Session start: checkpoint dirty tree → read TASK.md/PLANNING/ENDGOAL-PROJECT →
  grill via q1q5.txt (gone → answerq1q5.txt; still there → proceed autonomously)
  → append PLAN-TO-DO → swarm review → execution loop
  (think → write small → verify → commit). Never commit red. >2 files or
  >100-line diff without a test run = split/halt.
