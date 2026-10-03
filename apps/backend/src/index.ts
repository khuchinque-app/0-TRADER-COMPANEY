import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import Database from "better-sqlite3";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

const app = express();
const PORT = process.env.PORT_BACKEND || 11110;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database - absolute path
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

// JWT helpers (simple HS256)
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

// Auth routes
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
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "unauthenticated" });
  }
  const who = verifyJWT(token, JWT_SECRET);
  if (!who) {
    return res.status(401).json({ error: "unauthenticated" });
  }
  const userRow = db.prepare("SELECT id, email, phone, phone_verified, status, ray_id FROM users WHERE id = ?").get(who.sub);
  if (!userRow) {
    return res.status(401).json({ error: "unauthenticated" });
  }
  const user = userRow as any;
  res.json({ ...user, simulasi: true });
});

// Admin routes
app.get("/api/admin/stats", (req, res) => {
  try {
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    res.json({ users: usersCount.count, orders: ordersCount.count, simulasi: true });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// Markets endpoint
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

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "trading-backend", port: PORT, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
