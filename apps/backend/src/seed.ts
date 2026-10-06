/**
 * Standalone seed script — runs `npm run seed` to initialize dev credentials.
 * This module is executed directly (node dist/seed.js), NOT imported by index.ts.
 * It reuses the same DB and seeding logic.
 */
import path from "path";
import Database from "better-sqlite3";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const repoRoot = path.resolve(__dirname, "../../");
const dbPath = process.env.DB_PATH || "/home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db";
const db = new Database(dbPath);

const DEV_EMAIL = process.env.DEV_EMAIL || "dev@example.com";
const DEV_PASS = process.env.DEV_PASS || "devpass123";
const NOW = Math.floor(Date.now() / 1000);

function initDb() {
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

  // Add role column if missing
  const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
  }

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

function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function seedDevAccount() {
  initDb();
  const hash = hashPassword(DEV_PASS);
  const rayId = `ray-${randomBytes(8).toString("hex")}`;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(DEV_EMAIL) as { id: string | null } | undefined;
  if (!existing) {
    const devId = `dev_${randomBytes(8).toString("hex")}`;
    db.prepare(
      "INSERT INTO users (id, email, password_hash, status, role, ray_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(devId, DEV_EMAIL, hash, "active", "system-admin", rayId, NOW, NOW);
    console.log(`Seeded dev account: ${DEV_EMAIL}`);
  } else if (!existing.id) {
    // Heal a NULL id left by earlier seed versions (SQLite allows NULL in a TEXT PK)
    const devId = `dev_${randomBytes(8).toString("hex")}`;
    db.prepare(
      "UPDATE users SET id = ?, password_hash = ?, status = 'active', role = 'system-admin', ray_id = ?, updated_at = ? WHERE email = ?"
    ).run(devId, hash, rayId, NOW, DEV_EMAIL);
    console.log(`Healed dev account id: ${DEV_EMAIL}`);
  } else {
    db.prepare(
      "UPDATE users SET password_hash = ?, status = 'active', role = 'system-admin', ray_id = ?, updated_at = ? WHERE email = ?"
    ).run(hash, rayId, NOW, DEV_EMAIL);
    console.log(`Dev account already exists: ${DEV_EMAIL} (password refreshed)`);
  }
}

seedDevAccount();
db.close();
console.log("Seeding complete.");
