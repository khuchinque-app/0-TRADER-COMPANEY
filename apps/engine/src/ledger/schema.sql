-- T6: Ledger Schema (Postgres-compatible)
-- Double-entry accounting spine for the paper trading venue
-- Per ADR 0001: SQLite written Postgres-compatible so later real venue swaps driver

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Balances table (Postgres-compatible NUMERIC as REAL for SQLite)
CREATE TABLE IF NOT EXISTS balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    available REAL NOT NULL DEFAULT 0,
    locked REAL NOT NULL DEFAULT 0,
    UNIQUE(account_id, asset),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Journal table (double-entry ledger)
CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
);

-- Journal lines (debits and credits)
CREATE TABLE IF NOT EXISTS journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount REAL NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('debit', 'credit')),
    FOREIGN KEY (journal_id) REFERENCES journal(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pair TEXT NOT NULL,
    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
    type TEXT NOT NULL CHECK(type IN ('limit', 'market')),
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    filled_quantity REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('open', 'partially_filled', 'filled', 'cancelled')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);

-- Fills table
CREATE TABLE IF NOT EXISTS fills (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    pair TEXT NOT NULL,
    side TEXT NOT NULL,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    fee REAL NOT NULL,
    fee_asset TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);

-- Users table (auth journey spec A.2/A.3): signup saves status=pending,
-- OTP verify flips to active on the SAME row (phone linked to email/gmail).
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'active')) DEFAULT 'pending',
    ray_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Refresh tokens (session JWT + refresh per spec A.3): hashed at rest,
-- revoked by delete; one row per issued refresh token.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User profiles (spec C profile popup: /api/me, /api/me/avatar).
-- user_id is NOT FK-constrained on purpose: the guest demo identity is a
-- localStorage id with no users row (DECISIONS-LOG #5 keeps guest mode alive).
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    updated_at INTEGER NOT NULL
);

-- User preferences (spec C: Dark Mode -> PATCH /api/me/preferences { theme }).
-- theme is constrained to the two palettes the terminal actually ships.
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark', 'light')),
    color_convention TEXT NOT NULL DEFAULT 'green-up' CHECK(color_convention IN ('green-up', 'red-up')),
    display_currency TEXT NOT NULL DEFAULT 'USDT',
    updated_at INTEGER NOT NULL
);

-- Staking positions (spec C: Staking -> /api/staking/*). Paper venue:
-- subscribe posts a real ledger debit (postExternal) and records the
-- position here; rewards are SIMULASI only (no chain, no real yield).
-- entry_id is UNIQUE so a replayed Idempotency-Key cannot double-debit.
CREATE TABLE IF NOT EXISTS staking_positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount REAL NOT NULL,
    apy REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'unstaked')) DEFAULT 'active',
    entry_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staking_user ON staking_positions(user_id);

-- AI-invest subscriptions (spec C: Invest in AI -> /api/ai/*). Paper venue:
-- subscribe debits USDT into a recorded AI plan slot; strategy performance
-- is SIMULASI. entry_id UNIQUE => replayed key cannot double-debit.
CREATE TABLE IF NOT EXISTS ai_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    strategy_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount REAL NOT NULL,
    target_apy REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'closed')) DEFAULT 'active',
    entry_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_subscriptions(user_id);

-- Audit log (spec D): one row per auth/order/security/ledger event;
-- ray_id is carried from signup through every downstream row.
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ray_id TEXT,
    user_id TEXT,
    event TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_ray ON audit_log(ray_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balances_account ON balances(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_fills_user ON fills(user_id);
CREATE INDEX IF NOT EXISTS idx_fills_order ON fills(order_id);

-- Recurring invest plans
CREATE TABLE IF NOT EXISTS recurring_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount REAL NOT NULL,
    frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
    next_run_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_plans(user_id);

-- Deposit addresses
CREATE TABLE IF NOT EXISTS deposit_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    address TEXT NOT NULL,
    tag TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON deposit_addresses(user_id);

-- Withdrawal whitelist
CREATE TABLE IF NOT EXISTS withdrawal_whitelist (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, address)
);
CREATE INDEX IF NOT EXISTS idx_whitelist_user ON withdrawal_whitelist(user_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT,
    referee_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    earned_usdt REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referee_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'pending')),
    category TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);

-- API keys for trading
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '{"read": true, "trade": false, "withdraw": false}',
    expires_at INTEGER,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);
CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_hash ON api_keys(key_hash);

-- Payment invoices (for real payment gateway integration)
CREATE TABLE IF NOT EXISTS payment_invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    gateway_ref TEXT UNIQUE,
    amount REAL NOT NULL,
    asset TEXT NOT NULL DEFAULT 'USDT',
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'expired', 'cancelled')),
    va_number TEXT,
    qr_code TEXT,
    payment_url TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    paid_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES accounts(user_id)
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON payment_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ref ON payment_invoices(gateway_ref);

-- Education content (static for now, can be populated from admin)
CREATE TABLE IF NOT EXISTS education_content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
