// Auth REST routes — spec A.2/A.3 + D (public paths: /api/auth/*).
//   POST /api/auth/signup          email+password → pending row → signup_session
//   POST /api/auth/otp/request     signup_session + phone → OTP (E.164)
//   POST /api/auth/otp/verify      code → active + session JWT (httpOnly) + refresh
//   POST /api/auth/login           email+password (active users) → session
//   POST /api/auth/refresh         rotate refresh → new session
//   POST /api/auth/logout          revoke current refresh + clear cookie
//                                  (Idempotency-Key REQUIRED — spec D)
//   POST /api/auth/logout-all      revoke every refresh for user + clear cookie
//                                  (Idempotency-Key REQUIRED — spec D)
//   GET  /api/auth/me              who am I (from session cookie)
// Turnstile verification is INJECTED — real sitekey blocked on credentials;
// dev default accepts anything (logged), spec line 33-34 stays honest.

import express, { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { AuthError, SESSION_TTL_MS, REFRESH_TTL_MS, type AuthService } from '../auth/service';
import { createRateLimiter, ipKey } from './rate-limit';

const SESSION_COOKIE = 'session';
const REFRESH_COOKIE = 'refresh';

export interface TurnstileVerifier {
  verify(token: string | undefined, remoteIp: string): Promise<{ ok: boolean; reason?: string }>;
}

export const devTurnstile: TurnstileVerifier = {
  async verify(token) {
    if (!process.env.TURNSTILE_SECRET) {
      return { ok: true }; // paper/dev mode — no sitekey configured yet
    }
    if (!token) return { ok: false, reason: 'missing token' };
    return { ok: false, reason: 'real verification not wired' };
  },
};

function setCookie(res: Response, name: string, value: string, maxAgeSec: number): void {
  res.append('Set-Cookie', `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`);
}

function clearCookie(res: Response, name: string): void {
  setCookie(res, name, '', 0);
}

/** One place to keep cookie Max-Age in sync with the service-side TTLs. */
function setSessionCookies(res: Response, jwt: string, refreshToken: string): void {
  setCookie(res, SESSION_COOKIE, jwt, Math.floor(SESSION_TTL_MS / 1000));
  setCookie(res, REFRESH_COOKIE, refreshToken, Math.floor(REFRESH_TTL_MS / 1000));
}

function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// F2 + spec D: per-IP token bucket for auth routes. The bucket itself now
// lives in rate-limit.ts (one implementation for auth / order / withdraw);
// behaviour here is unchanged — 20 req burst, +1 per 3s ≈ 20/min sustained,
// same AUTH_RATE_* env knobs, same hourly sweep (now shared).
const rateLimit = createRateLimiter({
  namespace: 'auth',
  refillEnv: 'AUTH_RATE_REFILL_MS',
  defaultRefillMs: 3000,
  dimensions: [
    { name: 'ip', key: ipKey, burstEnv: 'AUTH_RATE_BURST', defaultBurst: 20 },
  ],
});

export function createAuthRouter(auth: AuthService, turnstile: TurnstileVerifier): Router {
  const router = Router();
  // The REST sub-app's express.json() is not shared with the main app —
  // auth routes must parse their own bodies.
  router.use(express.json());
  // F2: rate limit auth routes per IP (spec D: auth routes). Scoped to
  // /api/auth — router-level middleware would otherwise run for EVERY app
  // request (a path-less Router.use fires on all paths before falling
  // through), draining auth buckets with wallet/order traffic.
  router.use('/api/auth', rateLimit);

  const fail = (res: Response, e: unknown): void => {
    if (e instanceof AuthError) {
      res.status(e.status).json({ error: e.code, message: e.message });
    } else {
      console.error('[AUTH] unexpected:', e);
      res.status(500).json({ error: 'internal', message: 'Internal error' });
    }
  };

  router.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, turnstileToken } = req.body ?? {};
      const t = await turnstile.verify(turnstileToken, req.ip ?? '');
      if (!t.ok) throw new AuthError('captcha_failed', `Captcha verification failed: ${t.reason ?? ''}`);
      if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
        throw new AuthError('bad_email', 'Valid email required');
      }
      if (typeof password !== 'string' || password.length < 8) {
        throw new AuthError('weak_password', 'Password must be at least 8 characters');
      }
      // F4: ray id is SERVER-MINTED — a client-chosen ray would let anyone
      // graft fake events onto another user's audit lineage. Body rayId is
      // ignored until the Cloudflare edge supplies a trusted cf-ray header.
      const ray = `ray-${randomBytes(8).toString('hex')}`;
      const user = auth.createUser(email, auth.hashPassword(password), ray);
      const signupSession = auth.issueSignupSession(user.id);
      // SIMULASI badge server-side (spec D) on every money/security response
      res.status(201).json({
        userId: user.id, status: user.status, rayId: ray,
        signup_session: signupSession, next: 'otp', simulasi: true,
      });
    } catch (e) { fail(res, e); }
  });

  router.post('/api/auth/otp/request', async (req: Request, res: Response) => {
    try {
      const { signup_session: ss, phone } = req.body ?? {};
      if (typeof ss !== 'string' || !ss) throw new AuthError('need_signup_session', 'signup_session required', 401);
      const userId = auth.checkSignupSession(ss);
      const r = await auth.requestOtp(userId, String(phone ?? ''));
      res.json({ ok: true, provider: r.provider, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.post('/api/auth/otp/verify', (req: Request, res: Response) => {
    try {
      const { signup_session: ss, code } = req.body ?? {};
      if (typeof ss !== 'string' || !ss) throw new AuthError('need_signup_session', 'signup_session required', 401);
      const userId = auth.checkSignupSession(ss);
      auth.verifyOtp(userId, String(code ?? ''));
      auth.invalidateSignupSession(ss); // journey done — token dies with the session it guarded
      const { jwt, refreshToken, rayId } = auth.issueSession(userId);
      setSessionCookies(res, jwt, refreshToken);
      res.json({ ok: true, userId, rayId, redirect: '/dashboard', simulasi: true });
    } catch (e) { fail(res, e); }
  });

  // F3: fixed dummy scrypt hash so unknown-email logins burn the same CPU as
  // known-email ones — response latency no longer enumerates registered emails.
  const DUMMY_HASH = auth.hashPassword('timing-equalizer-dummy');

  router.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};
      const user = auth.getUserByEmail(String(email ?? ''));
      const ok = auth.verifyPassword(String(password ?? ''), user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) {
        // uniform failure — do not leak which field was wrong
        throw new AuthError('bad_credentials', 'Invalid email or password', 401);
      }
      if (user.status !== 'active') {
        throw new AuthError('pending_verification', 'Finish phone verification first', 403);
      }
      auth.audit(user.ray_id, user.id, 'login');
      const { jwt, refreshToken, rayId } = auth.issueSession(user.id);
      setSessionCookies(res, jwt, refreshToken);
      res.json({ ok: true, userId: user.id, rayId, redirect: '/dashboard', simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.post('/api/auth/refresh', (req: Request, res: Response) => {
    try {
      const token = cookies(req)[REFRESH_COOKIE];
      if (!token) throw new AuthError('no_refresh', 'Missing refresh cookie', 401);
      const { jwt, refreshToken } = auth.rotateRefresh(token);
      setSessionCookies(res, jwt, refreshToken);
      res.json({ ok: true, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  // spec D gap: logout/logout-all are SECURITY posts and must carry an
  // Idempotency-Key — same charset gate and same "cache only successful
  // executions, replay serves the cached body with Idempotent-Replay" rule
  // as /api/orders (orders.ts) and the wallet routes (wallet.ts).
  const logoutIdempotency = new Map<string, { status: number; body: unknown }>();
  const LOGOUT_IDEMPOTENCY_MAX = 5000;

  // Cache scope = the PRESENTED cookie material, hashed — NOT the verified
  // `sub`: the first logout denylists the session JWT (jti revoke), so
  // verifyJwt() returns null on every replay and a sub-keyed cache could
  // never be hit again. Hashing the cookies is stable across replays, trusts
  // no unverified claim, and keeps raw tokens out of the map. No cookies at
  // all -> shared 'anon' bucket (every anonymous logout returns the same
  // { ok, redirect, simulasi } body, so there is nothing to cross-leak).
  const logoutScope = (c: Record<string, string>): string => {
    const session = c[SESSION_COOKIE] ?? '';
    const refresh = c[REFRESH_COOKIE] ?? '';
    if (!session && !refresh) return 'anon';
    return createHash('sha256').update(`${session}\n${refresh}`).digest('hex').slice(0, 32);
  };

  const logoutCore = (req: Request, res: Response, all: boolean): void => {
    const idemKey = req.header('Idempotency-Key');
    if (!idemKey || idemKey.length > 200 || !/^[\w:-]+$/.test(idemKey)) {
      res.status(400).json({
        error: 'Idempotency-Key header is required (<=200 chars, word chars, ":" and "-")',
        simulasi: true,
      });
      return;
    }
    const c = cookies(req);
    // logout vs logout-all are different intents: never share a cache entry.
    const cacheKey = `${all ? 'all' : 'one'}|${logoutScope(c)}|${idemKey}`;
    const cached = logoutIdempotency.get(cacheKey);
    if (cached) {
      res.status(cached.status).set('Idempotent-Replay', 'true').json(cached.body);
      return;
    }
    try {
      const who = auth.verifyJwt(c[SESSION_COOKIE] ?? '');
      if (c[REFRESH_COOKIE]) {
        if (all && who) auth.revokeAllRefresh(who.sub);
        else auth.revokeRefresh(c[REFRESH_COOKIE]);
      }
      if (c[SESSION_COOKIE]) auth.revokeJwt(c[SESSION_COOKIE]);
      // spec D: an audit row for EVERY auth event — even an anonymous logout
      auth.audit(who?.ray ?? null, who?.sub ?? null, all ? 'logout_all' : 'logout');
      clearCookie(res, SESSION_COOKIE);
      clearCookie(res, REFRESH_COOKIE);
      const body = { ok: true, redirect: '/', simulasi: true };
      // Successful executions only (mirror orders.ts) — a failed logout stays
      // retryable with the same key, and a replay never re-audits.
      logoutIdempotency.set(cacheKey, { status: 200, body });
      if (logoutIdempotency.size > LOGOUT_IDEMPOTENCY_MAX) {
        const oldest = logoutIdempotency.keys().next().value;
        if (oldest !== undefined) logoutIdempotency.delete(oldest);
      }
      res.json(body);
    } catch (e) { fail(res, e); }
  };

  router.post('/api/auth/logout', (req, res) => { logoutCore(req, res, false); });
  router.post('/api/auth/logout-all', (req, res) => { logoutCore(req, res, true); });

  router.get('/api/auth/me', (req: Request, res: Response) => {
    try {
      const who = auth.verifyJwt(cookies(req)[SESSION_COOKIE] ?? '');
      if (!who) { res.status(401).json({ error: 'unauthenticated' }); return; }
      const user = auth.getUser(who.sub);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
      res.json({ ...user, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  return router;
}
