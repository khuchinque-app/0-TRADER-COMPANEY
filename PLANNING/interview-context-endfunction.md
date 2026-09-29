# interview-result.md — Founder interview, 2026-09-26

Purpose: durable proof + memory of the founder's answers about what this project
*is*, its functions, and its end goal. Produced with the `grilling` skill
(mattpocock/skills). Read this before resuming work; it supersedes guesses.

Interviewer: Buffy (Freebuff coding agent).
Interviewee: founder ("etern" / chinque).

---

## 0. What the project actually is (verbatim intent)

> "my goal is to create my own company. this company basically is trading crypto.
> look into indodax and tokocrypto for whole function. (but I'm add the AI in here)."

- **Product:** the founder's *own* crypto-trading company — not a clone, a real
  venue to operate. Indonesian market context.
- **Function reference:** INDODAX + Tokocrypto define the *functional surface*
  (what the product must be able to do). The style kit in
  `PLANNING/ENDGOAL-PROJECT/sitemenu-complete-style-grafik/` defines the *look*.
- **Differentiator:** AI is added on top (Invest in AI module + AI panel).
- **"Complete this project" means:** work in the root `TRADING-COMPANEY/` folder
  is the whole project — the entire repo (engine + terminal + shared + all
  modules), end to end. No scope reduction.

## 1. Answers (round 1 of the interview)

| # | Question | Answer |
|---|----------|--------|
| Q1 | Finish line / meaning of "complete" | The whole `TRADING-COMPANEY` folder is the project. Build the full INDODAX/Tokocrypto function surface + AI. No "demo-only" cut-down. |
| Q2 | Real provider keys now, or simulated seams? | **Simulated seams behind flags.** Swap real Google/Turnstile/WhatsApp credentials later. |
| Q3 | Which visual reference wins? | **Terminal for trading**; design taken from the ENDGOAL folder style kit (`sitemenu-complete-style-grafik`). For the **dashboard / marketplace view, follow INDODAX**. |
| Q4 | Does `/dashboard` require login? | **Yes — login required.** Founder asked for a seeded dev account: **username `chinque`, password `admin1`**. |
| Q5 | Market data: live or offline-safe? | **Live only.** (No mock fallback wanted; demo requires internet.) |
| Q6 | Referral label | **Genericize** — drop "INDODAX" trademark, label it `Referral`. |
| Q7 | Next module priority | **Staking and Invest in AI first** — prioritize their UI, styling, and basic routing so there is a tangible, good-looking product on screen. |

## 2. Decisions that follow (derived, to be executed)

1. **Auth becomes mandatory for the authenticated product.** `/dashboard/*` sits
   behind the session JWT; the landing page remains public with Sign Up / Log In.
   The existing guest demo is no longer the primary path. This must be done
   without breaking the paper-venue contract or the existing green test suite
   (guest behaviour is env-gated via `AUTH_ENABLED`; flip the default carefully
   and update tests that assumed guest-open defaults).
2. **Seed dev account:** username `chinque` / password `admin1`, status active,
   phone verified, funded demo ledger. Current auth is email+password, so either
   add a username alias or seed `chinque` as the login handle. Flagged as an
   action item below.
3. **Look rule:** trading terminal = the style kit's dark tokens (already
   adopted); dashboard/marketplace layout = INDODAX-inspired. Marketing/auth
   pages use the same style-kit language, not the neon dribbble palette.
4. **Data rule:** remove/retire the mock-ticker fallback in
   `apps/terminal/lib/api-client.ts`; treat "live only" as the contract.
5. **Referral rename:** `INDODAX Referral` → `Referral` in `lib/nav.ts` and any
   page copy.
6. **Next build order:** Staking UI + routing, then Invest in AI UI + routing,
   each with SIMULASI labels and basic backing routes.

## 3. Open questions (next rounds — not yet answered)

These are the frontier items still unsettled; do not guess, ask before assuming:

- O1. Dev account: is `chinque` a *username* or an email? What email should back
  it, and should it be exempt from OTP phone verification (dev convenience)?
- O2. Login-required scope: does the **landing page** stay public (yes, implied),
  and do `/login` + `/signup` remain reachable while logged out only?
- O3. With "live only", what is the UX when the feed is unreachable — empty
  states + retry, or a hard banner? (No mock data to fall back on.)
- O4. INDODAX marketplace view: approximate their *layout* (order book + chart +
  order form + account rail) or literally mirror their mobile app screens?
- O5. Company identity: brand name, logo, colors beyond the style kit — needed
  for a professional-looking product; not provided yet.
- O6. AI module: what does "Invest in AI" *do* — simulated strategies,
  AI-generated signals from the ported indicators, or a managed-portfolio
  subscription? (Current AiPanel reads real computed indicators.)
- O7. Staking: fixed APR plans with simulated accrual, or a real schedule the
  scheduler posts to the ledger?

## 4. Status snapshot at interview time

- Typecheck green; engine suite **149/149** passing.
- Engine: feed → matcher → SQLite double-entry ledger; auth journey
  (signup → WhatsApp OTP → session JWT) live behind flags; wallet, orders,
  quick, `/api/me` + preferences (shipped this session).
- Terminal: landing, login, signup, dashboard shell (11-item left nav +
  9-item profile popup), marketplace / wallet / quick / profile pages; other
  sections render an honest placeholder.
- Commits this session: `5dc7a50` (engine `/api/me`), `0f29341` (terminal
  Profile & Setting + Dark Mode).

---

### EXTRA - for function and for business and marketing purpose :

1. Tagline Bitcoin & Masa Depan (Fokus: Low Barrier Entry & FOMO)
Pilihan Headline (Landing Page / Banner):

"Tahu kan Bitcoin harganya naik terus? Jangan cuma jadi penonton. Mulai amankan masa depanmu (sampai ke cucu!) cuma modal Rp10.000!"

Pilihan Push Notification / Micro-copy:

"Beli Bitcoin tak perlu nunggu kaya. Cuma 10 ribu rupiah, kamu sudah punya aset masa depan."

2. Tagline Program Investasi AI (Fokus: Kemudahan & Trust)
Pilihan Headline (Landing Page / Banner):

"Mau dapet untung dari tren AI tapi bingung mulai dari mana? Biar kami yang lakukan risetnya, kamu tinggal nikmati hasilnya."

Slogan Utama (Hero Banner / Module AI):

"Dana Anda. Riset Kita. AI Kita Bersama."
(Investasi langsung ke dalam pool pengembangan AI — transparan, otomatis, dan tanpa ribet).

Penyesuaian Fitur di Aplikasi (Translasi Strategi ke Produk)
Agar janji manis di tagline selaras dengan aplikasi saat dibuka investor/pengguna, tiga hal ini perlu dipastikan ada di front-end:

Batas Minimal Transaksi Rp10.000:

Di modul Quick Buy/Sell dan Marketplace, pastikan validasi input nominal mendukung angka minimum Rp10.000 (atau setara fractional crypto).

Dashboard "AI Vault / AI Pool":

Buat modul Invest in AI terasa seperti staking pool atau reksa dana kripto. Pengguna bisa melihat persentase imbal hasil (APY/Yield), grafik pertumbuhan riset, dan tombol "Invest Sekarang (Mulai Rp10rb)".

Pilihan Pasangan IDR (Rupiah Gateway):

Sama seperti Indodax/Tokocrypto, tampilan harga utama di terminal/marketplace sebaiknya berbasis IDR (misal: BTC/IDR, ETH/IDR) untuk menjaga keakraban pengguna lokal.
