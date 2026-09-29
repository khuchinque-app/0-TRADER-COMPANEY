You are the coding agent for this product. Read this entire message before doing anything.

ROLE FOR THIS TASK:
I am the CUSTOMER. I am describing the product I want built. You are the ENGINEER.
Do not redesign, do not "improve", do not replace the flow with your own idea.
Your job is to absorb the structure below as the product spec, then ask me
clarifying questions before writing any code.

WHAT THIS DOCUMENT IS:
A customer-facing workflow structure — the path a real user takes from landing
page to dashboard, plus every menu, sub-menu, and popup in the authenticated
product, and the backend route each UI element talks to.

SOURCE OF TRUTH:
Treat the structure below as the acceptance target for Rung 0 / Rung 1.
If your existing repo docs (CONTEXT.md, findings.md, etc.) disagree, the
structure below WINS for navigation, menus, and route naming. Flag any conflict
you find — do not silently reconcile it.

═══════════════════════════════════════════════════════════════════════
CUSTOMER JOURNEY (unauthenticated → authenticated)
═══════════════════════════════════════════════════════════════════════

1. Landing / Welcome Page
   - Hero, value prop, market preview
   - Top-right: [ Sign Up ] [ Log In ]

2. Sign-Up
   - Google OAuth OR Email
   - Cloudflare Ray ID + Turnstile / reCAPTCHA
   - Backend captures Gmail / email → saves user record (status=pending)
   - Issue short-lived signup_session token

3. WhatsApp Phone Verification
   - Input phone (international, E.164 normalized)
   - Backend sends OTP via WhatsApp Business API
   - User enters OTP → backend verifies → links phone ↔ Gmail on same user row
   - Mark phone_verified=true, status=active
   - Issue session JWT (httpOnly) + refresh token

4. Redirect to /dashboard (authenticated)

═══════════════════════════════════════════════════════════════════════
DASHBOARD — LEFT NAV (11 items)
═══════════════════════════════════════════════════════════════════════

  1. Marketplace        → Spot trading, various pairs
  2. Wallet             → Deposit, withdraw, portfolio management
  3. Quick Buy/Sell     → Simplified trading for beginners
  4. Recurring Invest   → Automated periodic purchases
  5. Staking            → Earn rewards on held assets
  6. Authenticator App  → 2FA / security management
  7. Help / Support     → Support center
  8. Learn / Blog       → Educational content
  9. Mobile App         → Download links
 10. Education          → (customer's own module)
 11. Invest in AI       → (customer's own module)

═══════════════════════════════════════════════════════════════════════
DASHBOARD — TOP-RIGHT PROFILE POPUP (9 items)
═══════════════════════════════════════════════════════════════════════

  1. Profile & Setting
  2. Security
  3. Address Management   ← selected/default focus
  4. Mobile App
  5. Trade API
  6. History
  7. INDODAX Referral
  8. Dark Mode
  9. Log Out

═══════════════════════════════════════════════════════════════════════
BACKEND ROUTE MAP (UI element → service)
═══════════════════════════════════════════════════════════════════════

Left nav:
  Marketplace        → /api/market/*, /api/orders/*, /api/fills, /ws
  Wallet             → /api/wallet/*
  Quick Buy/Sell     → /api/quick/*
  Recurring Invest   → /api/recurring/*
  Staking            → /api/staking/*
  Authenticator App  → /api/2fa/*
  Help / Support     → /api/support/*
  Learn / Blog       → /api/content/*
  Mobile App         → /api/app/*, /download
  Education          → /api/education/*
  Invest in AI       → /api/ai/*

Profile popup:
  Profile & Setting  → /api/me, /api/me/preferences, /api/me/avatar
  Security           → /api/security/*  (password, email, phone, sessions, 2FA, activity)
  Address Mgmt       → /api/addresses/* (+ withdraw-whitelist)
  Mobile App         → /api/app/*
  Trade API          → /api/api-keys/*
  History            → /api/history/*   (orders, fills, tx, deposits, withdrawals, pnl, export)
  INDODAX Referral   → /api/referral/*
  Dark Mode          → PATCH /api/me/preferences { theme }
  Log Out            → /api/auth/logout, /api/auth/logout-all

Backend services:
  auth-service       → /api/auth/*, /api/me, /api/security/*, /api/api-keys/*
  ledger-service     → /api/wallet/*, /api/history/*, referral settlements
  engine-service     → /api/market/*, /api/orders/*, /api/fills
  order-router       → /api/quick/*
  scheduler-service  → /api/recurring/*
  staking-service    → /api/staking/*
  support-service    → /api/support/*
  cms-service        → /api/content/*
  release-service    → /api/app/*, /download
  education-service  → /api/education/*
  ai-invest-service  → /api/ai/*
  gateway            → /ws

═══════════════════════════════════════════════════════════════════════
HARD RULES AT THE EDGE (apply to every route)
═══════════════════════════════════════════════════════════════════════

- Auth middleware on every /api/* EXCEPT:
    /api/auth/*, /api/market/ticker, /api/content/*,
    /api/support/faq, /download
- Idempotency-Key required on all POST/PATCH that move money or security state:
    /api/orders, /api/quick/execute, /api/wallet/*,
    /api/recurring, /api/staking/subscribe, /api/ai/subscribe,
    /api/addresses, /api/api-keys, /api/referral/claim,
    /api/auth/logout*
- 2FA step-up required for:
    change password, change email/phone, revoke session,
    delete address, revoke API key, enable withdraw whitelist
- Rate limit per user + per IP on auth, order, withdraw routes
- SIMULASI badge enforced server-side on every money-touching response
  while Rung 1 paper mode is active. Address Management and Referral
  earnings are SIMULASI only — no real chain, no real payout.
- Audit log row on every auth event, order event, security action,
  and ledger mutation. Same ray_id carried from signup through every row.
- CSS and JS are a must. The visual design of the website is important; look inside the folder ENDGOAL-PROJECT for reference.

═══════════════════════════════════════════════════════════════════════
WHAT I WANT FROM YOU RIGHT NOW (before any code)
═══════════════════════════════════════════════════════════════════════

1. Read the current TRADING-COMPANEY/PLANNING project folder. Do NOT modify anything yet.
2. Map what already exists vs what this structure requires.
   Output a table: Route | Exists? | Matches spec? | Delta.
3. List every conflict between this structure and your existing repo docs
   (CONTEXT.md, findings.md, ADRs). Do not resolve conflicts — list them.
4. Ask me direct questions. One question per line, numbered.
5. If there is no answer, always write your questions to a file named q1q5.txt and leave it there. If by the time you scan again it is gone, look nearby for the file answerq1q5.txt. THIS IS 100% HONEST AND TRUE.
6. If q1q5.txt is still there, then proceed with what you think is best!
7. The goal target and finish line are documented in ENDGOAL-PROJECT/ENDGOAL-PROJECT.TXT.

TONE: direct, no filler, no praise, no restating my message back to me.
RULES: one logical change per commit, test before commit, no full-file rewrites,
checkpoint the dirty tree before starting. If a file write times out,
check the file before retrying — timeouts often succeeded.

═══════════════════════════════════════════════════════════════════════
SWARM DELEGATION & UNSTOPPABLE AUTONOMOUS EXECUTION
═══════════════════════════════════════════════════════════════════════

- SWARM CAPABILITY: You are authorized and required to spawn/delegate sub-tasks to swarm specialized agents (code-reviewer, test-runner, spec-auditor) whenever parallel processing, linting, or independent verification is needed.
- AUTONOMOUS CONTINUOUS EXECUTION: The user is AWAY. Do NOT stall, pause, or wait for manual human confirmation between steps once the initial plan is established.
- AUTONOMOUS WORKFLOW LOOP:
    1. Read & create initial PLAN-TO-DO.md. If PLAN-TO-DO.md already exists, do not recreate it; just append the new list of tasks.
    2. Every time you complete a task from PLAN-TO-DO.md, ALWAYS call your swarm code-reviewer agent to review your work and to update PLAN-TO-DO.md.
    3. Execute tasks sequentially: `Think → Code → Swarm Test Verify → Commit`.
    4. Automatically move to the next item in PLAN-TO-DO.md without stopping.
    5. Continue looping autonomously until all Phase 1 stabilization tasks are 100% completed and green.
    6. Workplace only inside ~/projects/TRADING-COMPANEY in Ubuntu - no writing code outside this project!
    7. The sitemap-complete folder is a main target for copy — refer to it for architectural references and components.
- HARD SAFETY BREAKS: Only halt execution if an unrecoverable git/system error occurs or if a critical destructive conflict is found.

Begin where you left off.
