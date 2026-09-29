// Auth service — spec A.2/A.3 (signup → pending row → WA OTP → active).
// Real Google OAuth / WhatsApp Business / Turnstile are BLOCKED ON USER
// CREDENTIALS (see server/auth.ts note). This module implements everything
// around those seams with injectable providers:
//   - UserRepository: email/phone/password rows, status pending→active
//   - OtpProvider interface: real WhatsApp impl later; in-memory dev stub now
//   - signup_session: short-lived token proving "signup done, phone pending"
//   - session JWT (HS256 via node:crypto, httpOnly cookie set at the route
//     layer) + refresh token rows (hashed at rest)
//   - audit rows carrying ray_id from signup through every auth event
//
// Security posture (paper venue, honest limits documented):
//   - passwords: scrypt (node:crypto), timing-safe compare
//   - OTP: 6 digits, 5-min TTL, 5 attempts max, consumed on success
//   - signup_session/refresh: random 256-bit, stored hashed (sha256)

import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';

// node:sqlite types are absent from @types/node@20 on this workspace — the
// store hands us its DatabaseSync handle as `any` (see sqlite-store dbHandle).

export const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
export const SIGNUP_SESSION_TTL_MS = 15 * 60_000;   // "short-lived" per spec A.2
export const SESSION_TTL_MS = 60 * 60_000;          // 1 h JWT
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000; // 30 d

export interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  phone_verified: number;
  status: 'pending' | 'active';
  ray_id: string | null;
}

export type AuditEvent =
  | 'signup' | 'signup_session_issue' | 'otp_request' | 'otp_verify'
  | 'otp_fail' | 'login' | 'logout' | 'logout_all' | 'refresh' | 'session_issue'
  | 'wallet_deposit' | 'wallet_withdraw'
  // spec D: order events carry an audit row too (orders.ts / quick.ts)
  | 'order_place' | 'quick_execute'
  | 'profile_update' | 'preferences_update'
  | 'staking_subscribe' | 'ai_subscribe';

export interface UserPreferences {
  theme: 'dark' | 'light';
  color_convention: 'green-up' | 'red-up';
  display_currency: string;
}

// Dark is the terminal-native default (market-monitor.css dark tokens).
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark', color_convention: 'green-up', display_currency: 'USDT',
};

/** /api/me view (spec C profile popup). `status: 'guest'` is the synthesized
 *  demo identity — a localStorage id with no users row (DECISIONS-LOG #5). */
export interface MeView {
  id: string;
  email: string | null;
  phone: string | null;
  phone_verified: number;
  status: 'pending' | 'active' | 'guest';
  ray_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  preferences: UserPreferences;
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function newId(): string {
  return randomBytes(8).toString('hex');
}

/** E.164 normalize per spec A.3: accepts +62..., 0080..., 08... (ID local). */
export function normalizePhoneE164(raw: string, defaultCountryCode = '62'): string | null {
  const s = raw.replace(/[\s\-().]/g, '');
  let digits = s;
  if (s.startsWith('+')) digits = s.slice(1);
  else if (s.startsWith('00')) digits = s.slice(2);
  else if (s.startsWith('0')) digits = defaultCountryCode + s.slice(1); // ID local → +62
  if (!/^\d{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export interface OtpProvider {
  /** Deliver a code to an E.164 number. Throws on delivery failure. */
  send(phoneE164: string, code: string): Promise<void>;
  readonly name: string;
}

/** Dev/paper stub: logs to console. Real WhatsApp Business impl swaps here.
 *  Ticket 04 (2026-09-26 review): never print the full number or the live
 *  code — server.log is shipped, tailed, and pasted around. Phone is masked
 *  to +cc first3***last4; the code is only referenced by a fingerprint so a
 *  dev can correlate a request to a delivery without leaking the secret. */
export const consoleOtpProvider: OtpProvider = {
  name: 'console-dev',
  async send(phone, code) {
    const d = /^\+\d{7,15}$/.test(phone) ? phone.slice(1) : '';
    // Keep cc+first-3 (e.g. 62812) and last 4 — enough to correlate, not to identify.
    const masked = d ? `+${d.slice(0, 5)}***${d.slice(-4)}` : '+??';
    const fp = createHash('sha256').update(code).digest('hex').slice(0, 8);
    // Opt-in escape hatch for local demo runs: never set in shared logs.
    const reveal = process.env.OTP_LOG_CODE === '1' ? ` code=${code}` : '';
    console.log(`[OTP:${this.name}] ${masked} -> sent (fp ${fp})${reveal}`);
  },
};

// node:sqlite types are absent from @types/node@20 on this workspace — the
// store hands us its DatabaseSync handle; this minimal shape restores real
// type checking on every query we run.
interface SqliteStmt {
  get(...a: unknown[]): unknown;
  all(...a: unknown[]): unknown[];
  run(...a: unknown[]): unknown;
}
interface SqliteDb {
  prepare(sql: string): SqliteStmt;
}

interface RefreshRow {
  id: string;
  user_id: string;
}

export class AuthService {
  private db: SqliteDb;
  private otp: OtpProvider;
  private sessionSecret: string;

  // pending OTPs in-memory: userId -> {hash, phone, expiresAt, attempts}
  // (paper venue; real deployment moves this to Redis/SQLite alongside rate limits)
  private otps = new Map<string, { hash: string; phone: string; expiresAt: number; attempts: number }>();
  // signup sessions in-memory: tokenHash -> userId (short-lived, single purpose)
  private signupSessions = new Map<string, { userId: string; expiresAt: number }>();
  // F5: revoked session-JWT ids (jti -> expiry ms); swept on use, bounded by TTL
  private revokedJtis = new Map<string, number>();

  constructor(db: SqliteDb | any, otp: OtpProvider, sessionSecret?: string) {
    this.db = db;
    this.otp = otp;
    this.sessionSecret = sessionSecret || randomBytes(32).toString('hex');
  }

  // ---------- users ----------

  createUser(email: string, passwordHash: string | null, rayId: string | null): UserRow {
    const now = Date.now();
    const id = newId();
    try {
      this.db.prepare(
        `INSERT INTO users (id, email, password_hash, status, ray_id, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`
      ).run(id, email.toLowerCase(), passwordHash, rayId, now, now);
    } catch (e) {
      if (String((e as Error).message).includes('UNIQUE')) {
        throw new AuthError('email_taken', 'Email already registered', 409);
      }
      throw e;
    }
    this.audit(rayId, id, 'signup');
    return this.getUser(id)!;
  }

  getUser(id: string): UserRow | undefined {
    return this.db.prepare(
      'SELECT id, email, phone, phone_verified, status, ray_id FROM users WHERE id = ?'
    ).get(id) as UserRow | undefined;
  }

  getUserByEmail(email: string): (UserRow & { password_hash: string | null }) | undefined {
    return this.db.prepare(
      'SELECT id, email, phone, phone_verified, status, ray_id, password_hash FROM users WHERE email = ?'
    ).get(email.toLowerCase()) as (UserRow & { password_hash: string | null }) | undefined;
  }

  // ---------- password hashing ----------

  hashPassword(pw: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(pw, salt, 64);
    return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  verifyPassword(pw: string, stored: string | null): boolean {
    if (!stored || !stored.startsWith('scrypt:')) return false;
    const [, saltHex, hashHex] = stored.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(pw, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  // ---------- signup session (spec A.2: issued after user row saved) ----------

  issueSignupSession(userId: string): string {
    const token = randomBytes(32).toString('hex');
    this.signupSessions.set(sha256(token), { userId, expiresAt: Date.now() + SIGNUP_SESSION_TTL_MS });
    this.audit(this.getUser(userId)?.ray_id ?? null, userId, 'signup_session_issue');
    return token;
  }

  checkSignupSession(token: string): string {
    const rec = this.signupSessions.get(sha256(token));
    if (!rec || rec.expiresAt < Date.now()) {
      this.signupSessions.delete(sha256(token));
      throw new AuthError('signup_session_invalid', 'Signup session missing or expired', 401);
    }
    // Valid until TTL — reused by otp/request and otp/verify, then expires.
    return rec.userId;
  }

  invalidateSignupSession(token: string): void {
    this.signupSessions.delete(sha256(token));
  }

  // ---------- WhatsApp OTP (spec A.3) ----------

  async requestOtp(userId: string, rawPhone: string): Promise<{ ok: true; provider: string }> {
    const user = this.getUser(userId);
    if (!user) throw new AuthError('no_user', 'User not found', 404);
    const phone = normalizePhoneE164(rawPhone);
    if (!phone) throw new AuthError('bad_phone', 'Phone is not a valid number (E.164)');
    const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
    this.otps.set(userId, { hash: sha256(code), phone, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    // NOTE: the claimed phone is held in the pending OTP record only — the
    // user row is NOT touched until verify proves possession (spec A.3 order:
    // "User enters OTP → backend verifies → links phone ↔ email on user row").
    await this.otp.send(phone, code);
    this.audit(user.ray_id, userId, 'otp_request');
    return { ok: true, provider: this.otp.name };
  }

  verifyOtp(userId: string, code: string): { ok: true } {
    const rec = this.otps.get(userId);
    if (!rec) throw new AuthError('no_otp', 'No OTP pending — request one first', 404);
    if (rec.expiresAt < Date.now()) {
      this.otps.delete(userId);
      throw new AuthError('otp_expired', 'OTP expired, request a new one');
    }
    if (++rec.attempts > OTP_MAX_ATTEMPTS) {
      this.otps.delete(userId);
      throw new AuthError('otp_locked', 'Too many attempts, request a new OTP', 429);
    }
    if (rec.hash !== sha256(code)) {
      const u = this.getUser(userId);
      this.audit(u?.ray_id ?? null, userId, 'otp_fail');
      throw new AuthError('otp_bad', 'Wrong code', 401);
    }
    this.otps.delete(userId); // consumed
    const now = Date.now();
    // spec A.3: verify FIRST, then link phone ↔ email on the SAME row
    this.db.prepare(
      'UPDATE users SET phone = ?, phone_verified = 1, status = ?, updated_at = ? WHERE id = ?'
    ).run(rec.phone, 'active', now, userId);
    const u = this.getUser(userId);
    this.audit(u?.ray_id ?? null, userId, 'otp_verify');
    return { ok: true };
  }

  // ---------- session JWT (HS256) + refresh ----------

  issueSession(userId: string): { jwt: string; refreshToken: string; rayId: string | null } {
    const user = this.getUser(userId);
    if (!user) throw new AuthError('no_user', 'User not found', 404);
    if (user.status !== 'active') throw new AuthError('not_active', 'Phone not verified yet', 403);
    const jwt = this.signJwt({
      sub: userId, ray: user.ray_id, jti: newId(),
      // iatMs: our own millisecond claim — second-granularity iat cannot
      // distinguish "issued just before logout-all" from "just after".
      iatMs: Date.now(),
      exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
    });
    const refreshToken = randomBytes(32).toString('hex');
    const now = Date.now();
    this.db.prepare(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(newId(), userId, sha256(refreshToken), now, now + REFRESH_TTL_MS);
    this.audit(user.ray_id, userId, 'session_issue');
    return { jwt, refreshToken, rayId: user.ray_id };
  }

  private b64u(buf: Buffer): string { return buf.toString('base64url'); }

  signJwt(claims: Record<string, unknown>): string {
    const header = this.b64u(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const body = this.b64u(Buffer.from(JSON.stringify({ iss: 'paper-venue', iat: Math.floor(Date.now() / 1000), ...claims })));
    const sig = createHmac('sha256', this.sessionSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  verifyJwt(token: string): { sub: string; ray: string | null } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, b, s] = parts;
    const expect = createHmac('sha256', this.sessionSecret).update(`${h}.${b}`).digest('base64url');
    const eb = Buffer.from(expect); const sb = Buffer.from(s);
    if (eb.length !== sb.length || !timingSafeEqual(eb, sb)) return null;
    try {
      const claims = JSON.parse(Buffer.from(b, 'base64url').toString());
      if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null;
      if (typeof claims.sub !== 'string') return null;
      // F5: post-logout the JWT stays cryptographically valid until exp —
      // consult the jti denylist so logout/logout-all really end sessions.
      if (typeof claims.jti === 'string' && this.revokedJtis.has(claims.jti)) return null;
      // logout-all epoch: JWTs minted before the last global logout are dead.
      const epoch = this.logoutEpoch.get(claims.sub);
      const issuedMs = typeof claims.iatMs === 'number'
        ? claims.iatMs
        : Number(claims.iat) * 1000; // legacy tokens without iatMs
      if (epoch !== undefined && issuedMs < epoch) return null;
      return { sub: claims.sub, ray: claims.ray ?? null };
    } catch { return null; }
  }

  /** Cookie-sourced sessions go through the same verify + jti denylist. */
  verifySessionCookie(token: string): { sub: string; ray: string | null } | null {
    return this.verifyJwt(token);
  }

  /** Denylist a session JWT until its natural expiry (memory-bounded by TTL). */
  revokeJwt(token: string): void {
    const parts = token.split('.');
    if (parts.length !== 3) return;
    try {
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (typeof claims.jti === 'string' && typeof claims.exp === 'number') {
        this.revokedJtis.set(claims.jti, claims.exp * 1000);
        this.sweepRevoked();
      }
    } catch { /* not a JWT we issued */ }
  }

  private sweepRevoked(): void {
    const now = Date.now();
    for (const [jti, expMs] of this.revokedJtis) if (expMs < now) this.revokedJtis.delete(jti);
  }

  rotateRefresh(token: string): { jwt: string; refreshToken: string; rayId: string | null } {
    const row = this.db.prepare(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > ?'
    ).get(sha256(token), Date.now()) as RefreshRow | undefined;
    if (!row) throw new AuthError('refresh_invalid', 'Refresh token invalid or expired', 401);
    this.db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(row.id);
    // keep the ray lineage intact — the spec invariant is "same ray_id on every row"
    this.audit(this.getUser(row.user_id)?.ray_id ?? null, row.user_id, 'refresh');
    return this.issueSession(row.user_id);
  }

  revokeRefresh(token: string): void {
    this.db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(sha256(token));
  }

  revokeAllRefresh(userId: string): void {
    this.db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId);
    // logout-all must end LIVE session JWTs too: stamp an epoch and reject
    // any JWT issued before it (verifyJwt checks iat against this map).
    // +1ms so tokens minted in the same millisecond as the logout die too.
    this.logoutEpoch.set(userId, Date.now() + 1);
  }

  // userId -> ms; session JWTs minted before the epoch are dead (F5)
  private logoutEpoch = new Map<string, number>();

  // ---------- /api/me: profile + preferences (spec C profile popup) ----------

  private ensureProfileRows(userId: string): void {
    const now = Date.now();
    this.db.prepare(
      'INSERT OR IGNORE INTO user_profiles (user_id, display_name, avatar_url, updated_at) VALUES (?, NULL, NULL, ?)'
    ).run(userId, now);
    this.db.prepare(
      'INSERT OR IGNORE INTO user_preferences (user_id, theme, color_convention, display_currency, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, DEFAULT_PREFERENCES.theme, DEFAULT_PREFERENCES.color_convention, DEFAULT_PREFERENCES.display_currency, now);
  }

  getPreferences(userId: string): UserPreferences {
    this.ensureProfileRows(userId);
    return this.db.prepare(
      'SELECT theme, color_convention, display_currency FROM user_preferences WHERE user_id = ?'
    ).get(userId) as UserPreferences;
  }

  getMe(userId: string): MeView {
    this.ensureProfileRows(userId);
    const user = this.getUser(userId);
    const profile = this.db.prepare(
      'SELECT display_name, avatar_url FROM user_profiles WHERE user_id = ?'
    ).get(userId) as { display_name: string | null; avatar_url: string | null } | undefined;
    return {
      id: userId,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      phone_verified: user?.phone_verified ?? 0,
      status: user ? user.status : 'guest',
      ray_id: user?.ray_id ?? null,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      preferences: this.getPreferences(userId),
    };
  }

  updateProfile(
    userId: string,
    patch: { display_name?: string | null; avatar_url?: string | null },
    rayId: string | null,
  ): MeView {
    if (patch.display_name !== undefined && patch.display_name !== null) {
      const name = patch.display_name.trim();
      if (name.length === 0 || name.length > 60) {
        throw new AuthError('bad_display_name', 'Display name must be 1-60 characters');
      }
    }
    if (patch.avatar_url !== undefined && patch.avatar_url !== null) {
      const url = patch.avatar_url.trim();
      if (url && !/^https?:\/\/\S+$/.test(url)) {
        throw new AuthError('bad_avatar_url', 'Avatar must be an http(s) URL');
      }
    }
    this.ensureProfileRows(userId);
    const sets: string[] = [];
    const args: unknown[] = [];
    if (patch.display_name !== undefined) {
      sets.push('display_name = ?');
      args.push(patch.display_name === null ? null : patch.display_name.trim());
    }
    if (patch.avatar_url !== undefined) {
      sets.push('avatar_url = ?');
      args.push(patch.avatar_url === null ? null : patch.avatar_url.trim());
    }
    if (sets.length) {
      sets.push('updated_at = ?');
      args.push(Date.now(), userId);
      this.db.prepare(`UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = ?`).run(...args);
      this.audit(rayId, userId, 'profile_update');
    }
    return this.getMe(userId);
  }

  updatePreferences(
    userId: string,
    patch: { theme?: string; color_convention?: string; display_currency?: string },
    rayId: string | null,
  ): UserPreferences {
    const next = { ...this.getPreferences(userId) };
    if (patch.theme !== undefined) {
      if (patch.theme !== 'dark' && patch.theme !== 'light') {
        throw new AuthError('bad_theme', "theme must be 'dark' or 'light'");
      }
      next.theme = patch.theme;
    }
    if (patch.color_convention !== undefined) {
      if (patch.color_convention !== 'green-up' && patch.color_convention !== 'red-up') {
        throw new AuthError('bad_color_convention', "color_convention must be 'green-up' or 'red-up'");
      }
      next.color_convention = patch.color_convention;
    }
    if (patch.display_currency !== undefined) {
      const cur = String(patch.display_currency).toUpperCase();
      if (!/^[A-Z]{2,6}$/.test(cur)) {
        throw new AuthError('bad_display_currency', 'display_currency must be a 2-6 letter code');
      }
      next.display_currency = cur;
    }
    this.db.prepare(
      'UPDATE user_preferences SET theme = ?, color_convention = ?, display_currency = ?, updated_at = ? WHERE user_id = ?'
    ).run(next.theme, next.color_convention, next.display_currency, Date.now(), userId);
    this.audit(rayId, userId, 'preferences_update');
    return next;
  }

  // ---------- audit (ray_id carried through every event) ----------

  audit(rayId: string | null, userId: string | null, event: AuditEvent, detail?: string): void {
    this.db.prepare(
      'INSERT INTO audit_log (ray_id, user_id, event, detail, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(rayId, userId, event, detail ?? null, Date.now());
  }

  getAuditForRay(rayId: string): Array<{ event: string; user_id: string | null }> {
    return this.db.prepare(
      'SELECT event, user_id FROM audit_log WHERE ray_id = ? ORDER BY id'
    ).all(rayId) as Array<{ event: string; user_id: string | null }>;
  }
}
