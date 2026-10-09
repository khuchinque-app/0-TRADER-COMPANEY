import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import Database from "better-sqlite3";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createPriceRouter } from "./routes/price";
import { paymentRouter } from "./routes/payment";
import { agentRouter } from "./routes/agent";
import { priceFeed } from "./pricefeed/service";import { isSymbol, SUPPORTED_SYMBOLS } from "./pricefeed/adapter";
import { tapeService, TAPE_LEN, TapeTrade } from "./pricefeed/tape";
import { createMarketRouter, startMarketResolution, setMarketDb, fillMarketOrder, placeLimitOrder, startLimitMatcher } from "./market";
import { createSocialRouter } from "./social";

// Resolve .env from repo root (works from both src/ and dist/)
const repoRoot = path.resolve(__dirname, "../../..");
const dotenvPath = path.resolve(repoRoot, ".env");
dotenv.config({ path: dotenvPath });

const app = express();
const PORT = process.env.PORT_BACKEND || 11110;

import { rateLimit } from './middleware/rate-limit';
import { onLimitCancelled } from './market';

app.use(rateLimit({ windowMs: 60000, maxRequests: 100 }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = process.env.DB_PATH || path.resolve(repoRoot, "apps/engine/data/ledger.db");
const db = new Database(dbPath);db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");
// Share the single ledger handle with modules that mount after initDb (e.g. social.ts).
(globalThis as any).__backdb = db;

// Dev credentials (not in .env per rule #5; defaults match existing autopilot/T01.sh)
const DEV_EMAIL = process.env.DEV_EMAIL || "dev@example.com";
const DEV_PASS = process.env.DEV_PASS || "devpass123";
const GUEST_START_USDT = parseFloat(process.env.GUEST_START_USDT || "10000");
const GUEST_RATE_LIMIT = parseInt(process.env.GUEST_RATE_LIMIT || "20"); // 20 guests/hour/IP
const GUEST_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Guest rate limiting (in-memory, per IP)
const guestRateMap: Map<string, number[]> = new Map();

// ── MEMBER ACCOUNTS ───────────────────────────────────────────────────────────
// Members self-register with email + password and receive the same simulated
// starting funds guests get, so registration is immediately tradeable.
const MEMBER_START_USDT = parseFloat(process.env.MEMBER_START_USDT || String(GUEST_START_USDT));
const MEMBER_MIN_PASSWORD = parseInt(process.env.MEMBER_MIN_PASSWORD || "8");
const MEMBER_SESSION_TTL_MS = parseInt(process.env.MEMBER_SESSION_TTL_MS || String(30 * 24 * 60 * 60 * 1000));
const MEMBER_LOGIN_MAX_ATTEMPTS = parseInt(process.env.MEMBER_LOGIN_MAX_ATTEMPTS || "10");
const MEMBER_LOGIN_WINDOW_MS = parseInt(process.env.MEMBER_LOGIN_WINDOW_MS || "900000"); // 15 min

// ── ADMIN CONSOLE ─────────────────────────────────────────────────────────────
// /admin is gated by a single operator password (ADMIN_PASSWORD). On success we mint a
// short-lived session for the system-admin identity, so every existing /api/admin/*
// route guard keeps working unchanged. Override ADMIN_EMAIL/ADMIN_PASSWORD in production —
// the boot log warns until the default is changed.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@chinque.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1";
const ADMIN_SESSION_TTL_MS = parseInt(process.env.ADMIN_SESSION_TTL_MS || String(12 * 60 * 60 * 1000));
const ADMIN_LOGIN_MAX_ATTEMPTS = parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || "8");
const ADMIN_LOGIN_WINDOW_MS = parseInt(process.env.ADMIN_LOGIN_WINDOW_MS || "900000"); // 15 min

// Failed-login throttles (in-memory, per IP). Deliberately separate maps so a member
// cannot exhaust the admin budget and vice versa.
const adminLoginAttempts: Map<string, number[]> = new Map();
const memberLoginAttempts: Map<string, number[]> = new Map();

function throttleCheck(map: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (map.get(key) || []).filter((t) => t > now - windowMs);
  map.set(key, recent);
  return recent.length >= max;
}

function throttleNote(map: Map<string, number[]>, key: string): void {
  const arr = map.get(key) || [];
  arr.push(Date.now());
  map.set(key, arr);
}

// Whitelabel(config table for exchange frontend branding/theming — admin editable)
// created inside initDb() via CREATE TABLE IF NOT EXISTS.

function initDb() {
  // Create tables if they don't exist
  db.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      asset TEXT NOT NULL,
      available REAL NOT NULL DEFAULT 0,
      locked REAL NOT NULL DEFAULT 0,
      UNIQUE(account_id, asset),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_balances_account ON balances(account_id);
  `);

  // Add role column if missing (admin routes reference it)
  const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!cols.some(c => c.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
  }

  // Repair the users.status CHECK constraint. The original table only allowed
  // ('pending','active'), but PUT /api/admin/users/:id/status accepts 'suspended' —
  // so suspending a member from the admin console failed with a constraint error.
  // SQLite cannot ALTER a CHECK, so rebuild the table inside a transaction and refuse
  // to continue unless the row count is preserved exactly.
  const usersSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql?: string } | undefined)?.sql || "";
  if (usersSql && !usersSql.includes("'suspended'")) {
    const before = (db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c;
    db.pragma("foreign_keys=OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          phone_verified INTEGER NOT NULL DEFAULT 0,
          password_hash TEXT,
          status TEXT NOT NULL CHECK(status IN ('pending','active','suspended')) DEFAULT 'pending',
          ray_id TEXT,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT INTO users_new (id, email, phone, phone_verified, password_hash, status, ray_id, role, created_at, updated_at)
          SELECT id, email, phone, phone_verified, password_hash, status, ray_id, role, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
    })();
    db.pragma("foreign_keys=ON");
    const after = (db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c;
    if (after !== before) {
      throw new Error(`users.status migration changed row count: ${before} -> ${after}`);
    }
    console.log(`[db] users.status CHECK widened to allow 'suspended' (${after} rows preserved)`);
  }

  // Create other tables needed by admin/integrity routes
  db.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE TABLE IF NOT EXISTS journal (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );
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
    CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_id);
    CREATE TABLE IF NOT EXISTS fills (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      fee REAL NOT NULL,
      fee_asset TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (user_id) REFERENCES accounts(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_fills_user ON fills(user_id);
    CREATE INDEX IF NOT EXISTS idx_fills_order ON fills(order_id);
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ray_id TEXT,
      user_id TEXT,
      event TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ray ON audit_log(ray_id);
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Idempotent additive migration: stop_loss / take_profit on orders (task.md: order
  // history must carry these). SQLite has no "ADD COLUMN IF NOT EXISTS", so probe
  // PRAGMA table_info first — safe to run on every boot, existing rows keep NULL.
  const orderCols = new Set(
    (db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>).map((c) => c.name)
  );
  if (!orderCols.has("stop_loss")) db.exec("ALTER TABLE orders ADD COLUMN stop_loss REAL");
  if (!orderCols.has("take_profit")) db.exec("ALTER TABLE orders ADD COLUMN take_profit REAL");
}

// Run DB initialization on startup
initDb();

// Extracted idempotent seed function (used by startup hook, /api/auth/seed, and `npm run seed`)
function seedDevAccount(): { seeded: boolean; message: string } {
  try {
    const hash = hashPassword(DEV_PASS);
    const rayId = `ray-${randomBytes(8).toString("hex")}`;
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(DEV_EMAIL) as { id: string | null } | undefined;
    if (!existing) {
      const devId = `dev_${randomBytes(8).toString("hex")}`;
      db.prepare("INSERT INTO users (id, email, password_hash, status, role, ray_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        devId, DEV_EMAIL, hash, "active", "system-admin", rayId, NOW, NOW
      );
      return { seeded: true, message: `Seeded dev account: ${DEV_EMAIL}` };
    }
    if (!existing.id) {
      // Heal a NULL id left by earlier seed versions (SQLite allows NULL in a TEXT PK)
      const devId = `dev_${randomBytes(8).toString("hex")}`;
      db.prepare("UPDATE users SET id = ?, password_hash = ?, status = 'active', role = 'system-admin', ray_id = ?, updated_at = ? WHERE email = ?").run(
        devId, hash, rayId, NOW, DEV_EMAIL
      );
      return { seeded: true, message: `Healed dev account id: ${DEV_EMAIL}` };
    }
    // Refresh password hash to ensure it's always correct
    db.prepare("UPDATE users SET password_hash = ?, status = 'active', role = 'system-admin', ray_id = ?, updated_at = ? WHERE email = ?").run(hash, rayId, NOW, DEV_EMAIL);
    return { seeded: false, message: `Dev account already exists: ${DEV_EMAIL} (password refreshed)` };
  } catch (e: any) {
    return { seeded: false, message: `Seed failed: ${e.message}` };
  }
}

// FX CACHE (USD/IDR rate)
let fxCache: { rate: number; ts: number; source: string } | null = null;
const FX_TTL_MS = parseInt(process.env.FX_TTL_MS || "60000"); // default 1 min
const FX_STALE_MAX_MS = parseInt(process.env.FX_STALE_MAX_MS || "300000"); // default 5 min

function getUsdtIdrRate(): Promise<{ rate: number; source: string; ts: number; stale: boolean }> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    if (fxCache && (now - fxCache.ts) < FX_TTL_MS) {
      return resolve({ ...fxCache, stale: false });
    }
    if (fxCache && (now - fxCache.ts) < FX_STALE_MAX_MS) {
      return resolve({ ...fxCache, stale: true });
    }
    // Calculate USD/IDR from BTC prices (BTCUSDT and BTCIDR on Binance)
    const timeout = setTimeout(() => {
      if (fxCache) {
        resolve({ ...fxCache, stale: true });
      } else {
        reject(new Error("timeout"));
      }
    }, 5000);
    Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { signal: AbortSignal.timeout(3000) }),
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCIDR", { signal: AbortSignal.timeout(3000) })
    ])
      .then(async ([btcUsdtRes, btcIdrRes]) => {
        const btcUsdt = await btcUsdtRes.json() as { price: string };
        const btcIdr = await btcIdrRes.json() as { price: string };
        const btcUsdtPrice = parseFloat(btcUsdt.price);
        const btcIdrPrice = parseFloat(btcIdr.price);
        // USD/IDR = BTC/IDR / BTC/USDT
        const usdr = btcIdrPrice / btcUsdtPrice;
        fxCache = { rate: usdr, ts: now, source: "binance" };
        clearTimeout(timeout);
        resolve({ rate: usdr, source: "binance", ts: now, stale: false });
      })
      .catch(err => {
        clearTimeout(timeout);
        // Fallback to known rate
        if (!fxCache) {
          fxCache = { rate: 15850, ts: now, source: "fallback" };
        }
        resolve({ ...fxCache, stale: true });
      });
  });
}

function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  if (!stored.startsWith("scrypt:")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = scryptSync(pw, salt, 64);
  const storedBuf = Buffer.from(hashHex, "hex");
  return timingSafeEqual(expected, storedBuf);
}

function signJWT(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256").update(`${header}.${body}.${secret}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token: string, secret: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = createHash("sha256").update(`${header}.${body}.${secret}`).digest("base64url");
    if (expected !== sig) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const NOW = Math.floor(Date.now() / 1000);

function getUserId(req: any): string | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const who = verifyJWT(token, JWT_SECRET);
  if (!who) return null;
  // Sessions may carry an expiry (member + admin sessions do). Enforce it here so every
  // existing route that resolves the caller through this helper gets expiry for free.
  if (typeof who.exp === "number" && Date.now() > who.exp) return null;
  return who.sub ?? null;
}

function roleOf(userId: string | null): string | null {
  if (!userId) return null;
  try {
    const row = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role?: string } | undefined;
    return row?.role ?? null;
  } catch {
    return null;
  }
}

/** Length-tolerant constant-time string compare (avoids leaking a password's length). */
function safeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn a comparison so length is not a timing oracle
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Express guard for every /api/admin/* route. */
function requireSystemAdmin(req: any, res: any, next: any): void {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to the admin console" }, simulasi: true });
  }
  if (roleOf(userId) !== "system-admin") {
    return res.status(403).json({ error: { code: "forbidden", message: "system-admin required" }, simulasi: true });
  }
  next();
}

// AUTH ROUTES
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const unixNow = (): number => Math.floor(Date.now() / 1000);

/**
 * Member self-registration. Creates the user, their ledger account, a starting
 * simulated USDT balance and the matching journal entry — then signs them in, so a
 * freshly registered member can trade immediately. Mounted at both /api/auth/register
 * (the explicit member-registration endpoint the UI uses) and /api/auth/signup (kept for
 * backwards compatibility).
 */
function registerMember(req: any, res: any): void {
  try {
    const { email, password, name } = (req.body ?? {}) as Record<string, unknown>;
    const emailLower = String(email ?? "").trim().toLowerCase();
    if (!emailLower || !password) {
      return res.status(400).json({ error: { code: "bad_credentials", message: "Email and password required" }, simulasi: true });
    }
    if (!EMAIL_RE.test(emailLower)) {
      return res.status(400).json({ error: { code: "invalid_email", message: "Enter a valid email address" }, simulasi: true });
    }
    const pw = String(password);
    if (pw.length < MEMBER_MIN_PASSWORD) {
      return res.status(400).json({
        error: { code: "weak_password", message: `Password must be at least ${MEMBER_MIN_PASSWORD} characters` },
        simulasi: true,
      });
    }
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(emailLower)) {
      return res.status(409).json({ error: { code: "email_taken", message: "Email already registered" }, simulasi: true });
    }

    const hash = hashPassword(pw);
    const rayId = `ray-${randomBytes(8).toString("hex")}`;
    const userId = `u_${randomBytes(8).toString("hex")}`;
    const accountId = `acct_${randomBytes(8).toString("hex")}`;
    const ts = unixNow();
    const displayName = typeof name === "string" && name.trim() ? name.trim().slice(0, 60) : "Member";

    db.transaction(() => {
      db.prepare("INSERT INTO users (id, email, password_hash, status, role, ray_id, created_at, updated_at) VALUES (?, ?, ?, 'active', 'customer', ?, ?, ?)")
        .run(userId, emailLower, hash, rayId, ts, ts);
      db.prepare("INSERT INTO accounts (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(accountId, userId, displayName, ts, ts);
      db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, 'USDT', ?, 0)")
        .run(accountId, MEMBER_START_USDT);
      const journalId = `signup_${userId}_USDT`;
      db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)")
        .run(journalId, ts, `Signup demo funds ${MEMBER_START_USDT} USDT`, ts);
      db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, 'USDT', ?, 'debit')")
        .run(journalId, accountId, MEMBER_START_USDT);
      db.prepare("INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, 'member_registered', ?, ?)")
        .run(rayId, userId, emailLower, ts);
    })();

    const token = signJWT({ sub: userId, ray: rayId, iat: Date.now(), exp: Date.now() + MEMBER_SESSION_TTL_MS }, JWT_SECRET);
    res.status(201).json({
      ok: true,
      userId,
      accountId,
      token,
      user: { id: userId, email: emailLower, name: displayName, role: "customer", status: "active" },
      wallet: {
        accountId,
        balances: [{ asset: "USDT", available: MEMBER_START_USDT, locked: 0, total: MEMBER_START_USDT }],
        balance: MEMBER_START_USDT,
        currency: "USDT",
      },
      simulasi: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
  }
}

app.post("/api/auth/register", registerMember);
app.post("/api/auth/signup", registerMember);

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const userEmail = String(email ?? "").trim().toLowerCase();
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const throttleKey = `${ip}|${userEmail}`;

    if (throttleCheck(memberLoginAttempts, throttleKey, MEMBER_LOGIN_MAX_ATTEMPTS, MEMBER_LOGIN_WINDOW_MS)) {
      res.setHeader("Retry-After", String(Math.ceil(MEMBER_LOGIN_WINDOW_MS / 1000)));
      return res.status(429).json({ error: { code: "rate_limited", message: "Too many sign-in attempts. Try again later." }, simulasi: true });
    }

    // One generic message for every credential failure — never reveal which field was wrong.
    const invalid = (): any => {
      throttleNote(memberLoginAttempts, throttleKey);
      return res.status(401).json({ error: { code: "bad_credentials", message: "Invalid email or password" }, simulasi: true });
    };

    // NOTE: the users table has no `name` column — the display name lives on accounts.name.
    const userRow = db.prepare(
      "SELECT u.id, u.email, u.status, u.role, u.password_hash, u.ray_id, a.name AS account_name " +
      "FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.email = ?"
    ).get(userEmail) as any;
    if (!userRow || !userRow.password_hash) return invalid();
    if (!verifyPassword(String(password ?? ""), userRow.password_hash)) return invalid();

    if (userRow.status === "suspended") {
      return res.status(403).json({ error: { code: "account_suspended", message: "This account is suspended" }, simulasi: true });
    }
    if (userRow.status !== "active") {
      return res.status(403).json({ error: { code: "pending_verification", message: "Finish phone verification first" }, simulasi: true });
    }

    memberLoginAttempts.delete(throttleKey); // successful sign-in clears the throttle
    const payload = { sub: userRow.id, ray: userRow.ray_id, iat: Date.now(), exp: Date.now() + MEMBER_SESSION_TTL_MS };
    const jwt = signJWT(payload, JWT_SECRET);
    res.json({
      ok: true,
      userId: userRow.id,
      rayId: userRow.ray_id,
      token: jwt,
      user: { id: userRow.id, email: userRow.email, name: userRow.account_name ?? null, role: userRow.role ?? "customer", status: userRow.status },
      redirect: "/dashboard",
      simulasi: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
  }
});

// Seed dev credentials (idempotent)
app.post("/api/auth/seed", (req, res) => {
  const result = seedDevAccount();
  res.json({ seeded: result.seeded, message: result.message, email: DEV_EMAIL, simulasi: true });
});

// Guest demo login endpoint
app.post("/api/auth/guest", (req, res) => {
  try {
    // Rate limit: GUEST_RATE_LIMIT per hour per IP
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const windowStart = now - GUEST_RATE_WINDOW_MS;
    const timestamps = guestRateMap.get(ip) || [];
    const recent = timestamps.filter((ts) => ts > windowStart);
    if (recent.length >= GUEST_RATE_LIMIT) {
      return res.status(429).json({ error: "rate_limited", message: "Too many guest accounts. Try again later.", simulasi: true });
    }
    recent.push(now);
    guestRateMap.set(ip, recent);

    // Create guest user
    const guestId = `guest-${randomBytes(8).toString("hex")}`;
    const guestEmail = `${guestId}@simulasi.local`;
    const noHash = ""; // guest has no password
    const rayId = `ray-${randomBytes(8).toString("hex")}`;
    const result = db.prepare("INSERT INTO users (id, email, password_hash, status, role, ray_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      guestId, guestEmail, noHash, "active", "customer", rayId, NOW, NOW
    );
    const userId = guestId;

    // Create account for guest
    const accountId = `acct-${randomBytes(8).toString("hex")}`;
    db.prepare("INSERT INTO accounts (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
      accountId, userId, "Guest Wallet", NOW, NOW
    );

    // Credit starting balance
    const amount = GUEST_START_USDT;
    const existing = db.prepare("SELECT id FROM balances WHERE account_id = ? AND asset = ?").get(accountId, "USDT") as { id: number } | undefined;
    if (existing) {
      db.prepare("UPDATE balances SET available = available + ? WHERE id = ?").run(amount, existing.id);
    } else {
      db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, ?, ?, ?)").run(accountId, "USDT", amount, 0);
    }

    // Journal entry
    const journalId = `dep_${accountId}_USDT`;
    db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)").run(journalId, NOW, `Deposit ${amount} USDT`, NOW);
    db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)").run(journalId, accountId, "USDT", amount, "debit");

    const payload = { sub: userId, ray: rayId, iat: Date.now() };
    const token = signJWT(payload, JWT_SECRET);

    res.status(201).json({
      ok: true,
      userId,
      accountId,
      token,
      wallet: {
        accountId,
        balances: [{ asset: "USDT", available: amount, locked: 0, total: amount }],
        balance: amount,
        currency: "USDT"
      },
      simulasi: true
    });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: { code: "unauthenticated", message: "Sign in first" }, simulasi: true });
  try {
    const userRow = db.prepare(
      "SELECT u.id, u.email, u.phone, u.phone_verified, u.status, u.role, u.ray_id, u.created_at, a.name AS account_name " +
      "FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.id = ?"
    ).get(userId);
    if (!userRow) return res.status(401).json({ error: { code: "unauthenticated", message: "Sign in first" }, simulasi: true });
    const user = userRow as any;
    // `isAdmin` lets the SPA show the admin entry point without a second round trip.
    res.json({ ...user, name: user.account_name ?? null, isAdmin: user.role === "system-admin", simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
  }
});

// ADMIN ROUTES
// ── ADMIN CONSOLE AUTH (password-gated) ──────────────────────────────────────
// The operator signs in with just ADMIN_PASSWORD. On success we mint a short-lived
// session token for the seeded system-admin identity, so every existing role-guarded
// /api/admin/* route works unchanged. The password itself is never stored or logged.
app.post("/api/admin/login", (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (throttleCheck(adminLoginAttempts, ip, ADMIN_LOGIN_MAX_ATTEMPTS, ADMIN_LOGIN_WINDOW_MS)) {
      res.setHeader("Retry-After", String(Math.ceil(ADMIN_LOGIN_WINDOW_MS / 1000)));
      return res.status(429).json({ error: { code: "rate_limited", message: "Too many admin sign-in attempts" }, simulasi: true });
    }
    const { password } = req.body ?? {};
    if (!password || !safeEqualStr(String(password), ADMIN_PASSWORD)) {
      throttleNote(adminLoginAttempts, ip);
      return res.status(401).json({ error: { code: "bad_credentials", message: "Invalid admin password" }, simulasi: true });
    }

    // Resolve the system-admin identity the session will act as (seed on first use).
    let admin = db.prepare("SELECT id, email, role FROM users WHERE role = 'system-admin' ORDER BY created_at LIMIT 1").get() as { id: string; email: string; role: string } | undefined;
    if (!admin) {
      seedDevAccount();
      admin = db.prepare("SELECT id, email, role FROM users WHERE role = 'system-admin' ORDER BY created_at LIMIT 1").get() as { id: string; email: string; role: string } | undefined;
    }
    if (!admin) {
      return res.status(500).json({ error: { code: "admin_identity_missing", message: "No system-admin identity exists" }, simulasi: true });
    }

    adminLoginAttempts.delete(ip);
    const exp = Date.now() + ADMIN_SESSION_TTL_MS;
    const rayId = `adm-${randomBytes(8).toString("hex")}`;
    const token = signJWT({ sub: admin.id, ray: rayId, adm: true, iat: Date.now(), exp }, JWT_SECRET);
    const ts = unixNow();
    db.prepare("INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, 'admin_login', ?, ?)")
      .run(rayId, admin.id, `ip=${ip}`, ts);
    res.json({
      ok: true,
      token,
      admin: { id: admin.id, email: ADMIN_EMAIL || admin.email, role: admin.role },
      expiresAt: exp,
      simulasi: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
  }
});

app.get("/api/admin/session", requireSystemAdmin, (req, res) => {
  const userId = getUserId(req);
  const row = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(userId) as any;
  res.json({ ok: true, admin: { id: row.id, email: ADMIN_EMAIL || row.email, role: row.role }, simulasi: true });
});

// Stateless tokens: "logout" is the client discarding its token. Kept as an explicit
// endpoint so the console has an auditable action.
app.post("/api/admin/logout", (_req, res) => {
  res.json({ ok: true, simulasi: true });
});

// Dashboard payload for the console: ledger + member + audit summary in one round trip.
app.get("/api/admin/overview", requireSystemAdmin, (_req, res) => {
  try {
    const one = (sql: string): number => ((db.prepare(sql).get() as { c: number } | undefined)?.c ?? 0);
    const counts = {
      users: one("SELECT COUNT(*) c FROM users"),
      members: one("SELECT COUNT(*) c FROM users WHERE role = 'customer'"),
      admins: one("SELECT COUNT(*) c FROM users WHERE role = 'system-admin'"),
      nonActive: one("SELECT COUNT(*) c FROM users WHERE status <> 'active'"),
      accounts: one("SELECT COUNT(*) c FROM accounts"),
      orders: one("SELECT COUNT(*) c FROM orders"),
      openOrders: one("SELECT COUNT(*) c FROM orders WHERE status IN ('open','partially_filled')"),
      fills: one("SELECT COUNT(*) c FROM fills"),
      journalLines: one("SELECT COUNT(*) c FROM journal_lines"),
    };
    const recentMembers = db.prepare(
      "SELECT u.id, u.email, u.status, u.role, u.created_at, a.name AS account_name " +
      "FROM users u LEFT JOIN accounts a ON a.user_id = u.id ORDER BY u.created_at DESC LIMIT 10"
    ).all();
    const recentAudit = db.prepare("SELECT ray_id, user_id, event, detail, created_at FROM audit_log ORDER BY id DESC LIMIT 20").all();
    res.json({ ok: true, counts, brand: readBrand(), recentMembers, recentAudit, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
  }
});

// NOTE: /api/admin/stats and /api/admin/integrity previously had NO authentication at all.
// They are ledger internals, so both are now behind the same guard as the rest of /api/admin/*.
app.get("/api/admin/stats", requireSystemAdmin, (_req, res) => {
  try {
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    res.json({ users: usersCount.count, orders: ordersCount.count, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/admin/integrity", requireSystemAdmin, (req, res) => {
  try {
    const dbCheck = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if ((dbCheck as any).count < 0) {
      return res.status(500).json({ ok: false, message: "Database check failed" });
    }
    const tables = ["users", "orders", "accounts", "balances"];
    const missing = tables.filter(t => {
      try {
        db.prepare(`SELECT 1 FROM ${t} LIMIT 0`).get();
        return false;
      } catch {
        return true;
      }
    });
    if (missing.length > 0) {
      return res.status(500).json({ ok: false, message: `Missing tables: ${missing.join(", ")}` });
    }
    res.json({ ok: true, tables: tables.length - missing.length, database: "ok" });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// MARKETS - Live from Binance API (with USDT fallback for IDR pairs)
app.get("/api/markets", async (_req, res) => {
  try {
    const IDR_SYMBOLS = ["BTCIDR", "ETHIDR", "SOLIDR", "BNBidr", "XRPIDR", "LINKIDR", "AAVEIDR"];
    const MARKETS: any[] = [];
    const fxData = await getUsdtIdrRate();
    const usdrRate = fxData.rate;

    // Fetch all markets in parallel from Binance
    const fetchPromises = IDR_SYMBOLS.map(async (symbol) => {
      try {
        // Try uppercase first (Binance requires exact case)
        const upperSymbol = symbol.toUpperCase();
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${upperSymbol}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) return null;
        const data: any = await response.json();
        return { symbol: upperSymbol, data };
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const origSymbol = IDR_SYMBOLS[i];
      if (result && result.data) {
        const symbol = result.symbol;
        const base = symbol.replace("IDR", "");
        const price = parseFloat(result.data.lastPrice || "0");
        const change24h = parseFloat(result.data.priceChangePercent || "0");
        const volume24h = parseFloat(result.data.quoteVolume || "0");
        const high24h = parseFloat(result.data.highPrice || "0");
        const low24h = parseFloat(result.data.lowPrice || "0");

        MARKETS.push({
          symbol,
          baseAsset: base,
          quoteAsset: "IDR",
          status: "trading",
          price: price.toString(),
          change24h,
          volume24h,
          high24h,
          low24h,
          category: "IDR",
          source: "binance",
          simulasi: true,
          flags: [],
        });
      } else {
        // Fallback: try USDT pair + convert
        const upperSymbol = origSymbol.toUpperCase();
        const usdtSymbol = upperSymbol.replace("IDR", "USDT");
        try {
          const usdtRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${usdtSymbol}`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
          if (usdtRes?.ok) {
            const usdtData: any = await usdtRes.json();
            const base = usdtSymbol.replace("USDT", "");
            const usdPrice = parseFloat(usdtData.lastPrice || "0");
            const idrPrice = usdPrice * usdrRate;
            const change24h = parseFloat(usdtData.priceChangePercent || "0");
            const volume24h = parseFloat(usdtData.quoteVolume || "0") * usdrRate;
            const high24h = parseFloat(usdtData.highPrice || "0") * usdrRate;
            const low24h = parseFloat(usdtData.lowPrice || "0") * usdrRate;

            MARKETS.push({
              symbol: upperSymbol,
              baseAsset: base,
              quoteAsset: "IDR",
              status: "trading",
              price: idrPrice.toString(),
              change24h,
              volume24h,
              high24h,
              low24h,
              category: "IDR",
              source: "binance-fallback",
              simulasi: true,
              flags: [],
            });
          }
        } catch (e) {}
      }
    }

    // Fallback to hardcoded if API fails
    if (MARKETS.length === 0) {
      MARKETS.push(
        { symbol: "BTCIDR", baseAsset: "BTC", quoteAsset: "IDR", status: "trading", price: "1002450000", change24h: 2.34, volume24h: 1245678900, category: "IDR", source: "chinque", simulasi: true, flags: [] },
        { symbol: "ETHIDR", baseAsset: "ETH", quoteAsset: "IDR", status: "trading", price: "54820000", change24h: -1.23, volume24h: 892345600, category: "IDR", source: "chinque", simulasi: true, flags: [] },
        { symbol: "SOLIDR", baseAsset: "SOL", quoteAsset: "IDR", status: "trading", price: "2829000", change24h: 5.67, volume24h: 456789000, category: "LAYER1", source: "chinque", simulasi: true, flags: [] },
        { symbol: "BNBidr", baseAsset: "BNB", quoteAsset: "IDR", status: "trading", price: "9706000", change24h: 0.89, volume24h: 234567800, category: "IDR", source: "chinque", simulasi: true, flags: [] },
        { symbol: "XRPIDR", baseAsset: "XRP", quoteAsset: "IDR", status: "trading", price: "9248", change24h: -0.45, volume24h: 567890000, category: "IDR", source: "chinque", simulasi: true, flags: [] },
        { symbol: "LINKIDR", baseAsset: "LINK", quoteAsset: "IDR", status: "trading", price: "230800", change24h: 3.21, volume24h: 123456700, category: "DEFI", source: "chinque", simulasi: true, flags: [] },
        { symbol: "AAVEIDR", baseAsset: "AAVE", quoteAsset: "IDR", status: "trading", price: "1565000", change24h: -2.10, volume24h: 89012300, category: "DEFI", source: "chinque", simulasi: true, flags: [] }
      );
    }

    res.json({
      markets: MARKETS,
      simulasi: true,
      total: MARKETS.length,
      timestamp: new Date().toISOString(),
      usdrRate: fxData.rate,
    });
  } catch (e: any) {
    console.error("Markets API error:", e);
    res.status(500).json({
      error: "internal",
      message: e.message,
      markets: [],
      simulasi: true,
    });
  }
});

// ALIAS: /market -> /api/markets
app.get("/market", (_req, res) => {
  res.redirect(301, '/api/markets');
});

// M6-M7: MEXC-backed /api/market/* for the exchange app (public data only)
setMarketDb(db);
app.use("/api/market", createMarketRouter());

// Mock fill endpoint for the exchange order form (B8): market orders walk MEXC
// depth; fills post to ledger.db. Auth via same JWT. NO MEXC private calls.
app.post("/api/market/orders", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const { slug, side, quantity, type, price, stopLoss, takeProfit } = req.body ?? {};
    if (!slug || !(side === "buy" || side === "sell")) {
      return res.status(400).json({ error: "invalid_params", message: "slug and side (buy|sell) required" });
    }
    // Optional SL/TP triggers — absent/invalid/non-positive collapses to null (not 0).
    const posNum = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    if (type === "limit") {
      const result = await placeLimitOrder({
        userId, slug: String(slug), side, price: Number(price), quantity: Number(quantity),
        stopLoss: posNum(stopLoss), takeProfit: posNum(takeProfit), db,
      });
      if (!result.ok) return res.status(result.status).json({ error: result.error, message: result.message, simulasi: true });
      return res.status(result.status).json(result.body);
    }
    const result = await fillMarketOrder({ userId, slug: String(slug), side, quantity: Number(quantity) });
    if (!result.ok) return res.status(result.status).json({ error: result.error, message: result.message, simulasi: true });
    res.status(result.status).json(result.body);
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message, simulasi: true });
  }
});

// cancel a resting limit order (unlock reserved funds)
app.delete("/api/market/orders/:id", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const o = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND type = 'limit'").get(req.params.id, userId) as any;
    if (!o) return res.status(404).json({ error: "not_found", simulasi: true });
    if (o.status !== "open" && o.status !== "partially_filled") return res.status(400).json({ error: "not_open", simulasi: true });
    const now = Math.floor(Date.now() / 1000);
    db.transaction(() => {
      db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, o.id);
      const base = o.pair.replace(/USDT$/, "");
      const reserveAsset = o.side === "sell" ? base : "USDT";
      const reserveAmount = o.side === "sell" ? o.quantity : o.price * o.quantity * 1.001;
      const rrow = db.prepare("SELECT b.id FROM balances b JOIN accounts a ON a.id = b.account_id WHERE a.user_id = ? AND b.asset = ?").get(userId, reserveAsset) as { id: number } | undefined;
      if (rrow) db.prepare("UPDATE balances SET locked = MAX(locked - ?, 0), available = available + ? WHERE id = ?").run(reserveAmount, reserveAmount, rrow.id);
    })();
    onLimitCancelled(o.id);
    res.json({ ok: true, orderId: o.id, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message, simulasi: true });
  }
});

// Open orders + trade history for one slug (exchange order tabs)
app.get("/api/market/myorders/:slug", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const slug = String(req.params.slug).toUpperCase();
    const base = slug.endsWith("USDT") ? slug.slice(0, -4) : slug.replace(/IDR$/, "");
    const pairCol = `${base}USDT`;
    const open = db.prepare("SELECT * FROM orders WHERE user_id = ? AND pair = ? AND status IN ('open','partially_filled') ORDER BY created_at DESC LIMIT 50").all(userId, pairCol);
    const historic = db.prepare("SELECT * FROM orders WHERE user_id = ? AND pair = ? AND status NOT IN ('open','partially_filled') ORDER BY created_at DESC LIMIT 50").all(userId, pairCol);
    const fills = db.prepare("SELECT * FROM fills WHERE user_id = ? AND pair = ? ORDER BY timestamp DESC LIMIT 50").all(userId, pairCol);
    res.json({ open, history: historic, fills, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message, simulasi: true });
  }
});

// T04: Reference price feed routes (mounted before the generic /api/ticker/:pair route)
app.use(createPriceRouter());
app.use("/api/payment", paymentRouter);
// Google/Telegram manager login stubs + manager lookup (uses globalThis.__backdb).
app.use("/api/social", createSocialRouter());

// T07: Market trades tape — the 50 most recent trades per symbol. Synthetic ticks
// derived from the price feed (tapeService rolling buffer) merged with real user
// fills from the ledger; the requester's own fills are flagged mine: true (when a
// valid Authorization header is present). Exactly 50 rows, newest first.
app.get("/api/trades/:symbol", (req, res) => {
  const raw = String(req.params.symbol || "").toUpperCase();
  const base = raw.endsWith("USDT") ? raw.slice(0, -4) : raw.endsWith("IDR") ? raw.slice(0, -3) : raw;
  if (!isSymbol(base)) {
    return res.status(404).json({
      error: { code: "unknown_symbol", message: `Unknown symbol: ${raw}. Supported: ${SUPPORTED_SYMBOLS.join(", ")}` },
    });
  }
  try {
    const userId = getUserId(req);
    const rows = db
      .prepare("SELECT id, user_id, side, price, quantity, timestamp FROM fills WHERE pair = ?")
      .all(`${base}USDT`) as Array<{
        id: string;
        user_id: string;
        side: string;
        price: number;
        quantity: number;
        timestamp: number;
      }>;
    const ledger: TapeTrade[] = rows.map((r) => ({
      id: `led-${r.id}`,
      price: Number(r.price),
      size: Number(r.quantity),
      side: r.side === "buy" ? "buy" : "sell",
      time: r.timestamp < 1e12 ? r.timestamp * 1000 : r.timestamp,
      mine: userId !== null && r.user_id === userId,
      source: "ledger" as const,
    }));
    const trades = [...ledger, ...tapeService.getTrades(base, TAPE_LEN)]
      .sort((a, b) => b.time - a.time)
      .slice(0, TAPE_LEN);
    res.json({
      symbol: base,
      pair: `${base}USDT`,
      quote: "USDT",
      count: trades.length,
      trades,
      simulasi: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// FX RATE ENDPOINT
app.get("/api/fx/usdt-idr", async (req, res) => {
  try {
    const data = await getUsdtIdrRate();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// TICKER ENDPOINT (Binance API)
app.get("/api/ticker/:pair", async (req, res) => {
  const pair = String(req.params.pair).toUpperCase();
  try {
    // Binance has direct IDR pairs - use them directly
    let apiPair = pair;
    let isIdr = pair.endsWith("IDR");

    // If IDR pair doesn't exist on Binance, try USDT and convert
    if (isIdr) {
      // Try Binance IDR pair first
      const btcIdrRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=BTCIDR`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      const hasIdrPairs = btcIdrRes?.ok;

      if (!hasIdrPairs) {
        // No IDR pairs on Binance, convert from USDT
        apiPair = pair.replace("IDR", "USDT");
        isIdr = false;
      }
    }

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${apiPair}`;
    const timeout = setTimeout(() => {
      res.status(408).json({ error: "timeout", pair });
    }, 5000);

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();

    const lastPrice = parseFloat(data.lastPrice || 0);
    const changePercent = parseFloat(data.priceChangePercent || 0);
    const high = parseFloat(data.highPrice || 0);
    const low = parseFloat(data.lowPrice || 0);
    const volume = parseFloat(data.quoteVolume || 0);

    // For IDR pairs, Binance returns price in IDR directly
    // For USDT pairs, we may need to convert if user wants IDR display
    const base = pair.replace("IDR", "").replace("USDT", "");

    res.json({
      symbol: pair,
      base,
      quote: isIdr ? "IDR" : "USDT",
      lastPrice,
      changePercent,
      high,
      low,
      volume,
      simulasi: true
    });
  } catch (e: any) {
    // Fallback to mock data
    const mockPrices: Record<string, number> = {
      BTC: 82000, ETH: 3500, SOL: 145, BNB: 580, XRP: 0.52, LINK: 18, AAVE: 280
    };
    const fallbackBase = pair.replace("IDR", "").replace("USDT", "");
    const mockPrice = mockPrices[fallbackBase] || 100;
    res.json({
      symbol: pair,
      base: fallbackBase,
      quote: pair.endsWith("IDR") ? "IDR" : "USDT",
      lastPrice: pair.endsWith("IDR") ? mockPrice * 15850 : mockPrice,
      changePercent: (Math.random() - 0.5) * 10,
      high: mockPrice * 1.05,
      low: mockPrice * 0.95,
      volume: mockPrice * 1000000,
      simulasi: true
    });
  }
});

// WALLET ROUTES (M2)
app.get("/api/wallet/balance", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId) as { id: string } | undefined;
    if (!account) return res.status(404).json({ error: "account_not_found" });
    const accountId = account.id;
    const balances = db.prepare("SELECT asset, available, locked FROM balances WHERE account_id = ?").all(accountId);
    const balanceList = balances.map((b: any) => ({
      asset: b.asset,
      available: b.available,
      locked: b.locked,
      total: b.available + b.locked
    }));
    res.json({ accountId, balances: balanceList, totalValueUsdt: 0, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.post("/api/wallet/deposit", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const { asset, amount } = req.body ?? {};
    if (!asset || !amount || amount <= 0) {
      return res.status(400).json({ error: "invalid_params", message: "asset and amount (positive) required" });
    }
    const validAssets = ["USDT", "BTC", "ETH", "SOL", "BNB", "XRP", "LINK", "AAVE"];
    if (!validAssets.includes(asset)) {
      return res.status(400).json({ error: "invalid_asset", message: "Valid assets: " + validAssets.join(", ") });
    }
    const now = Math.floor(Date.now() / 1000);
    const insertEntry = db.transaction(() => {
      let account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId) as { id: string } | undefined;
      if (!account) {
        const acctId = `acct_${randomBytes(8).toString("hex")}`;
        db.prepare("INSERT INTO accounts (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(acctId, userId, "User " + userId, now, now);
        account = { id: acctId };
      }
      const accountId = account.id;
      const existing = db.prepare("SELECT id, available FROM balances WHERE account_id = ? AND asset = ?").get(accountId, asset) as { id: number; available: number } | undefined;
      if (existing) {
        db.prepare("UPDATE balances SET available = available + ? WHERE id = ?").run(existing.available + amount, existing.id);
      } else {
        db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, ?, ?, ?)").run(accountId, asset, amount, 0);
      }
      const journalId = "dep_" + accountId + "_" + asset;
      db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)").run(journalId, now, "Deposit " + amount + " " + asset, now);
      db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)").run(journalId, accountId, asset, amount, "debit");
      return { accountId, asset, amount, newBalance: existing ? existing.available + amount : amount };
    });
    const result = insertEntry();
    res.json({ ok: true, ...result, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/wallet/history", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId) as { id: string } | undefined;
    if (!account) return res.status(404).json({ error: "account_not_found" });
    const accountId = account.id;
    const journals = db.prepare(`
      SELECT j.id, j.timestamp, j.description, jl.asset, jl.amount, jl.entry_type 
      FROM journal j 
      JOIN journal_lines jl ON j.id = jl.journal_id 
      WHERE jl.account_id = ? 
      ORDER BY j.timestamp DESC 
      LIMIT 50
    `).all(accountId);
    res.json({ history: journals, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/wallet/faucet", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId) as { id: string } | undefined;
    if (!account) return res.status(404).json({ error: "account_not_found" });
    const accountId = account.id;
    const now = Math.floor(Date.now() / 1000);
    const recentDeposits = db.prepare(`
      SELECT jl.asset FROM journal j 
      JOIN journal_lines jl ON j.id = jl.journal_id 
      WHERE jl.account_id = ? AND j.timestamp > ? AND j.description LIKE 'Deposit %'
    `).all(accountId, now - 60);
    const cooldownedAssets = recentDeposits.map((d: any) => d.asset);
    const faucetAssets = ["USDT", "BTC", "ETH", "SOL", "BNB", "XRP", "LINK", "AAVE"];
    const availableAssets = faucetAssets.filter((a: string) => !cooldownedAssets.includes(a));
    if (availableAssets.length === 0) {
      return res.json({ ok: false, message: "Cooldown active. Wait 60 seconds.", simulasi: true });
    }
    const faucetAmounts: Record<string, number> = {
      USDT: 1000, BTC: 0.01, ETH: 0.1, SOL: 1, BNB: 0.1, XRP: 100, LINK: 10, AAVE: 0.1
    };
    const results: any[] = [];
    const insertFaucet = db.transaction(() => {
      for (const asset of availableAssets) {
        const amount = faucetAmounts[asset] || 1000;
        const existing = db.prepare("SELECT id, available FROM balances WHERE account_id = ? AND asset = ?").get(accountId, asset) as { id: number; available: number } | undefined;
        if (existing) {
          db.prepare("UPDATE balances SET available = available + ? WHERE id = ?").run(amount, existing.id);
        } else {
          db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, ?, ?, ?)").run(accountId, asset, amount, 0);
        }
        const journalId = "faucet_" + accountId + "_" + asset;
        db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)").run(journalId, now, "Faucet " + amount + " " + asset, now);
        db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)").run(journalId, accountId, asset, amount, "debit");
        results.push({ asset, amount });
      }
      return results;
    });
    res.json({ ok: true, deposited: insertFaucet(), simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// ORDER ROUTES (M3)
app.post("/api/orders", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const { pair, side, type, price, quantity } = req.body ?? {};
    if (!pair || !side || !type || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "invalid_params", message: "pair, side, type, quantity required" });
    }
    if (!["buy", "sell"].includes(side)) {
      return res.status(400).json({ error: "invalid_side", message: "side must be buy or sell" });
    }
    if (!["limit", "market"].includes(type)) {
      return res.status(400).json({ error: "invalid_type", message: "type must be limit or market" });
    }
    if (type === "limit" && (!price || price <= 0)) {
      return res.status(400).json({ error: "invalid_price", message: "price required for limit orders" });
    }
    const now = Math.floor(Date.now() / 1000);
    const orderId = "ord_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const orderPrice = type === "market" ? 0 : price;
    db.prepare("INSERT INTO orders (id, user_id, pair, side, type, price, quantity, filled_quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      orderId, userId, pair, side, type, orderPrice, quantity, 0, "open", now, now
    );
    res.json({ ok: true, orderId, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/orders", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as any[];
    res.json({ orders, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.delete("/api/orders/:id", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const orderId = req.params.id;
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(orderId, userId) as any;
    if (!order) return res.status(404).json({ error: "not_found" });
    if (order.status !== "open" && order.status !== "partially_filled") {
      return res.status(400).json({ error: "cannot_cancel", message: "Order is not open" });
    }
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE orders SET status = cancelled, updated_at = ? WHERE id = ?").run(now, orderId);
    res.json({ ok: true, orderId, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/portfolio", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId) as { id: string } | undefined;
    if (!account) {
      return res.json({ accountId: null, positions: [], balances: [], totalValueUsdt: 0, simulasi: true });
    }
    const accountId = account.id;
    const balances = db.prepare("SELECT asset, available, locked FROM balances WHERE account_id = ?").all(accountId);
    const filledOrders = db.prepare(`
      SELECT o.pair, o.side, o.quantity, o.price, f.quantity as fill_qty, f.price as fill_price
      FROM orders o JOIN fills f ON o.id = f.order_id
      WHERE o.user_id = ? AND o.status = 'filled'
    `).all(userId) as any[];
    let realizedPnl = 0;
    const positionMap = new Map();
    for (const order of filledOrders) {
      const pos = positionMap.get(order.pair) || { quantity: 0, avgEntry: 0 };
      if (order.side === "buy") {
        const totalCost = order.fill_qty * order.fill_price;
        pos.quantity += order.fill_qty;
        pos.avgEntry = pos.quantity > 0 ? (pos.avgEntry * (pos.quantity - order.fill_qty) + totalCost) / pos.quantity : 0;
      } else {
        const pnl = (order.fill_price - pos.avgEntry) * order.fill_qty;
        realizedPnl += pnl;
        pos.quantity -= order.fill_qty;
        if (pos.quantity <= 0) { positionMap.delete(order.pair); } else { pos.avgEntry = 0; }
      }
      positionMap.set(order.pair, pos);
    }
    const positions = Array.from(positionMap.entries()).map(([pair, data]: any) => ({ pair, quantity: data.quantity, avgEntryPrice: data.avgEntry }));
    res.json({ accountId, balances, positions, realizedPnl, totalValueUsdt: 0, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// HEALTH

// ========== ADMIN ROUTES EXTENDED ==========

// GET /api/admin/users - list all users
app.get("/api/admin/users", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const users = db.prepare(
      "SELECT u.id, u.email, u.phone, u.phone_verified, u.status, u.role, u.ray_id, u.created_at, u.updated_at, a.name AS account_name " +
      "FROM users u LEFT JOIN accounts a ON a.user_id = u.id ORDER BY u.created_at DESC LIMIT 100"
    ).all();
    res.json({ users, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// GET /api/admin/users/:id - user detail
app.get("/api/admin/users/:id", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const userData = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!userData) return res.status(404).json({ error: "not_found" });
    res.json({ user: userData, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// PUT /api/admin/users/:id/status - update user status
app.put("/api/admin/users/:id/status", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const { status } = req.body ?? {};
    if (!status || !["active", "pending", "suspended"].includes(status)) {
      return res.status(400).json({ error: "invalid_params", message: "status must be active, pending, or suspended" });
    }
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(status, now, req.params.id);
    db.prepare("INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId, req.params.id, "user_status_updated", "Status changed to " + status, now
    );
    res.json({ ok: true, userId: req.params.id, status, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// PUT /api/admin/users/:id/role - update user role
app.put("/api/admin/users/:id/role", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const { role } = req.body ?? {};
    if (!role || !["customer", "system-admin"].includes(role)) {
      return res.status(400).json({ error: "invalid_params", message: "role must be customer or system-admin" });
    }
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(role, now, req.params.id);
    db.prepare("INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId, req.params.id, "user_role_updated", "Role changed to " + role, now
    );
    res.json({ ok: true, userId: req.params.id, role, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// POST /api/admin/users/:id/adjust - adjust wallet balance
app.post("/api/admin/users/:id/adjust", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const { asset, amount, reason } = req.body ?? {};
    if (!asset || !amount || !reason) {
      return res.status(400).json({ error: "invalid_params", message: "asset, amount, and reason required" });
    }
    const now = Math.floor(Date.now() / 1000);
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(req.params.id) as { id: string } | undefined;
    if (!account) return res.status(404).json({ error: "account_not_found" });
    const accountId = account.id;
    const existing = db.prepare("SELECT id, available FROM balances WHERE account_id = ? AND asset = ?").get(accountId, asset) as { id: number; available: number } | undefined;
    if (existing) {
      db.prepare("UPDATE balances SET available = available + ? WHERE id = ?").run(amount, existing.id);
    } else {
      db.prepare("INSERT INTO balances (account_id, asset, available, locked) VALUES (?, ?, ?, ?)").run(accountId, asset, amount, 0);
    }
    const journalId = "adj_" + accountId + "_" + asset;
    db.prepare("INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)").run(journalId, now, "Admin adjustment: " + reason, now);
    const entryType = amount >= 0 ? "debit" : "credit";
    db.prepare("INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)").run(journalId, accountId, asset, Math.abs(amount), entryType);
    db.prepare("INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId, req.params.id, "wallet_adjusted", reason, now
    );
    res.json({ ok: true, accountId, asset, amount, reason, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// GET /api/admin/audit - get audit log
app.get("/api/admin/audit", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user || user.role !== "system-admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }
  try {
    const logs = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100").all();
    res.json({ audit: logs, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "trading-backend", port: PORT, timestamp: new Date().toISOString() });
});

// Alias for /api/health (used by verify scripts)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MEXC API PROXY (bypasses CORS restrictions)
app.get("/api/mexc/markets", async (_req, res) => {
  try {
    const response = await fetch("https://api.mexc.com/api/v3/ticker/24hr", {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// CHAT ENDPOINT (for voice agent)
app.post("/api/chat", (req, res) => {
  const { message } = req.body ?? {};
  if (!message) {
    return res.status(400).json({ error: "message_required" });
  }
  const lower = String(message).toLowerCase();
  let reply = "";

  // Context-aware responses about Trading Company
  if (lower.includes("halo") || lower.includes("hai") || lower.includes("hello") || lower.includes("hi")) {
    reply = "Halo Lord! Saya bot suara untuk Trading Company. Sistem ini adalah platform paper trading dengan data real dari Indodax. 477 pair tersedia, ledger USDT, IDR hanya display. Ada apa?";
  } else if (lower.includes("project") || lower.includes("ini apa") || lower.includes("apa itu") || lower.includes("ceritakan")) {
    reply = "Ini adalah project Trading Company. Kami membangun platform trading paper — simulasi tanpa uang nyata — dengan data pasar real-time dari Indodax. Backend API di port 11110, frontend di port 22220. Ledger internal pakai USDT, tampilan IDR bisa di-toggle. Semua order dan portfolio tersimpan di SQLite ledger.db.";
  } else if (lower.includes("paper") || lower.includes("simulasi") || lower.includes("tidak nyata")) {
    reply = "Trading paper artinya simulasi. Tidak ada uang sungguhan. Anda bisa beli jual BTC, ETH, dan 475 pair lainnya dengan dana virtual. Hasilnya tercatat di ledger tapi tidak pernah keluar masuk rekening nyata. Aman untuk latihan.";
  } else if (lower.includes("price") || lower.includes("harga") || lower.includes("btc") || lower.includes("eth")) {
    reply = "Harga live bisa dilihat di halaman market. Akses melalui browser di port 22220, atau tanya saya pair tertentu seperti BTCIDR atau ETHUSDT. Data diambil langsung dari Indodax API.";
  } else if (lower.includes("trade") || lower.includes("beli") || lower.includes("jual") || lower.includes("order")) {
    reply = "Fitur trading tersedia di halaman /trade/[PAIR]. Anda bisa kirim order buy atau sell dengan tipe limit atau market. Semua order tercatat di ledger SQLite dan bisa dilihat di halaman portfolio.";
  } else if (lower.includes("wallet") || lower.includes("saldo") || lower.includes("balance") || lower.includes("faucet")) {
    reply = "Saldo simulasi bisa didapat lewat /faucet setiap 60 detik. Asset yang tersedia: USDT, BTC, ETH, SOL, BNB, XRP, LINK, AAVE. Jumlah bervariasi sesuai aset. Saldo tersimpan di tabel balances dalam ledger.db.";
  } else if (lower.includes("help") || lower.includes("bantu") || lower.includes("cara") || lower.includes("command")) {
    reply = "Perintah yang tersedia: kirim teks atau suara untuk chat tentang project, trading, wallet, atau harga. Bot akan membalas dengan voice note HD. Untuk trading manual, buka browser di port 22220. Faucet untuk saldo gratis.";
  } else if (lower.includes("test")) {
    reply = "Test berhasil! Bot suara berjalan dengan baik. Saya adalah agen voice untuk Trading Company — membalas pesan teks dan suara dengan voice note HD berbahasa Indonesia.";
  } else if (lower.includes("chinque") || lower.includes("pair") || lower.includes("market")) {
    reply = "ChinQue menyediakan 477 pair trading — 465 pasangan IDR dan 12 pasangan USDT. Data ticker diambil langsung dari API ChinQue dan di-cache di backend selama 60 detik. Halaman market menampilkan semua pair dengan pencarian dan filter.";
  } else if (lower.includes("port") || lower.includes("api") || lower.includes("backend")) {
    reply = "Port backend API di 11110, frontend terminal di 22220, dan static files di 2217. Endpoint penting: /api/markets untuk daftar pair, /api/ticker/PASS untuk harga live, /api/fx/usdt-idr untuk kurs, /api/chat untuk bot suara.";
  } else if (lower.includes("bot") || lower.includes("suara") || lower.includes("voice")) {
    reply = "Saya adalah bot suara untuk Trading Company. Menggunakan ElevenLabs untuk text-to-speech HD dan backend lokal untuk memproses permintaan. Kirim voice note atau teks, saya akan balas dengan voice note juga.";
  } else {
    reply = "Saya mengerti pesan Anda tentang Trading Company. Ini adalah platform paper trading dengan data real Indodax, 477 pair, ledger USDT, dan tampilan IDR toggle. Ada yang bisa saya bantu tentang trading, wallet, atau project ini?";
  }

  res.json({ reply, message, simulasi: true });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  // M7: resolve indodax slug -> MEXC symbol states (LIVE/NO_FEED)
  startMarketResolution();
  // limit-order matcher pass every 5s
  startLimitMatcher();
  // T04: start the reference price feed poller (immediate first poll, then every few seconds)
  priceFeed.start();
  // T07: start the synthetic market-trades tape (appends a tick per symbol every few seconds)
  tapeService.start();
  // Auto-seed dev credentials on startup (idempotent)
  const result = seedDevAccount();
  console.log(`[${result.seeded ? "SEED" : "INFO"}] ${result.message}`);

  // Admin console surface + a loud warning while the demo password is unchanged.
  console.log(`[admin] console at /admin — sign in with ADMIN_PASSWORD (email label: ${ADMIN_EMAIL})`);
  if (ADMIN_PASSWORD === "admin1") {
    console.warn("[admin] WARNING: ADMIN_PASSWORD is still the default 'admin1'. Set ADMIN_PASSWORD before exposing this service.");
  }
  if (JWT_SECRET === "dev-secret-change-in-production") {
    console.warn("[auth] WARNING: JWT_SECRET is the default value. Set JWT_SECRET before exposing this service.");
  }
});
