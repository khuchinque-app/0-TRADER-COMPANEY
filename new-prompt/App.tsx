--- src/App.tsx (原始)
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-medium shadow-lg shadow-blue-900/30">
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-3 pb-2 border-b border-gray-700/50 flex items-center gap-2">
        <span className="text-blue-400 text-lg">◆</span> {title}
      </h2>
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 font-mono">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 bg-gray-900/80 overflow-x-auto text-xs text-green-400 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StatusBadge({ status, label }: { status: 'done' | 'partial' | 'todo' | 'running'; label: string }) {
  const colors = {
    done: 'bg-green-900/40 text-green-300 border-green-700/50',
    partial: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    todo: 'bg-gray-800 text-gray-400 border-gray-700',
    running: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  };
  const icons = { done: '✅', partial: '⚠️', todo: '⬜', running: '🔄' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${colors[status]}`}>
      {icons[status]} {label}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const fullPrompt = `# COMPREHENSIVE PROJECT PROMPT: 0-TRADER-COMPANEY
# Indonesian Paper-Trading Crypto Exchange Platform

## PROJECT IDENTITY
- **Name:** 0-TRADER-COMPANEY (Trading-Crypto-Company)
- **Type:** Paper-trading crypto venue (simulation, no real money)
- **Visual Reference:** Bitget spot-trading terminal
- **Language:** Indonesian flavor (Bahasa Indonesia UI)
- **GitHub:** https://github.com/khuchinque-app/0-TRADER-COMPANEY
- **VPS:** 187.127.178.20 (user: khuchinque)
- **Team:** 2 developers (founder + co-developer)
- **Status:** Phase 1 COMPLETE - Production Ready (Paper Trading)

## CURRENT ARCHITECTURE (as of Oct 4, 2026)

### Running Services (PM2 managed)
| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Backend API | 11110 | ✅ Running | Express + Auth + Admin + FX Rate |
| Terminal Frontend | 22220 | ✅ Running | Next.js dashboard (customer-facing) |
| Trading Engine | 3001 | ✅ Running | WebSocket + matching engine |
| Static Files | 2217 | ✅ Running | ChinQue-Cripto design system |

### Monorepo Structure
\`\`\`
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/          # Express API (port 11110)
│   │   └── src/routes/   # auth.ts, admin.ts, fx-rate.ts
│   ├── engine/           # Trading engine (port 3001)
│   │   ├── src/server/   # auth.ts + 11 route files
│   │   └── data/ledger.db  # SQLite database
│   └── terminal/         # Next.js frontend (port 22220)
│       ├── app/          # pages (login, signup, dashboard, admin)
│       ├── components/   # account, book, chart, orderform, shell, tabs, topbar
│       └── lib/          # api-client.ts, ws-client.ts, format.ts
├── packages/shared/      # Shared types (domain.ts, api.ts, config.ts)
├── docs/                 # ADR, design system, runbook, research
├── PLANNING/             # 20+ planning docs, ENDGOAL-PROJECT
├── scripts/              # deploy.sh, smoke.sh, smoke-test.py
├── ops/                  # OPS-LOG.md
├── ecosystem.config.js   # PM2 config
├── docker-compose.yml    # Docker setup
└── package.json          # npm workspaces root
\`\`\`

## DATABASE SCHEMA (SQLite: apps/engine/data/ledger.db)
\`\`\`sql
users (id, username, email, password_hash, otp_secret, is_admin, two_fa_enabled, created_at)
wallets (id, user_id, asset, balance, frozen_balance)
orders (id, user_id, pair, side, type, price, quantity, status, created_at)
journal (id, transaction_id, account_id, asset, debit, credit, created_at)  -- double-entry
audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)
recurring_plans (DCA plans)
deposit_addresses
withdrawal_whitelist
referrals
support_tickets
api_keys
payment_invoices (Duitku integration)
education_content
\`\`\`
- 21 tables total, 20 users, 409 balances, 12 orders
- WAL mode enabled, integrity checks pass

## API ENDPOINTS

### Backend (Port 11110)
\`\`\`
POST /api/auth/login          → JWT token
POST /api/auth/register       → Create user
POST /api/auth/signup         → 201 Created
GET  /api/auth/me             → User data
POST /api/auth/otp/verify     → OTP verification
POST /api/auth/logout         → Clear session
GET  /api/admin/stats         → {users:21, orders:14, simulasi:true}
GET  /api/admin/users         → User list
POST /api/admin/users         → Create user
PUT  /api/admin/users/:id     → Update user
DELETE /api/admin/users/:id   → Delete user
POST /api/admin/users/:id/adjust → Balance adjustment
GET  /api/admin/audit         → Audit log
GET  /health                  → Health check
GET  /api/status              → System overview
GET  /api/frontend/status     → Frontend status
POST /api/frontend/restart    → Restart frontend
GET  /api/fx-rate             → Indodax USDT/IDR rate
\`\`\`

### Engine (Port 3001)
\`\`\`
WS   /ws                      → WebSocket (live prices, orders)
GET  /api/tickers             → Market tickers
GET  /api/market/:pair        → Market details
POST /api/orders              → Place order
GET  /api/orders              → Get orders
DELETE /api/orders/:id        → Cancel order
GET  /api/wallet/:userId      → Wallet balance
GET  /api/portfolio           → Positions + PnL
POST /api/wallet/deposit      → Create deposit
GET  /api/wallet/faucet       → Free test funds (1000 USDT)
GET  /api/recurring/*         → DCA plans
GET  /api/addresses/*         → Deposit addresses
GET  /api/history/*           → Transaction history
GET  /api/referral/*          → Referral system
GET  /api/security/*          → Security settings
GET  /api/2fa/*               → 2FA management
GET  /api/api-keys/*          → API key management
GET  /api/education/*         → Learning content
GET  /api/support/*           → Help center
GET  /api/mobile-app          → Mobile download
POST /api/payment/*           → Duitku payment (sandbox)
\`\`\`

### Terminal (Port 22220) - Next.js Pages
\`\`\`
GET  /                        → Landing page (Indonesian hero)
GET  /login                   → Login page
GET  /signup                  → Registration page
GET  /dashboard               → Trading dashboard (307 → auth if not logged in)
GET  /dashboard/trade         → Trade section
GET  /dashboard/wallet        → Wallet section
GET  /dashboard/ai            → AI Vault investment
GET  /dashboard/recurring     → DCA plans
GET  /dashboard/staking       → Staking positions
GET  /dashboard/history       → Transaction history
GET  /dashboard/referral      → Referral program
GET  /dashboard/security      → Security settings
GET  /dashboard/authenticator → 2FA setup
GET  /dashboard/education     → Learning resources
GET  /dashboard/support       → Help center
GET  /dashboard/mobile-app    → Mobile download
GET  /dashboard/addresses     → Address management
GET  /dashboard/trade-api     → API key management
GET  /admin/login             → Admin login
GET  /admin                   → Admin dashboard
GET  /admin/users             → User management
\`\`\`

## INDODAX REFERENCE DATA
- **Total sitemap URLs:** 1,438 (7 homepage + 477×3 mirror pages)
- **Unique trading pairs:** 477 (465 IDR + 12 USDT)
- **Purpose:** Reference prices for paper trading simulation
- **IDR display toggle:** Uses Indodax USDT/IDR ticker
- **Internal quote:** USDT (IDR is display-only)
- **Shortlist assets:** BTC, ETH, SOL, BNB, XRP, LINK, AAVE (all have IDR pairs)
- **Markets config:** BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT
- **Price source:** sim (simulated)
- **FX Rate:** Indodax /api/ticker/usdtidr

## CONFIGURATION (.env)
\`\`\`bash
PORT_BACKEND=11110
PORT_TERMINAL=22220
DB_PATH=/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db
JWT_SECRET=your-secret-key-here
JWT_TTL=43200000
CORS_ORIGINS=http://localhost:22220
API_INTERNAL_URL=http://localhost:11110
ENGINE_REWRITE_URL=http://localhost:11110

# Auth
REQUIRE_PHONE_VERIFY=false
AUTO_ACTIVATE=true
ALLOW_ADMIN_ON_CUSTOMER_LOGIN=true

# Seed
SEED_ADMIN_EMAIL=chinque@dev.local
SEED_ADMIN_PASSWORD=TestTrader2026!
SEED_CUSTOMER_EMAIL=customer@dev.local
SEED_CUSTOMER_PASSWORD=Customer2026!

# Trading
STARTING_BALANCE_USDT=10000
FAUCET_AMOUNT=1000
FAUCET_COOLDOWN_HOURS=24
MARKETS=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT
PRICE_SOURCE=sim
FEE_BPS=10
SPREAD_BPS=5

# Indodax FX
INDODAX_BASE_URL=https://indodax.com
FX_SOURCE=indodax
FX_TTL_MS=60000
FX_STALE_MAX_MS=300000

# Payment (Duitku - Sandbox)
DUITKU_MERCHANT_CODE=D0000
DUITKU_MERCHANT_KEY=your_key_here
DUITKU_SANDBOX=1
\`\`\`

## ADMIN CREDENTIALS
- URL: http://187.127.178.20:22220/admin/login
- Username: chinque
- Password: admin1
- Dev Login: chinque@dev.local / TestTrader2026!

## COMPLETED MILESTONES
- [x] M0: System diagnostic & setup
- [x] M1: Auth routes (login/signup/me)
- [x] M2: Wallet operations (balance/deposit/history/faucet)
- [x] M3: Order management (create/list/cancel/portfolio)
- [x] M4: Admin API (stats/users/audit/balance adjustment)
- [x] M5: Final integration, docs, hardening guide
- [x] Enterprise Upgrade Phase 1: 11 new backend routes + 6 new DB tables
- [x] Indodax FX rate endpoint
- [x] Design system integration (port 2217 tokens)
- [x] 183/183 vitest tests passing
- [x] 5/5 smoke tests passing

## WHAT STILL NEEDS TO BE BUILT (from PLAN-TO-DO.md)

### Frontend Pages (NOT YET IMPLEMENTED in UI)
- [ ] Recurring invest page (/dashboard/recurring) - API exists
- [ ] Authenticator app page (/dashboard/authenticator) - API exists
- [ ] Help support page (/dashboard/support) - API exists
- [ ] Learn blog page (/dashboard/education) - API exists
- [ ] Mobile app page (/dashboard/mobile-app) - API exists
- [ ] Security page (full management) - API exists
- [ ] Address management page - API exists
- [ ] Trade API page (key management) - API exists
- [ ] History page (full export) - API exists
- [ ] Referral page (earnings display) - API exists

### Security Hardening (Phase 2)
- [ ] Auth middleware guards ALL /api routes (except public ones)
- [ ] 2FA step-up on sensitive actions
- [ ] Audit log with ray ID across all events
- [ ] Google OAuth signup flow

### External Integrations (Phase 3)
- [ ] WhatsApp Business API (real OTP delivery)
- [ ] Live market data feeds (replace simulated)
- [ ] AI module integration (OpenRouter/HuggingFace)
- [ ] Duitku production mode (real payments)

### Production Deployment (Phase 4)
- [ ] GitHub Actions CI/CD
- [ ] Production cloud deployment
- [ ] Database backup automation
- [ ] Mobile app packaging (Median)
- [ ] bcrypt for passwords (currently SHA-256)
- [ ] Rate limiting on payment endpoints

## TECH STACK
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Engine:** Node.js + WebSocket + SQLite
- **Charts:** lightweight-charts (TradingView)
- **Auth:** JWT + OTP (WhatsApp simulated)
- **Payment:** Duitku (Indonesian gateway, sandbox)
- **Process Manager:** PM2
- **Database:** SQLite (WAL mode, double-entry ledger)
- **Design System:** Custom tokens from port 2217 (Inter + JetBrains Mono)
- **Testing:** Vitest (183 tests)
- **Deployment:** Docker + PM2 on VPS

## KEY DECISIONS (from CONTEXT.md)
1. Paper-trading ONLY - no real money, custody, or execution
2. Internal quote = USDT; IDR is a labeled display toggle
3. MVP order types = market + limit only (stop/OCO deferred)
4. Guest demo accounts with stable browser ID → demo funds
5. Visual reference = Bitget spot terminal (3-pane layout)
6. Color convention = configurable (green-up Western vs Indonesian red-up)
7. Reference data from public Binance/Bybit feeds (labeled as reference)
8. Flat maker/taker fee model
9. Synthetic order book seeded from reference mid-price

## DEPLOYMENT COMMANDS
\`\`\`bash
# SSH into VPS
ssh khuchinque@187.127.178.20

# Navigate to project
cd /home/khuchinque/0-TRADER-COMPANEY

# Start all services
pm2 start ecosystem.config.js

# Or individually
pm2 start apps/backend/dist/index.js --name backend
pm2 start "next start -p 22220" --name terminal --cwd apps/terminal

# Smoke test
bash scripts/smoke.sh

# View logs
pm2 logs

# Restart all
pm2 restart all

# Deploy from git
git pull origin master
npm run build --workspaces
pm2 restart all
\`\`\`

## IMPORTANT NOTES FOR DEVELOPMENT
1. This is a MONOREPO with npm workspaces (packages/* and apps/*)
2. Always build shared package first: \`npm run build -w packages/shared\`
3. The engine has 183 vitest tests - keep them green
4. Double-entry ledger must always balance (journal table)
5. All money-touching responses must include "simulasi: true" badge
6. IDR is DISPLAY ONLY - internal calculations always in USDT
7. The design system uses CSS custom properties (--stx-*, --color-*)
8. WebSocket connections handle live price updates
9. Guest mode is behind a flag (REQUIRE_PHONE_VERIFY=false for dev)
10. The project targets Indonesian market (Bahasa Indonesia UI)

## NEXT IMMEDIATE PRIORITIES
1. Build missing frontend pages (recurring, authenticator, support, etc.)
2. Implement auth middleware on all protected routes
3. Replace SHA-256 with bcrypt for passwords
4. Connect real market data feeds
5. Set up CI/CD pipeline
6. Prepare for public demo (~3 weeks target)`;

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'architecture', label: '🏗️ Architecture' },
    { id: 'api', label: '⚡ API' },
    { id: 'status', label: '📊 Status' },
    { id: 'todo', label: '📋 TODO' },
    { id: 'full', label: '📄 Full Prompt' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                0T
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">0-TRADER-COMPANEY</h1>
                <p className="text-xs text-gray-400">
                  Indonesian Paper-Trading Crypto Exchange •{' '}
                  <span className="text-green-400 font-mono">187.127.178.20</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="running" label="Phase 1 Complete" />
              <CopyButton text={fullPrompt} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[64px] z-40 bg-gray-900/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <Section title="Project Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Project Name', value: '0-TRADER-COMPANEY', color: 'text-white' },
                  { label: 'Type', value: 'Paper-Trading Crypto Venue', color: 'text-blue-400' },
                  { label: 'Visual Reference', value: 'Bitget Spot Terminal', color: 'text-purple-400' },
                  { label: 'Language', value: 'Indonesian (Bahasa)', color: 'text-green-400' },
                  { label: 'VPS', value: '187.127.178.20', color: 'text-yellow-400' },
                  { label: 'User', value: 'khuchinque', color: 'text-orange-400' },
                  { label: 'GitHub', value: 'khuchinque-app/0-TRADER-COMPANEY', color: 'text-cyan-400' },
                  { label: 'Team Size', value: '2 developers', color: 'text-pink-400' },
                  { label: 'Status', value: 'Phase 1 Complete', color: 'text-green-400' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-lg p-3 border border-gray-800/50">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</div>
                    <div className={`font-medium mt-1 ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Key Decisions">
              <div className="space-y-2">
                {[
                  'Paper-trading ONLY — no real money, custody, or execution',
                  'Internal quote = USDT; IDR is a labeled display toggle only',
                  'MVP order types = market + limit (stop/OCO deferred)',
                  'Guest demo accounts with stable browser ID → demo funds',
                  'Visual reference = Bitget spot terminal (3-pane layout: 80% chart+book, 20% order form)',
                  'Reference data from public Binance/Bybit feeds (labeled as reference)',
                  'Flat maker/taker fee model (10 bps fee, 5 bps spread)',
                  'Indonesian market target (Bahasa Indonesia UI)',
                  'Starting balance: 10,000 USDT demo funds',
                  'Color convention: configurable (green-up vs Indonesian red-up)',
                ].map((decision, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-900/40 rounded-lg p-3 border border-gray-800/30">
                    <span className="text-blue-400 font-bold text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-300 text-sm">{decision}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Indodax Reference Data">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50 text-center">
                  <div className="text-2xl font-bold text-white">1,438</div>
                  <div className="text-xs text-gray-500 mt-1">Total Sitemap URLs</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50 text-center">
                  <div className="text-2xl font-bold text-green-400">477</div>
                  <div className="text-xs text-gray-500 mt-1">Trading Pairs</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50 text-center">
                  <div className="text-2xl font-bold text-yellow-400">465</div>
                  <div className="text-xs text-gray-500 mt-1">IDR Pairs</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50 text-center">
                  <div className="text-2xl font-bold text-blue-400">12</div>
                  <div className="text-xs text-gray-500 mt-1">USDT Pairs</div>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                Shortlist: BTC✓ ETH✓ SOL✓ BNB✓ XRP✓ LINK✓ AAVE✓ (all IDR; BTC+ETH also USDT)
              </p>
            </Section>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div>
            <Section title="Port Architecture">
              <div className="bg-gray-900/60 rounded-xl p-5 border border-gray-800/50">
                <div className="space-y-3">
                  {[
                    { port: '11110', name: 'Backend API', tech: 'Express + Auth + Admin + FX', pm2: 'backend', bg: 'bg-blue-900/30', border: 'border-blue-700/30', text: 'text-blue-400' },
                    { port: '22220', name: 'Terminal Frontend', tech: 'Next.js Dashboard', pm2: 'terminal', bg: 'bg-green-900/30', border: 'border-green-700/30', text: 'text-green-400' },
                    { port: '3001', name: 'Trading Engine', tech: 'WebSocket + Matching', pm2: 'engine', bg: 'bg-purple-900/30', border: 'border-purple-700/30', text: 'text-purple-400' },
                    { port: '2217', name: 'Static Files', tech: 'ChinQue-Cripto Design System', pm2: 'chinque-cripto', bg: 'bg-yellow-900/30', border: 'border-yellow-700/30', text: 'text-yellow-400' },
                  ].map((svc, i) => (
                    <div key={i} className="flex items-center gap-4 bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                      <div className={`w-16 h-16 rounded-lg ${svc.bg} border ${svc.border} flex items-center justify-center`}>
                        <span className={`${svc.text} font-mono font-bold text-sm`}>:{svc.port}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{svc.name}</div>
                        <div className="text-gray-400 text-xs">{svc.tech}</div>
                        <div className="text-gray-500 text-xs mt-1">PM2: <span className="font-mono">{svc.pm2}</span></div>
                      </div>
                      <StatusBadge status="running" label="Online" />
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Monorepo Structure">
              <CodeBlock
                title="Project Tree"
                code={`0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   └── src/routes/       # auth.ts, admin.ts, fx-rate.ts
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/server/       # auth.ts + 11 route files
│   │   │   ├── recurring.ts
│   │   │   ├── addresses.ts
│   │   │   ├── history.ts
│   │   │   ├── referral.ts
│   │   │   ├── security.ts
│   │   │   ├── two-fa.ts
│   │   │   ├── api-keys.ts
│   │   │   ├── education.ts
│   │   │   ├── support.ts
│   │   │   ├── mobile-app.ts
│   │   │   └── payment.ts
│   │   └── data/ledger.db    # SQLite (21 tables, WAL mode)
│   └── terminal/             # Next.js frontend (port 22220)
│       ├── app/              # Pages (login, signup, dashboard, admin)
│       ├── components/       # account, book, chart, orderform, shell, tabs, topbar
│       └── lib/              # api-client.ts, ws-client.ts, format.ts
├── packages/shared/          # Shared types (domain.ts, api.ts, config.ts)
├── docs/                     # ADR, design system, runbook, research
├── PLANNING/                 # 20+ planning documents
├── scripts/                  # deploy.sh, smoke.sh, smoke-test.py
├── ops/                      # OPS-LOG.md
├── ecosystem.config.js       # PM2 configuration
├── docker-compose.yml        # Docker setup
└── package.json              # npm workspaces root`}
              />
            </Section>

            <Section title="Database Schema">
              <CodeBlock
                title="SQLite: apps/engine/data/ledger.db"
                code={`-- Core tables (21 total)
users (id, username, email, password_hash, otp_secret, is_admin,
       two_fa_enabled, created_at)

wallets (id, user_id, asset, balance, frozen_balance)

orders (id, user_id, pair, side, type, price, quantity, status, created_at)

journal (id, transaction_id, account_id, asset, debit, credit, created_at)
  -- DOUBLE-ENTRY LEDGER: every transaction has matching debit/credit

audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)

-- Enterprise tables (added in Phase 1 upgrade)
recurring_plans    -- DCA (Dollar Cost Averaging) plans
deposit_addresses  -- Crypto deposit address management
withdrawal_whitelist -- Approved withdrawal addresses
referrals          -- Referral system
support_tickets    -- Customer support
api_keys           -- Trading API key management
payment_invoices   -- Duitku payment gateway
education_content  -- Learning modules

-- Stats: 20 users, 409 balances, 12 orders
-- Mode: WAL (Write-Ahead Logging)
-- Integrity: All FK constraints satisfied`}
              />
            </Section>

            <Section title="Tech Stack">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                  <h3 className="text-blue-400 font-semibold mb-3 text-sm">Frontend</h3>
                  <div className="space-y-2">
                    {['Next.js 14', 'TypeScript', 'Tailwind CSS', 'lightweight-charts', 'Inter + JetBrains Mono'].map(t => (
                      <div key={t} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                  <h3 className="text-green-400 font-semibold mb-3 text-sm">Backend</h3>
                  <div className="space-y-2">
                    {['Express.js + TypeScript', 'SQLite (WAL mode)', 'JWT Authentication', 'WebSocket (Socket.io)', 'PM2 Process Manager'].map(t => (
                      <div key={t} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>{t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                  <h3 className="text-purple-400 font-semibold mb-3 text-sm">Integrations</h3>
                  <div className="space-y-2">
                    {['Duitku (Payment Gateway)', 'Indodax (FX Rate)', 'Binance/Bybit (Reference Prices)', 'WhatsApp Business (OTP - simulated)', 'Cloudflare Turnstile (CAPTCHA)'].map(t => (
                      <div key={t} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>{t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                  <h3 className="text-yellow-400 font-semibold mb-3 text-sm">DevOps</h3>
                  <div className="space-y-2">
                    {['npm workspaces (monorepo)', 'Docker + docker-compose', 'PM2 ecosystem.config.js', 'Vitest (183 tests)', 'GitHub Actions (planned)'].map(t => (
                      <div key={t} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>{t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div>
            <Section title="Backend API (Port 11110)">
              <div className="space-y-1.5">
                {[
                  { method: 'POST', path: '/api/auth/login', desc: 'JWT token' },
                  { method: 'POST', path: '/api/auth/register', desc: 'Create user' },
                  { method: 'POST', path: '/api/auth/signup', desc: '201 Created' },
                  { method: 'GET', path: '/api/auth/me', desc: 'User data' },
                  { method: 'POST', path: '/api/auth/otp/verify', desc: 'OTP verification' },
                  { method: 'POST', path: '/api/auth/logout', desc: 'Clear session' },
                  { method: 'GET', path: '/api/admin/stats', desc: '{users:21, orders:14, simulasi:true}' },
                  { method: 'GET', path: '/api/admin/users', desc: 'User list' },
                  { method: 'POST', path: '/api/admin/users', desc: 'Create user' },
                  { method: 'PUT', path: '/api/admin/users/:id', desc: 'Update user' },
                  { method: 'DELETE', path: '/api/admin/users/:id', desc: 'Delete user' },
                  { method: 'POST', path: '/api/admin/users/:id/adjust', desc: 'Balance adjustment' },
                  { method: 'GET', path: '/api/admin/audit', desc: 'Audit log' },
                  { method: 'GET', path: '/health', desc: 'Health check' },
                  { method: 'GET', path: '/api/status', desc: 'System overview' },
                  { method: 'GET', path: '/api/fx-rate', desc: 'Indodax USDT/IDR rate' },
                ].map((route, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2 border border-gray-800/30">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      route.method === 'GET' ? 'bg-green-900/40 text-green-300' :
                      route.method === 'POST' ? 'bg-blue-900/40 text-blue-300' :
                      route.method === 'PUT' ? 'bg-yellow-900/40 text-yellow-300' :
                      'bg-red-900/40 text-red-300'
                    }`}>{route.method}</span>
                    <code className="text-gray-200 font-mono text-xs flex-1">{route.path}</code>
                    <span className="text-gray-500 text-xs">{route.desc}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Engine API (Port 3001)">
              <div className="space-y-1.5">
                {[
                  { method: 'WS', path: '/ws', desc: 'WebSocket (live prices, orders)' },
                  { method: 'GET', path: '/api/tickers', desc: 'Market tickers' },
                  { method: 'GET', path: '/api/market/:pair', desc: 'Market details' },
                  { method: 'POST', path: '/api/orders', desc: 'Place order' },
                  { method: 'GET', path: '/api/orders', desc: 'Get orders' },
                  { method: 'DELETE', path: '/api/orders/:id', desc: 'Cancel order' },
                  { method: 'GET', path: '/api/wallet/:userId', desc: 'Wallet balance' },
                  { method: 'GET', path: '/api/portfolio', desc: 'Positions + PnL' },
                  { method: 'POST', path: '/api/wallet/deposit', desc: 'Create deposit' },
                  { method: 'GET', path: '/api/wallet/faucet', desc: 'Free 1000 USDT' },
                  { method: 'GET', path: '/api/recurring/*', desc: 'DCA plans' },
                  { method: 'GET', path: '/api/addresses/*', desc: 'Deposit addresses' },
                  { method: 'GET', path: '/api/history/*', desc: 'Transaction history' },
                  { method: 'GET', path: '/api/referral/*', desc: 'Referral system' },
                  { method: 'GET', path: '/api/security/*', desc: 'Security settings' },
                  { method: 'GET', path: '/api/2fa/*', desc: '2FA management' },
                  { method: 'GET', path: '/api/api-keys/*', desc: 'API key management' },
                  { method: 'GET', path: '/api/education/*', desc: 'Learning content' },
                  { method: 'GET', path: '/api/support/*', desc: 'Help center' },
                  { method: 'POST', path: '/api/payment/*', desc: 'Duitku (sandbox)' },
                ].map((route, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2 border border-gray-800/30">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      route.method === 'GET' ? 'bg-green-900/40 text-green-300' :
                      route.method === 'POST' ? 'bg-blue-900/40 text-blue-300' :
                      route.method === 'WS' ? 'bg-purple-900/40 text-purple-300' :
                      'bg-red-900/40 text-red-300'
                    }`}>{route.method}</span>
                    <code className="text-gray-200 font-mono text-xs flex-1">{route.path}</code>
                    <span className="text-gray-500 text-xs">{route.desc}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Terminal Pages (Port 22220)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { path: '/', desc: 'Landing page (Indonesian hero)' },
                  { path: '/login', desc: 'Login page' },
                  { path: '/signup', desc: 'Registration' },
                  { path: '/dashboard', desc: 'Trading dashboard' },
                  { path: '/dashboard/trade', desc: 'Trade section' },
                  { path: '/dashboard/wallet', desc: 'Wallet section' },
                  { path: '/dashboard/ai', desc: 'AI Vault investment' },
                  { path: '/dashboard/recurring', desc: 'DCA plans' },
                  { path: '/dashboard/staking', desc: 'Staking positions' },
                  { path: '/dashboard/history', desc: 'Transaction history' },
                  { path: '/dashboard/referral', desc: 'Referral program' },
                  { path: '/dashboard/security', desc: 'Security settings' },
                  { path: '/dashboard/authenticator', desc: '2FA setup' },
                  { path: '/dashboard/education', desc: 'Learning resources' },
                  { path: '/dashboard/support', desc: 'Help center' },
                  { path: '/dashboard/mobile-app', desc: 'Mobile download' },
                  { path: '/dashboard/addresses', desc: 'Address management' },
                  { path: '/dashboard/trade-api', desc: 'API key management' },
                  { path: '/admin/login', desc: 'Admin login' },
                  { path: '/admin', desc: 'Admin dashboard' },
                  { path: '/admin/users', desc: 'User management' },
                ].map((page, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2 border border-gray-800/30">
                    <code className="text-green-400 font-mono text-xs">{page.path}</code>
                    <span className="text-gray-500 text-xs">→ {page.desc}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div>
            <Section title="Completed Milestones">
              <div className="space-y-2">
                {[
                  { id: 'M0', name: 'System diagnostic & setup', status: 'done' as const },
                  { id: 'M1', name: 'Auth routes (login/signup/me)', status: 'done' as const },
                  { id: 'M2', name: 'Wallet operations (balance/deposit/history/faucet)', status: 'done' as const },
                  { id: 'M3', name: 'Order management (create/list/cancel/portfolio)', status: 'done' as const },
                  { id: 'M4', name: 'Admin API (stats/users/audit/balance adjustment)', status: 'done' as const },
                  { id: 'M5', name: 'Final integration, docs, hardening guide', status: 'done' as const },
                  { id: 'EU1', name: 'Enterprise Upgrade Phase 1 (11 routes + 6 tables)', status: 'done' as const },
                  { id: 'FX', name: 'Indodax FX rate endpoint', status: 'done' as const },
                  { id: 'DS', name: 'Design system integration (port 2217)', status: 'done' as const },
                  { id: 'TEST', name: '183/183 vitest tests passing', status: 'done' as const },
                  { id: 'SMOKE', name: '5/5 smoke tests passing', status: 'done' as const },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <StatusBadge status={m.status} label={m.id} />
                    <span className="text-gray-200 text-sm flex-1">{m.name}</span>
                    <span className="text-green-400 text-xs">✅ DONE</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="PLAN-TO-DO Progress">
              <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-2xl font-bold text-green-400">72+</div>
                    <div className="text-xs text-gray-500">Tasks Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">~20</div>
                    <div className="text-xs text-gray-500">Tasks Remaining</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">183</div>
                    <div className="text-xs text-gray-500">Tests Passing</div>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <p className="text-center text-gray-500 text-xs mt-2">~78% Complete</p>
              </div>
            </Section>

            <Section title="Configuration Quick Reference">
              <CodeBlock
                title=".env (Key Values)"
                code={`PORT_BACKEND=11110
PORT_TERMINAL=22220
DB_PATH=/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db
JWT_SECRET=your-secret-key-here
MARKETS=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT
PRICE_SOURCE=sim
FEE_BPS=10
SPREAD_BPS=5
STARTING_BALANCE_USDT=10000
FAUCET_AMOUNT=1000
FX_SOURCE=indodax
DUITKU_SANDBOX=1

# Admin
SEED_ADMIN_EMAIL=chinque@dev.local
SEED_ADMIN_PASSWORD=TestTrader2026!`}
              />
            </Section>
          </div>
        )}

        {/* TODO Tab */}
        {activeTab === 'todo' && (
          <div>
            <Section title="Frontend Pages (API exists, UI not built)">
              <div className="space-y-2">
                {[
                  { name: 'Recurring invest page', route: '/dashboard/recurring', priority: 'high' },
                  { name: 'Authenticator app page', route: '/dashboard/authenticator', priority: 'high' },
                  { name: 'Help support page', route: '/dashboard/support', priority: 'medium' },
                  { name: 'Learn blog page', route: '/dashboard/education', priority: 'medium' },
                  { name: 'Mobile app page', route: '/dashboard/mobile-app', priority: 'low' },
                  { name: 'Security page (full)', route: '/dashboard/security', priority: 'high' },
                  { name: 'Address management', route: '/dashboard/addresses', priority: 'medium' },
                  { name: 'Trade API page', route: '/dashboard/trade-api', priority: 'medium' },
                  { name: 'History page (export)', route: '/dashboard/history', priority: 'high' },
                  { name: 'Referral page', route: '/dashboard/referral', priority: 'low' },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <span className="text-gray-600">⬜</span>
                    <span className="text-gray-200 text-sm flex-1">{task.name}</span>
                    <code className="text-gray-500 font-mono text-xs">{task.route}</code>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      task.priority === 'high' ? 'bg-red-900/30 text-red-300' :
                      task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{task.priority}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Phase 2: Security Hardening">
              <div className="space-y-2">
                {[
                  'Auth middleware guards ALL /api routes (except public ones)',
                  '2FA step-up on sensitive actions (withdraw, API key gen, password change)',
                  'Audit log with ray ID across all events',
                  'Google OAuth signup flow',
                  'Replace SHA-256 with bcrypt for passwords',
                  'Rate limiting on payment endpoints',
                  'Idempotency keys on all POST/PATCH money routes',
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <span className="text-yellow-500">⚠️</span>
                    <span className="text-gray-200 text-sm">{task}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Phase 3: External Integrations">
              <div className="space-y-2">
                {[
                  'WhatsApp Business API (real OTP delivery, E.164 normalized)',
                  'Live market data feeds (replace simulated prices)',
                  'AI module integration (OpenRouter / HuggingFace / Novita)',
                  'Duitku production mode (real Indonesian payments)',
                  'Real crypto deposit address generation',
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <span className="text-gray-600">⬜</span>
                    <span className="text-gray-200 text-sm">{task}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Phase 4: Production Deployment">
              <div className="space-y-2">
                {[
                  'GitHub Actions CI/CD pipeline',
                  'Production cloud deployment (Alibaba Cloud / Railway / Fly.io)',
                  'Automated database backups',
                  'Mobile app packaging (Median studio)',
                  'Public demo launch (~3 weeks target)',
                  'Vulnerability scanning (ProjectDiscovery, WPScan)',
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <span className="text-gray-600">⬜</span>
                    <span className="text-gray-200 text-sm">{task}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Full Prompt Tab */}
        {activeTab === 'full' && (
          <div>
            <Section title="Complete Project Prompt (Copy & Paste to AI)">
              <p className="text-gray-400 mb-4">
                Copy this entire prompt and give it to any AI assistant to continue development of this project.
                It contains all the context needed to understand the current state and what needs to be built next.
              </p>
              <div className="relative">
                <div className="absolute top-3 right-3 z-10">
                  <CopyButton text={fullPrompt} />
                </div>
                <pre className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 overflow-x-auto text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[700px] overflow-y-auto">
                  {fullPrompt}
                </pre>
              </div>
            </Section>

            <Section title="Quick Start Commands">
              <CodeBlock
                title="Deploy & Run"
                code={`# SSH into VPS
ssh khuchinque@187.127.178.20

# Navigate to project
cd /home/khuchinque/0-TRADER-COMPANEY

# Pull latest
git pull origin master

# Build all workspaces
npm run build -w packages/shared
npm run build --workspaces

# Start services
pm2 start ecosystem.config.js
# or
pm2 restart all

# Verify
bash scripts/smoke.sh
# Expected: 5/5 PASS

# View logs
pm2 logs

# Access
# Frontend: http://187.127.178.20:22220
# Admin:    http://187.127.178.20:22220/admin/login
# Backend:  http://187.127.178.20:11110/health`}
              />
            </Section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-xs">
            0-TRADER-COMPANEY • Indonesian Paper-Trading Crypto Exchange
          </p>
          <p className="text-gray-600 text-xs mt-1">
            VPS: <span className="font-mono text-gray-500">187.127.178.20</span> •
            GitHub: <a href="https://github.com/khuchinque-app/0-TRADER-COMPANEY" className="text-blue-500 hover:underline" target="_blank">khuchinque-app/0-TRADER-COMPANEY</a> •
            Last Updated: Oct 4, 2026
          </p>
        </div>
      </footer>
    </div>
  );
}


+++ src/App.tsx (修改后)
import { useState } from 'react';
import { FULL_PROMPT } from './promptData';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-medium shadow-lg shadow-blue-900/30">
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-3 pb-2 border-b border-gray-700/50 flex items-center gap-2">
        <span className="text-blue-400 text-lg">◆</span> {title}
      </h2>
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 font-mono">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 bg-gray-900/80 overflow-x-auto text-xs text-green-400 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StatusBadge({ status, label }: { status: 'done' | 'partial' | 'todo' | 'running' | 'build'; label: string }) {
  const colors = {
    done: 'bg-green-900/40 text-green-300 border-green-700/50',
    partial: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    todo: 'bg-gray-800 text-gray-400 border-gray-700',
    running: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    build: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  };
  const icons = { done: '✅', partial: '⚠️', todo: '⬜', running: '🔄', build: '🔨' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${colors[status]}`}>
      {icons[status]} {label}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'architecture', label: '🏗️ Architecture' },
    { id: 'build', label: '🔨 New Build' },
    { id: 'api', label: '⚡ API' },
    { id: 'todo', label: '📋 TODO' },
    { id: 'full', label: '📄 Full Prompt' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                0T
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">0-TRADER-COMPANEY</h1>
                <p className="text-xs text-gray-400">
                  Paper-Trading Exchange •{' '}
                  <span className="text-green-400 font-mono">187.127.178.20</span> •{' '}
                  <span className="text-orange-400 font-mono">:22221 NEW</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="running" label="M0-M5 Done" />
              <StatusBadge status="build" label="M6-M10 Next" />
              <CopyButton text={FULL_PROMPT} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[64px] z-40 bg-gray-900/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <Section title="Project Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Project', value: '0-TRADER-COMPANEY' },
                  { label: 'Type', value: 'Paper-Trading Crypto Venue' },
                  { label: 'Visual Ref', value: 'Bitget Spot Terminal' },
                  { label: 'Language', value: 'Indonesian (Bahasa)' },
                  { label: 'VPS', value: '187.127.178.20' },
                  { label: 'User', value: 'khuchinque' },
                  { label: 'GitHub', value: 'khuchinque-app/0-TRADER-COMPANEY' },
                  { label: 'Team', value: '2 developers' },
                  { label: 'Status', value: 'Phase 1 Complete + M6-M10 queued' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-lg p-3 border border-gray-800/50">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</div>
                    <div className="text-white font-medium mt-1 text-sm">{item.value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Running Services">
              <div className="space-y-2">
                {[
                  { port: '11110', name: 'Backend API', tech: 'Express + Auth + Admin + FX', status: 'running' as const },
                  { port: '22220', name: 'Terminal Frontend', tech: 'Next.js Dashboard', status: 'running' as const },
                  { port: '3001', name: 'Trading Engine', tech: 'WebSocket + Matching', status: 'running' as const },
                  { port: '2217', name: 'Static Files', tech: 'ChinQue-Cripto Design System', status: 'running' as const },
                  { port: '22221', name: 'Exchange (NEW)', tech: 'Indodax Route-Mirror + MEXC Data', status: 'build' as const },
                ].map((svc, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-900/40 rounded-lg p-3 border border-gray-800/30">
                    <div className="w-16 h-12 rounded bg-gray-800 flex items-center justify-center">
                      <span className="text-blue-400 font-mono font-bold text-sm">:{svc.port}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">{svc.name}</div>
                      <div className="text-gray-400 text-xs">{svc.tech}</div>
                    </div>
                    <StatusBadge status={svc.status} label={svc.status === 'build' ? 'To Build' : 'Online'} />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Key Locked Decisions">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Paper-trading ONLY — no real money',
                  'Internal quote = USDT; IDR is display toggle',
                  'MVP order types = market + limit only',
                  'Guest demo accounts with stable browser ID',
                  'Visual reference = Bitget (3-pane layout)',
                  'Color convention = configurable (green-up default)',
                  'Reference data from public feeds (labeled)',
                  'Flat fee model (10 bps fee, 5 bps spread)',
                  'Synthetic order book from reference mid',
                  'Indonesian market (Bahasa Indonesia UI)',
                ].map((d, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-900/40 rounded-lg p-2.5 border border-gray-800/30">
                    <span className="text-blue-400 font-bold text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-300 text-xs">{d}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Architecture */}
        {activeTab === 'architecture' && (
          <div>
            <Section title="Monorepo Structure">
              <CodeBlock title="Project Tree" code={`0-TRADER-COMPANEY/
├── apps/
│   ├── backend/              # Express API (port 11110)
│   │   └── src/routes/       # auth.ts, admin.ts, fx-rate.ts
│   ├── engine/               # Trading engine (port 3001)
│   │   ├── src/server/       # auth.ts + 11 route files
│   │   └── data/ledger.db    # SQLite (21 tables, WAL mode)
│   ├── terminal/             # Next.js frontend (port 22220)
│   │   ├── app/              # Pages
│   │   ├── components/       # UI components
│   │   └── lib/              # api-client, ws-client, format
│   └── exchange/             # 🆕 NEW (port 22221)
│       └── Indodax route-mirror with MEXC data
├── packages/
│   ├── shared/               # Shared types (domain, api, config)
│   ├── mexc-client/          # 🆕 MEXC public market data
│   └── indodax-routes/       # 🆕 Generated route manifest
├── docs/ | PLANNING/ | scripts/ | ops/
├── ecosystem.config.js       # PM2 config
└── package.json              # npm workspaces root`} />
            </Section>

            <Section title="Database Schema">
              <CodeBlock title="SQLite: apps/engine/data/ledger.db" code={`-- 21 tables total
users (id, username, email, password_hash, otp_secret, is_admin, two_fa_enabled, created_at)
wallets (id, user_id, asset, balance, frozen_balance)
orders (id, user_id, pair, side, type, price, quantity, status, created_at)
journal (id, transaction_id, account_id, asset, debit, credit, created_at)  -- DOUBLE-ENTRY
audit_log (id, user_id, action, entity, entity_id, ip_address, created_at)

-- Enterprise tables
recurring_plans, deposit_addresses, withdrawal_whitelist,
referrals, support_tickets, api_keys, payment_invoices, education_content

-- Stats: 20 users, 409 balances, 12 orders
-- WAL mode | All FK constraints satisfied`} />
            </Section>

            <Section title="Tech Stack">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Frontend', color: 'blue', items: ['Next.js 14 + TypeScript', 'Tailwind CSS', 'lightweight-charts', 'Inter + JetBrains Mono'] },
                  { title: 'Backend', color: 'green', items: ['Express.js + TypeScript', 'SQLite (WAL mode)', 'JWT Authentication', 'WebSocket (Socket.io)', 'PM2 Process Manager'] },
                  { title: 'Integrations', color: 'purple', items: ['Duitku (Payment Gateway)', 'Indodax (FX Rate)', 'MEXC (Market Data - NEW)', 'WhatsApp Business (OTP sim)', 'Cloudflare Turnstile'] },
                  { title: 'DevOps', color: 'yellow', items: ['npm workspaces (monorepo)', 'Docker + docker-compose', 'PM2 ecosystem.config.js', 'Vitest (183 tests)', 'GitHub Actions (planned)'] },
                ].map((cat, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/50">
                    <h3 className={`text-${cat.color}-400 font-semibold mb-3 text-sm`}>{cat.title}</h3>
                    <div className="space-y-1.5">
                      {cat.items.map(item => (
                        <div key={item} className="text-xs text-gray-300 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full bg-${cat.color}-400`}></span>{item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* New Build */}
        {activeTab === 'build' && (
          <div>
            <Section title="Mission: Route-Mirror Exchange on :22221">
              <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-xl p-5 border border-orange-800/30">
                <p className="text-orange-200 text-sm mb-3">
                  Add <code className="bg-gray-800 px-1.5 py-0.5 rounded text-orange-300">apps/exchange</code> serving <code className="bg-gray-800 px-1.5 py-0.5 rounded text-orange-300">http://187.127.178.20:22221</code> mirroring indodax.com paths 1:1.
                  Market data from MEXC public spot API. Auth/wallet/orders stay in existing backend (11110).
                </p>
                <div className="bg-gray-900/60 rounded-lg p-3 font-mono text-xs text-gray-300">
                  <div>187.127.178.20:22221/              ↔ indodax.com/</div>
                  <div>187.127.178.20:22221/market        ↔ indodax.com/market</div>
                  <div>187.127.178.20:22221/market/BTCIDR ↔ indodax.com/market/BTCIDR</div>
                  <div>187.127.178.20:22221/chart/BTCIDR  ↔ indodax.com/chart/BTCIDR</div>
                  <div className="text-gray-500">...all ~477 pairs from sitemap</div>
                </div>
              </div>
            </Section>

            <Section title="Hard Rules">
              <div className="space-y-2">
                {[
                  { rule: 'MEXC = PUBLIC only', detail: 'Allowed: ping, time, exchangeInfo, depth, trades, klines, ticker24hr, etc. FORBIDDEN: newOrder, cancelOrder, accountInfo. NO API key anywhere.' },
                  { rule: 'Mirror paths, NOT identity', detail: 'Brand = "Simulasi Exchange". Original copy. Never copy Indodax logo/brand/assets.' },
                  { rule: 'Persistent simulation banner', detail: '"SIMULASI — dana virtual, bukan Indodax, bukan bursa sungguhan" on every page. robots.txt Disallow: / + noindex meta.' },
                  { rule: 'Flat layout', detail: 'apps/exchange + packages/. Do not change 11110 or 22220 behavior.' },
                  { rule: 'Browser never calls MEXC', detail: 'browser → apps/exchange → backend /api/market/* → cache → MEXC' },
                ].map((r, i) => (
                  <div key={i} className="bg-gray-900/40 rounded-lg p-3 border border-gray-800/30">
                    <div className="text-red-400 font-semibold text-xs mb-1">Rule {i + 1}: {r.rule}</div>
                    <div className="text-gray-400 text-xs">{r.detail}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Route Map">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400">Indodax Path</th>
                      <th className="text-left py-2 px-3 text-gray-400">Local (:22221)</th>
                      <th className="text-left py-2 px-3 text-gray-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {[
                      ['/', '/', 'landing + live movers'],
                      ['/market', '/market', 'all-pairs table (~477)'],
                      ['/market/{PAIR}', '/market/{PAIR}', 'trading page'],
                      ['/market/depth_chart/{PAIR}', '/market/depth_chart/{PAIR}', 'depth chart'],
                      ['/chart/{PAIR}', '/chart/{PAIR}', 'full candle chart'],
                      ['/trade_api', '/trade_api', 'OUR read-only API docs'],
                      ['/affiliate', '/affiliate', 'original placeholder'],
                      ['/privacy-policy', '/privacy-policy', 'simulation privacy'],
                      ['help: new user', '/help/pengguna-baru', 'original guide'],
                      ['help: terms', '/help/ketentuan', 'simulation terms'],
                    ].map(([from, to, notes], i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-red-400">{from}</td>
                        <td className="py-2 px-3 text-green-400">{to}</td>
                        <td className="py-2 px-3 text-gray-500 font-sans">{notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-2">Account paths: /akun/masuk, /akun/daftar, /akun/dompet, /akun/order</p>
            </Section>

            <Section title="Milestones M6–M10">
              <div className="space-y-2">
                {[
                  { id: 'M6', desc: 'gen-routes.mjs + routes.json; apps/exchange skeleton on 22221, all static routes 200' },
                  { id: 'M7', desc: 'packages/mexc-client + backend /api/market/* + cache + health' },
                  { id: 'M8', desc: '/market and /market/{PAIR} (chart, book, tape, ticker) incl. NO_FEED and 404' },
                  { id: 'M9', desc: '/market/depth_chart/{PAIR}, /chart/{PAIR}, order form + wallet panel wired to backend' },
                  { id: 'M10', desc: 'smoke script, PM2 save, RUNBOOK updated, PLANNING/LOG-exchange.md complete' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/30">
                    <span className="px-2 py-1 bg-orange-900/40 text-orange-300 rounded text-xs font-bold border border-orange-700/50">{m.id}</span>
                    <span className="text-gray-200 text-sm flex-1">{m.desc}</span>
                    <StatusBadge status="todo" label="Pending" />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Agent Lanes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/60 rounded-xl p-4 border border-blue-800/30">
                  <h3 className="text-blue-400 font-semibold mb-2 text-sm">VPS Agent (@Herme_KhuChinQue_bot)</h3>
                  <p className="text-gray-400 text-xs mb-2">Ops/Deploy only:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Run gen-routes.mjs (VPS has network)</li>
                    <li>• PM2 exchange on 22221 (pm2 save)</li>
                    <li>• Open-port check</li>
                    <li>• Run smoke script</li>
                    <li>• Report results</li>
                  </ul>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-4 border border-green-800/30">
                  <h3 className="text-green-400 font-semibold mb-2 text-sm">Local Agent (@Herme_ChinQue_bot)</h3>
                  <p className="text-gray-400 text-xs mb-2">Code only:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• apps/exchange</li>
                    <li>• packages/mexc-client</li>
                    <li>• packages/indodax-routes</li>
                    <li>• backend /api/market/*</li>
                    <li>• Documentation</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                Log: PLANNING/LOG-exchange.md — max 10 lines/milestone, format: Mx | DONE/BLOCKED | what changed | next. Never idle; never stop before M10.
              </p>
            </Section>
          </div>
        )}

        {/* API */}
        {activeTab === 'api' && (
          <div>
            <Section title="Backend API (Port 11110)">
              <div className="space-y-1.5">
                {[
                  { m: 'POST', p: '/api/auth/login', d: 'JWT token' },
                  { m: 'POST', p: '/api/auth/register', d: 'Create user' },
                  { m: 'GET', p: '/api/auth/me', d: 'User data' },
                  { m: 'POST', p: '/api/auth/otp/verify', d: 'OTP verification' },
                  { m: 'GET', p: '/api/admin/stats', d: '{users, orders, simulasi}' },
                  { m: 'GET', p: '/api/admin/users', d: 'User list' },
                  { m: 'POST', p: '/api/admin/users/:id/adjust', d: 'Balance adjustment' },
                  { m: 'GET', p: '/api/admin/audit', d: 'Audit log' },
                  { m: 'GET', p: '/health', d: 'Health check' },
                  { m: 'GET', p: '/api/fx-rate', d: 'Indodax USDT/IDR' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded px-3 py-2 border border-gray-800/30">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${r.m === 'GET' ? 'bg-green-900/40 text-green-300' : 'bg-blue-900/40 text-blue-300'}`}>{r.m}</span>
                    <code className="text-gray-200 font-mono text-xs flex-1">{r.p}</code>
                    <span className="text-gray-500 text-xs">{r.d}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Engine API (Port 3001)">
              <div className="space-y-1.5">
                {[
                  { m: 'WS', p: '/ws', d: 'Live prices + orders' },
                  { m: 'GET', p: '/api/tickers', d: 'Market tickers' },
                  { m: 'GET', p: '/api/market/:pair', d: 'Market details' },
                  { m: 'POST', p: '/api/orders', d: 'Place order' },
                  { m: 'GET', p: '/api/orders', d: 'List orders' },
                  { m: 'DELETE', p: '/api/orders/:id', d: 'Cancel order' },
                  { m: 'GET', p: '/api/wallet/:userId', d: 'Wallet balance' },
                  { m: 'GET', p: '/api/portfolio', d: 'Positions + PnL' },
                  { m: 'GET', p: '/api/wallet/faucet', d: 'Free 1000 USDT' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900/40 rounded px-3 py-2 border border-gray-800/30">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      r.m === 'GET' ? 'bg-green-900/40 text-green-300' :
                      r.m === 'POST' ? 'bg-blue-900/40 text-blue-300' :
                      r.m === 'WS' ? 'bg-purple-900/40 text-purple-300' :
                      'bg-red-900/40 text-red-300'
                    }`}>{r.m}</span>
                    <code className="text-gray-200 font-mono text-xs flex-1">{r.p}</code>
                    <span className="text-gray-500 text-xs">{r.d}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="New MEXC Market API (Port 11110 — TO BUILD)">
              <div className="space-y-1.5">
                {[
                  { p: '/api/market/health', d: 'MEXC connectivity + latency' },
                  { p: '/api/market/pairs', d: 'Manifest + state (LIVE|NO_FEED) + mexcSymbol' },
                  { p: '/api/market/tickers', d: 'Bulk all pairs, cached ~2-3s' },
                  { p: '/api/market/ticker/:slug', d: 'Single pair ticker' },
                  { p: '/api/market/depth/:slug?limit=', d: 'Order book (5-5000)' },
                  { p: '/api/market/trades/:slug?limit=', d: 'Trade tape' },
                  { p: '/api/market/klines/:slug?interval=&limit=', d: 'Candlestick data' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-orange-900/10 rounded px-3 py-2 border border-orange-800/20">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-900/40 text-orange-300">GET</span>
                    <code className="text-orange-200 font-mono text-xs flex-1">{r.p}</code>
                    <span className="text-gray-500 text-xs">{r.d}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* TODO */}
        {activeTab === 'todo' && (
          <div>
            <Section title="M6-M10: Exchange Build (Priority)">
              <div className="space-y-2">
                {[
                  'M6: gen-routes.mjs + routes.json + apps/exchange skeleton',
                  'M7: packages/mexc-client + /api/market/* + cache',
                  'M8: /market + /market/{PAIR} pages (chart, book, tape)',
                  'M9: depth_chart, chart pages + order form wired to backend',
                  'M10: smoke script + PM2 save + docs updated',
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 bg-orange-900/10 rounded-lg px-4 py-3 border border-orange-800/20">
                    <span className="text-orange-500">🔨</span>
                    <span className="text-gray-200 text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Frontend Pages (Terminal — API exists)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {['Recurring invest', 'Authenticator app', 'Help support', 'Learn blog', 'Mobile app', 'Security (full)', 'Address management', 'Trade API keys', 'History (export)', 'Referral earnings'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-900/40 rounded px-3 py-2 border border-gray-800/30">
                    <span className="text-gray-600">⬜</span>
                    <span className="text-gray-300 text-xs">{t}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Phase 2-4: Future">
              <div className="space-y-2">
                {[
                  { phase: 'Phase 2: Security', items: ['Auth middleware on all routes', '2FA step-up', 'Audit ray ID', 'Google OAuth', 'bcrypt passwords'] },
                  { phase: 'Phase 3: Integrations', items: ['WhatsApp Business API', 'Live market feeds', 'AI module (OpenRouter)', 'Duitku production'] },
                  { phase: 'Phase 4: Production', items: ['GitHub Actions CI/CD', 'Cloud deployment', 'DB backups', 'Mobile packaging', 'Vuln scanning'] },
                ].map((phase, i) => (
                  <div key={i} className="bg-gray-900/40 rounded-lg p-3 border border-gray-800/30">
                    <div className="text-white font-semibold text-xs mb-2">{phase.phase}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.items.map((item, j) => (
                        <span key={j} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Full Prompt */}
        {activeTab === 'full' && (
          <div>
            <Section title="Complete Merged Prompt (Copy & Paste)">
              <p className="text-gray-400 mb-4">
                This is the full merged prompt combining the project context with the new route-mirror exchange build instructions.
                Copy it and paste into any AI agent to continue development.
              </p>
              <div className="relative">
                <div className="absolute top-3 right-3 z-10">
                  <CopyButton text={FULL_PROMPT} />
                </div>
                <pre className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 overflow-x-auto text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[700px] overflow-y-auto">
                  {FULL_PROMPT}
                </pre>
              </div>
            </Section>

            <Section title="Quick Deploy Commands">
              <CodeBlock title="Terminal" code={`ssh khuchinque@187.127.178.20
cd /home/khuchinque/0-TRADER-COMPANEY

# Generate routes
node scripts/gen-routes.mjs

# Build
npm run build -w packages/shared
npm run build --workspaces

# Start exchange
pm2 start apps/exchange/.next/server.js --name exchange -p 22221
pm2 save

# Test
bash scripts/smoke-exchange.sh

# Access
# http://187.127.178.20:22221/`} />
            </Section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-xs">
            0-TRADER-COMPANEY • Indonesian Paper-Trading Crypto Exchange
          </p>
          <p className="text-gray-600 text-xs mt-1">
            VPS: <span className="font-mono text-gray-500">187.127.178.20</span> •
            GitHub: <a href="https://github.com/khuchinque-app/0-TRADER-COMPANEY" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">khuchinque-app/0-TRADER-COMPANEY</a> •
            New: <span className="text-orange-400 font-mono">:22221</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
