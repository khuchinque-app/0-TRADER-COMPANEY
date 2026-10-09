// apps/whitelabel-backend/server.mjs — WHITELABEL BACKEND (Control Hub) on :11112
// Built exactly to new-prompt/structure.md:
//   Whitelabel Backend (:11112) ── SUPERADMIN (master control) + ADMIN (tenant control)
//   Frontend Admin Login Portal (:22221) consumes these REST APIs with a Bearer auth token.
//
// Roles:
//   superadmin — manage whitelabels, global config, billing/plans, system settings, all tenants
//   admin      — manage content, manage users, view reports, tenant settings; scoped to own tenant
//
// Storage: SQLite (data/whitelabel.db). Passwords hashed with scrypt (timingSafeEqual).
// Tokens: signed HMAC-SHA256 bearer tokens (stateless, TTL configurable).
// CORS: open for read-only public branding; API writes require the bearer token anyway.

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT_WHITELABEL || '11112');
const TOKEN_TTL_MS = parseInt(process.env.WL_TOKEN_TTL_MS || String(12 * 60 * 60 * 1000)); // 12h
const SECRET = process.env.WL_JWT_SECRET || crypto.randomBytes(32).toString('hex'); // dev: random per boot
const SUPER_EMAIL = process.env.WL_SUPERADMIN_EMAIL || 'superadmin@chinque.local';
const SUPER_PASS = process.env.WL_SUPERADMIN_PASSWORD || 'admin1';

// ── DB ────────────────────────────────────────────────────────────────────────
const dataDir = path.join(HERE, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'whitelabel.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin','admin')),
  tenant_slug TEXT,                -- NULL for superadmin
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tenants (
  slug TEXT PRIMARY KEY,           -- whitelabel identifier (?tenant=slug in the portal)
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#00FF88',
  logo_url TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'announcement',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_users (
  id TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

const now = () => Math.floor(Date.now() / 1000);
const uid = (p) => `${p}_${crypto.randomBytes(8).toString('hex')}`;

// ── passwords & tokens ───────────────────────────────────────────────────────
function hashPass(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pass), salt, 32).toString('hex');
  return `scrypt:${salt}:${h}`;
}
function checkPass(pass, stored) {
  try {
    const [alg, salt, h] = String(stored).split(':');
    if (alg !== 'scrypt') return false;
    const cand = crypto.scryptSync(String(pass), salt, 32);
    return crypto.timingSafeEqual(cand, Buffer.from(h, 'hex'));
  } catch { return false; }
}
function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (Buffer.byteLength(sig) !== Buffer.byteLength(want) ||
        !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

// ── plans (billing) ──────────────────────────────────────────────────────────
const PLANS = {
  free:       { priceUsd: 0,   limits: { users: 100,  contentItems: 20 } },
  pro:        { priceUsd: 49,  limits: { users: 5000, contentItems: 500 } },
  enterprise: { priceUsd: 199, limits: { users: -1,   contentItems: -1 } },
};

function createTenant(fields, admin) {
  const t = {
    slug: String(fields.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, ''),
    name: String(fields.name || 'Untitled'),
    primary_color: /^#[0-9a-fA-F]{6}$/.test(String(fields.primaryColor || '')) ? fields.primaryColor : '#00FF88',
    logo_url: typeof fields.logoUrl === 'string' ? fields.logoUrl.slice(0, 500) : '',
    theme: fields.theme === 'light' ? 'light' : 'dark',
    plan: ['free', 'pro', 'enterprise'].includes(fields.plan) ? fields.plan : 'free',
    active: fields.active === false ? 0 : 1,
    created_at: now(),
  };
  if (!t.slug) throw new Error('invalid slug');
  db.prepare('INSERT INTO tenants (slug,name,primary_color,logo_url,theme,plan,active,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(t.slug, t.name, t.primary_color, t.logo_url, t.theme, t.plan, t.active, t.created_at);
  if (admin?.email && admin?.password) {
    db.prepare('INSERT INTO accounts (id,email,password_hash,role,tenant_slug,created_at) VALUES (?,?,?,?,?,?)')
      .run(uid('acc'), String(admin.email).toLowerCase(), hashPass(admin.password), 'admin', t.slug, now());
  }
  return t;
}
const tenantPublic = (t) => ({
  slug: t.slug, name: t.name, primaryColor: t.primary_color, logoUrl: t.logo_url,
  theme: t.theme, plan: t.plan, active: !!t.active, createdAt: t.created_at,
});

// ── seed: superadmin + default tenant ────────────────────────────────────────
if (!db.prepare("SELECT 1 FROM accounts WHERE role='superadmin' LIMIT 1").get()) {
  db.prepare('INSERT INTO accounts (id,email,password_hash,role,tenant_slug,created_at) VALUES (?,?,?,?,NULL,?)')
    .run(uid('acc'), SUPER_EMAIL, hashPass(SUPER_PASS), 'superadmin', now());
  console.log(`[whitelabel] seeded superadmin ${SUPER_EMAIL}`);
}
if (!db.prepare('SELECT 1 FROM tenants LIMIT 1').get()) {
  createTenant({ slug: 'default', name: 'ChinQue Exchange', plan: 'enterprise' },
               { email: 'admin@default.whitelabel.local', password: 'admin1' });
  console.log('[whitelabel] seeded tenant "default" + tenant admin admin@default.whitelabel.local');
}

// ── app ───────────────────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// brute-force guard (per ip+email sliding window)
const attempts = new Map();
function rateOk(key, max = 10, windowMs = 15 * 60 * 1000) {
  const arr = (attempts.get(key) || []).filter((ts) => Date.now() - ts < windowMs);
  if (arr.length >= max) { attempts.set(key, arr); return false; }
  arr.push(Date.now()); attempts.set(key, arr); return true;
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const p = token && verifyToken(token);
  if (!p) return res.status(401).json({ error: { code: 'unauthenticated', message: 'Sign in first' } });
  const acc = db.prepare('SELECT * FROM accounts WHERE id=?').get(p.sub);
  if (!acc) return res.status(401).json({ error: { code: 'unauthenticated', message: 'Account gone' } });
  req.account = acc;
  next();
}
function superOnly(req, res, next) {
  if (req.account.role !== 'superadmin') {
    return res.status(403).json({ error: { code: 'forbidden', message: 'superadmin required' } });
  }
  next();
}
// tenant scope: admins are locked to their tenant; superadmin may target any via ?tenant= or body
function scope(req, res, next) {
  const wanted = req.query.tenant || req.body?.tenantSlug || req.params.slug || null;
  if (req.account.role === 'admin') {
    if (wanted && wanted !== req.account.tenant_slug) {
      return res.status(403).json({ error: { code: 'forbidden', message: 'scoped to your tenant' } });
    }
    req.tenantSlug = req.account.tenant_slug;
  } else {
    req.tenantSlug = wanted || req.account.tenant_slug || null;
    if (!req.tenantSlug) return res.status(400).json({ error: { code: 'invalid_params', message: '?tenant=slug required for superadmin' } });
  }
  const tenant = db.prepare('SELECT * FROM tenants WHERE slug=?').get(req.tenantSlug);
  if (!tenant) return res.status(404).json({ error: { code: 'not_found', message: 'tenant not found' } });
  req.tenant = tenant;
  next();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!rateOk(`login:${req.ip}:${email}`)) {
    return res.status(429).json({ error: { code: 'too_many_attempts', message: 'Try again later' } });
  }
  const acc = db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
  if (!acc || !checkPass(password, acc.password_hash)) {
    return res.status(401).json({ error: { code: 'invalid_credentials', message: 'Wrong email or password' } });
  }
  const token = signToken({ sub: acc.id, role: acc.role, tenant: acc.tenant_slug });
  res.json({ token, role: acc.role, tenant: acc.tenant_slug, email: acc.email });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ email: req.account.email, role: req.account.role, tenant: req.account.tenant_slug });
});

// ── PUBLIC BRANDING (consumed by the :22221 login portal) ────────────────────
app.get('/api/brand/:slug', (req, res) => {
  const t = db.prepare('SELECT * FROM tenants WHERE slug=? AND active=1').get(req.params.slug);
  if (!t) return res.status(404).json({ error: { code: 'not_found', message: 'unknown whitelabel' } });
  res.json({ name: t.name, primaryColor: t.primary_color, logoUrl: t.logo_url, theme: t.theme });
});

// ── SUPERADMIN: manage whitelabels ───────────────────────────────────────────
app.get('/api/whitelabels', auth, superOnly, (_req, res) => {
  res.json({ whitelabels: db.prepare('SELECT * FROM tenants ORDER BY created_at').all().map(tenantPublic) });
});

app.post('/api/whitelabels', auth, superOnly, (req, res) => {
  try {
    const b = req.body || {};
    const exists = db.prepare('SELECT 1 FROM tenants WHERE slug=?').get(String(b.slug || '').toLowerCase());
    if (exists) return res.status(409).json({ error: { code: 'exists', message: 'slug taken' } });
    const t = createTenant(b, { email: b.adminEmail || b.adminUser, password: b.adminPassword || b.adminPass });
    res.status(201).json({ whitelabel: tenantPublic(t) });
  } catch (e) {
    res.status(400).json({ error: { code: 'invalid_params', message: e.message } });
  }
});

app.get('/api/whitelabels/:slug', auth, superOnly, (req, res) => {
  const t = db.prepare('SELECT * FROM tenants WHERE slug=?').get(req.params.slug);
  if (!t) return res.status(404).json({ error: { code: 'not_found' } });
  res.json({ whitelabel: tenantPublic(t) });
});

app.put('/api/whitelabels/:slug', auth, superOnly, (req, res) => {
  const t = db.prepare('SELECT * FROM tenants WHERE slug=?').get(req.params.slug);
  if (!t) return res.status(404).json({ error: { code: 'not_found' } });
  const b = req.body || {};
  const patch = {
    name: typeof b.name === 'string' && b.name ? b.name : t.name,
    primary_color: /^#[0-9a-fA-F]{6}$/.test(String(b.primaryColor || '')) ? b.primaryColor : t.primary_color,
    logo_url: typeof b.logoUrl === 'string' ? b.logoUrl : t.logo_url,
    theme: b.theme === 'light' ? 'light' : b.theme === 'dark' ? 'dark' : t.theme,
    plan: ['free', 'pro', 'enterprise'].includes(b.plan) ? b.plan : t.plan,
    active: typeof b.active === 'boolean' ? (b.active ? 1 : 0) : t.active,
  };
  db.prepare('UPDATE tenants SET name=?, primary_color=?, logo_url=?, theme=?, plan=?, active=? WHERE slug=?')
    .run(patch.name, patch.primary_color, patch.logo_url, patch.theme, patch.plan, patch.active, t.slug);
  res.json({ whitelabel: tenantPublic(db.prepare('SELECT * FROM tenants WHERE slug=?').get(t.slug)) });
});

app.delete('/api/whitelabels/:slug', auth, superOnly, (req, res) => {
  const r = db.prepare('DELETE FROM tenants WHERE slug=?').run(req.params.slug);
  db.prepare('DELETE FROM accounts WHERE tenant_slug=?').run(req.params.slug);
  if (!r.changes) return res.status(404).json({ error: { code: 'not_found' } });
  res.json({ ok: true });
});

// ── SUPERADMIN: global config / system settings ──────────────────────────────
app.get('/api/config', auth, superOnly, (_req, res) => {
  const rows = db.prepare('SELECT key,value FROM config').all();
  const out = {};
  for (const r of rows) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
  res.json({ config: { platformName: 'Whitelabel Platform', plans: PLANS, ...out } });
});
app.put('/api/config', auth, superOnly, (req, res) => {
  const b = req.body || {};
  const st = now();
  const up = db.prepare('INSERT INTO config (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at');
  db.transaction(() => { for (const [k, v] of Object.entries(b)) up.run(String(k), JSON.stringify(v), st); })();
  res.json({ ok: true });
});

// ── SUPERADMIN: all-tenants access + cross-tenant reports/billing ────────────
app.get('/api/tenants/:slug/users', auth, superOnly, (req, res) => {
  res.json({ users: db.prepare('SELECT * FROM tenant_users WHERE tenant_slug=? ORDER BY created_at DESC').all(req.params.slug) });
});
app.get('/api/reports', auth, superOnly, (_req, res) => {
  const tenants = db.prepare('SELECT * FROM tenants').all();
  res.json({
    reports: tenants.map((t) => ({
      tenant: t.slug, name: t.name, plan: t.plan, active: !!t.active,
      users: db.prepare('SELECT COUNT(*) c FROM tenant_users WHERE tenant_slug=?').get(t.slug).c,
      contentItems: db.prepare('SELECT COUNT(*) c FROM contents WHERE tenant_slug=?').get(t.slug).c,
      monthlyFee: (PLANS[t.plan] || PLANS.free).priceUsd,
    })),
  });
});

// ── TENANT-SCOPED: content / users / reports / settings ──────────────────────
app.get('/api/admin/content', auth, scope, (req, res) => {
  res.json({ content: db.prepare('SELECT * FROM contents WHERE tenant_slug=? ORDER BY updated_at DESC').all(req.tenantSlug) });
});
app.post('/api/admin/content', auth, scope, (req, res) => {
  const b = req.body || {};
  if (typeof b.title !== 'string' || !b.title.trim()) return res.status(400).json({ error: { code: 'invalid_params', message: 'title required' } });
  const row = { id: uid('cnt'), tenant_slug: req.tenantSlug, title: b.title.slice(0, 200), body: String(b.body || '').slice(0, 20000), kind: String(b.kind || 'announcement').slice(0, 40), updated_at: now() };
  db.prepare('INSERT INTO contents (id,tenant_slug,title,body,kind,updated_at) VALUES (@id,@tenant_slug,@title,@body,@kind,@updated_at)').run(row);
  res.status(201).json({ content: row });
});
app.put('/api/admin/content/:id', auth, scope, (req, res) => {
  const cur = db.prepare('SELECT * FROM contents WHERE id=? AND tenant_slug=?').get(req.params.id, req.tenantSlug);
  if (!cur) return res.status(404).json({ error: { code: 'not_found' } });
  const b = req.body || {};
  db.prepare('UPDATE contents SET title=?, body=?, kind=?, updated_at=? WHERE id=?').run(
    typeof b.title === 'string' && b.title ? b.title.slice(0, 200) : cur.title,
    typeof b.body === 'string' ? b.body.slice(0, 20000) : cur.body,
    typeof b.kind === 'string' ? b.kind.slice(0, 40) : cur.kind, now(), cur.id);
  res.json({ content: db.prepare('SELECT * FROM contents WHERE id=?').get(cur.id) });
});
app.delete('/api/admin/content/:id', auth, scope, (req, res) => {
  const r = db.prepare('DELETE FROM contents WHERE id=? AND tenant_slug=?').run(req.params.id, req.tenantSlug);
  if (!r.changes) return res.status(404).json({ error: { code: 'not_found' } });
  res.json({ ok: true });
});

app.get('/api/admin/users', auth, scope, (req, res) => {
  res.json({ users: db.prepare('SELECT * FROM tenant_users WHERE tenant_slug=? ORDER BY created_at DESC').all(req.tenantSlug) });
});
app.post('/api/admin/users', auth, scope, (req, res) => {
  const b = req.body || {};
  if (typeof b.username !== 'string' || !b.username.trim()) return res.status(400).json({ error: { code: 'invalid_params', message: 'username required' } });
  const row = { id: uid('usr'), tenant_slug: req.tenantSlug, username: b.username.slice(0, 60), email: String(b.email || '').slice(0, 120) || null, status: 'active', created_at: now() };
  db.prepare('INSERT INTO tenant_users (id,tenant_slug,username,email,status,created_at) VALUES (@id,@tenant_slug,@username,@email,@status,@created_at)').run(row);
  res.status(201).json({ user: row });
});
app.put('/api/admin/users/:id', auth, scope, (req, res) => {
  const cur = db.prepare('SELECT * FROM tenant_users WHERE id=? AND tenant_slug=?').get(req.params.id, req.tenantSlug);
  if (!cur) return res.status(404).json({ error: { code: 'not_found' } });
  const status = ['active', 'suspended'].includes(req.body?.status) ? req.body.status : cur.status;
  db.prepare('UPDATE tenant_users SET status=? WHERE id=?').run(status, cur.id);
  res.json({ user: db.prepare('SELECT * FROM tenant_users WHERE id=?').get(cur.id) });
});
app.delete('/api/admin/users/:id', auth, scope, (req, res) => {
  const r = db.prepare('DELETE FROM tenant_users WHERE id=? AND tenant_slug=?').run(req.params.id, req.tenantSlug);
  if (!r.changes) return res.status(404).json({ error: { code: 'not_found' } });
  res.json({ ok: true });
});

app.get('/api/admin/reports', auth, scope, (req, res) => {
  const t = req.tenant;
  res.json({
    tenant: t.slug, name: t.name, plan: t.plan,
    users: db.prepare('SELECT COUNT(*) c FROM tenant_users WHERE tenant_slug=?').get(t.slug).c,
    suspendedUsers: db.prepare("SELECT COUNT(*) c FROM tenant_users WHERE tenant_slug=? AND status='suspended'").get(t.slug).c,
    contentItems: db.prepare('SELECT COUNT(*) c FROM contents WHERE tenant_slug=?').get(t.slug).c,
    limits: (PLANS[t.plan] || PLANS.free).limits,
  });
});

app.get('/api/admin/settings', auth, scope, (req, res) => {
  res.json({ settings: tenantPublic(req.tenant), planLimits: (PLANS[req.tenant.plan] || PLANS.free).limits });
});
app.put('/api/admin/settings', auth, scope, (req, res) => {
  const t = req.tenant, b = req.body || {};
  // tenant admins may re-brand but NOT change plan/active (billing is master-control only)
  const patch = {
    name: typeof b.name === 'string' && b.name ? b.name.slice(0, 120) : t.name,
    primary_color: /^#[0-9a-fA-F]{6}$/.test(String(b.primaryColor || '')) ? b.primaryColor : t.primary_color,
    logo_url: typeof b.logoUrl === 'string' ? b.logoUrl.slice(0, 500) : t.logo_url,
    theme: b.theme === 'light' ? 'light' : b.theme === 'dark' ? 'dark' : t.theme,
  };
  db.prepare('UPDATE tenants SET name=?, primary_color=?, logo_url=?, theme=? WHERE slug=?')
    .run(patch.name, patch.primary_color, patch.logo_url, patch.theme, t.slug);
  res.json({ settings: tenantPublic(db.prepare('SELECT * FROM tenants WHERE slug=?').get(t.slug)) });
});

// health
app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'whitelabel-backend', port: PORT }));
app.use((_req, res) => res.status(404).json({ error: { code: 'not_found' } }));

app.listen(PORT, () => console.log(`[whitelabel] Control Hub listening on :${PORT}`));
