import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import Database from "better-sqlite3";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createPriceRouter } from "./routes/price";
import { paymentRouter } from "./routes/payment";
import { agentRouter } from "./routes/agent";
import { priceFeed } from "./pricefeed/service";
import { isSymbol, SUPPORTED_SYMBOLS } from "./pricefeed/adapter";
import { tapeService, TAPE_LEN, TapeTrade } from "./pricefeed/tape";

// Resolve .env from repo root (works from both src/ and dist/)
const repoRoot = path.resolve(__dirname, "../../..");
const dotenvPath = path.resolve(repoRoot, ".env");
dotenv.config({ path: dotenvPath });

const app = express();
const PORT = process.env.PORT_BACKEND || 11110;

import { rateLimit } from './middleware/rate-limit';

app.use(rateLimit({ windowMs: 60000, maxRequests: 100 }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = process.env.DB_PATH || path.resolve(repoRoot, "apps/engine/data/ledger.db");
const db = new Database(dbPath);
db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");

// Dev credentials (not in .env per rule #5; defaults match existing autopilot/T01.sh)
const DEV_EMAIL = process.env.DEV_EMAIL || "dev@example.com";
const DEV_PASS = process.env.DEV_PASS || "devpass123";
const GUEST_START_USDT = parseFloat(process.env.GUEST_START_USDT || "10000");
const GUEST_RATE_LIMIT = parseInt(process.env.GUEST_RATE_LIMIT || "20"); // 20 guests/hour/IP
const GUEST_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Guest rate limiting (in-memory, per IP)
const guestRateMap: Map<string, number[]> = new Map();

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
  `);
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

// FX CACHE (Indodax USDT/IDR rate)
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
    const base = process.env.INDODAX_BASE_URL || "https://indodax.com";
    const url = `${base}/api/ticker/usdtidr`;
    const timeout = setTimeout(() => {
      if (fxCache) {
        resolve({ ...fxCache, stale: true });
      } else {
        reject(new Error("timeout"));
      }
    }, 5000);
    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<any>;
      })
      .then((data: any) => {
        // Indodax returns {"ticker": {"last": "..."}}
        const last = data.ticker?.last || data.last;
        const rate = parseFloat(last);
        if (isNaN(rate)) throw new Error("invalid_rate");
        fxCache = { rate, ts: now, source: "indodax" };
        clearTimeout(timeout);
        resolve({ rate, source: "indodax", ts: now, stale: false });
      })
      .catch(err => {
        clearTimeout(timeout);
        if (fxCache) {
          resolve({ ...fxCache, stale: true });
        } else {
          reject(err);
        }
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
  return who ? who.sub : null;
}

// AUTH ROUTES
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "bad_credentials", message: "Email and password required" });
    }
    const emailLower = String(email).toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(emailLower);
    if (existing) {
      return res.status(409).json({ error: "email_taken", message: "Email already registered" });
    }
    const hash = hashPassword(String(password));
    const rayId = `ray-${randomBytes(8).toString("hex")}`;
    const userId = `u_${randomBytes(8).toString("hex")}`;
    const stmt = db.prepare("INSERT INTO users (id, email, password_hash, status, ray_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(userId, emailLower, hash, "active", rayId, NOW, NOW);
    res.status(201).json({ userId, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const userEmail = String(email ?? "").toLowerCase();
    const userRow = db.prepare("SELECT id, email, status, password_hash, ray_id FROM users WHERE email = ?").get(userEmail);
    if (!userRow) {
      return res.status(401).json({ error: "bad_credentials", message: "Invalid email or password" });
    }
    const user = userRow as any;
    if (!user.password_hash) {
      return res.status(401).json({ error: "bad_credentials", message: "Invalid email or password" });
    }
    if (!verifyPassword(String(password ?? ""), user.password_hash)) {
      return res.status(401).json({ error: "bad_credentials", message: "Invalid email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "pending_verification", message: "Finish phone verification first" });
    }
    const payload = { sub: user.id, ray: user.ray_id, iat: Date.now() };
    const jwt = signJWT(payload, JWT_SECRET);
    res.json({ ok: true, userId: user.id, rayId: user.ray_id, redirect: "/dashboard", simulasi: true, token: jwt });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
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
  if (!userId) return res.status(401).json({ error: "unauthenticated" });
  try {
    const userRow = db.prepare("SELECT id, email, phone, phone_verified, status, ray_id FROM users WHERE id = ?").get(userId);
    if (!userRow) return res.status(401).json({ error: "unauthenticated" });
    const user = userRow as any;
    res.json({ ...user, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// ADMIN ROUTES
app.get("/api/admin/stats", (req, res) => {
  try {
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    res.json({ users: usersCount.count, orders: ordersCount.count, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

app.get("/api/admin/integrity", (req, res) => {
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

// MARKETS
app.get("/api/markets", (_req, res) => {
  try {
    // Load from Indodax catalog if available
    const catalogPath = path.resolve(repoRoot, "docs/research/indodax-pairs.json");
    let markets: any[] = [];

    try {
      const fs = require('fs');
      if (fs.existsSync(catalogPath)) {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        markets = catalog.map((p: any) => ({
          symbol: p.symbol,
          baseAsset: p.base,
          quoteAsset: p.quote,
          status: "trading",
          price: "0.00",
          source: "indodax",
          simulasi: true,
          flags: p.flags || []
        }));
      }
    } catch (e) {
      // Fallback to env var
      const marketsEnv = process.env.MARKETS || "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT";
      markets = marketsEnv.split(",").map((m: string) => ({
        symbol: m.trim(),
        baseAsset: m.trim().replace("USDT", ""),
        quoteAsset: "USDT",
        status: "trading",
        price: "0.00",
        source: "sim",
        simulasi: true
      }));
    }

    res.json({ markets, simulasi: true, total: markets.length });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// T04: Reference price feed routes (mounted before the generic /api/ticker/:pair route)
app.use(createPriceRouter());
app.use("/api/payment", paymentRouter);

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

// TICKER ENDPOINT (Indodax)
app.get("/api/ticker/:pair", async (req, res) => {
  try {
    const pair = String(req.params.pair).toUpperCase();
    const base = process.env.INDODAX_BASE_URL || "https://indodax.com";
    const url = `${base}/api/ticker/${pair.toLowerCase()}`;

    const timeout = setTimeout(() => {
      res.status(408).json({ error: "timeout", pair });
    }, 5000);

    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: any) => {
        clearTimeout(timeout);
        const t = data.ticker || {};
        res.json({
          pair,
          last: parseFloat(t.last || 0),
          high: parseFloat(t.high || 0),
          low: parseFloat(t.low || 0),
          vol: parseFloat(t.vol_idr || t.vol_usdt || 0),
          buy: parseFloat(t.buy || 0),
          sell: parseFloat(t.sell || 0),
        });
      })
      .catch((err) => {
        clearTimeout(timeout);
        res.status(502).json({ error: "ticker_failed", pair, message: err.message });
      });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
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
    const users = db.prepare("SELECT id, email, phone, phone_verified, status, role, ray_id, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 100").all();
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
  res.json({ status: "ok", service: "trading-backend", port: PORT, timestamp: new Date().toISOString() });
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
  } else if (lower.includes("indodax") || lower.includes("pair") || lower.includes("market")) {
    reply = "Indodax menyediakan 477 pair trading — 465 pasangan IDR dan 12 pasangan USDT. Data ticker diambil langsung dari API Indodax dan di-cache di backend selama 60 detik. Halaman market menampilkan semua pair dengan pencarian dan filter.";
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
  // T04: start the reference price feed poller (immediate first poll, then every few seconds)
  priceFeed.start();
  // T07: start the synthetic market-trades tape (appends a tick per symbol every few seconds)
  tapeService.start();
  // Auto-seed dev credentials on startup (idempotent)
  const result = seedDevAccount();
  console.log(`[${result.seeded ? "SEED" : "INFO"}] ${result.message}`);
});
