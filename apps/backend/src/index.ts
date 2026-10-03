import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import Database from "better-sqlite3";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../../../../../../.env") });

const app = express();
const PORT = process.env.PORT_BACKEND || 11110;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database
const dbPath = process.env.DB_PATH || "/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db";
const db = new Database(dbPath);
db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");

// Auth helpers
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

// JWT helpers
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

// Helper: get userId from JWT
function getUserId(req: any): string | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const who = verifyJWT(token, JWT_SECRET);
  return who ? who.sub : null;
}

// ========== AUTH ROUTES ==========
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
    const stmt = db.prepare("INSERT INTO users (email, password_hash, status, ray_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    const result = stmt.run(emailLower, hash, "active", rayId, NOW, NOW);
    const userId = String(result.lastInsertRowid);
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

// ========== ADMIN ROUTES ==========
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

// ========== MARKETS ==========
app.get("/api/markets", (_req, res) => {
  try {
    const marketsEnv = process.env.MARKETS || "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT";
    const markets = marketsEnv.split(",").map((m: string) => ({
      symbol: m.trim(),
      baseAsset: m.trim().replace("USDT", ""),
      quoteAsset: "USDT",
      status: "trading",
      price: "0.00",
      source: "sim",
      simulasi: true
    }));
    res.json({ markets, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// ========== WALLET ROUTES (M2) ==========

// GET /api/wallet/balance
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

// POST /api/wallet/deposit
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
        const result = db.prepare("INSERT INTO accounts (user_id, name, created_at) VALUES (?, ?, ?)").run(userId, "User " + userId, now);
        account = { id: String(result.lastInsertRowid) };
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

// GET /api/wallet/history
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

// GET /api/wallet/faucet
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
      WHERE jl.account_id = ? AND j.timestamp > ? AND j.description LIKE "Deposit %"
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

// ========== HEALTH ==========
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "trading-backend", port: PORT, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
