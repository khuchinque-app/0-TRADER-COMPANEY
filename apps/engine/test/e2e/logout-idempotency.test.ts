// spec D gap "logout enforces idempotency key": /api/auth/logout and
// /api/auth/logout-all are security POSTs listed in spec D's idempotency set
// but the server ignored the header. Semantics mirror the existing money-route
// cache (orders.ts / wallet.ts / quick.ts):
//   - missing or malformed key -> 400, nothing executed (session stays alive)
//   - first success -> cached, audit row written once
//   - replay of the SAME key -> cached body + Idempotent-Replay: true, NO
//     second audit row and no second revocation pass
// Cache scope is the COOKIE MATERIAL hash, not the verified `sub`: after the
// first logout the session JWT is denylisted (jti revoke), so a `sub`-keyed
// lookup could never hit on replay. Hashing the presented session/refresh
// cookies keeps buckets per-session without trusting unverified claims and
// without parking raw tokens as map keys.
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

async function boot() {
  vi.resetModules();
  const [{ SQLiteLedgerStore }, { AuthService, consoleOtpProvider }, { createAuthRouter, devTurnstile }] =
    await Promise.all([
      import('../../src/ledger/sqlite-store'),
      import('../../src/auth/service'),
      import('../../src/server/auth-routes'),
    ]);
  const store = new SQLiteLedgerStore(':memory:');
  const auth = new AuthService(store.dbHandle, consoleOtpProvider, 'logout-secret');
  const app = express();
  app.use(createAuthRouter(auth, devTurnstile));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, auth };
}

function makeActive(auth: any, store: any, email: string, ray: string): string {
  const user = auth.createUser(email, auth.hashPassword('password123'), ray);
  store.dbHandle.prepare(
    'UPDATE users SET status = ?, phone = ?, phone_verified = 1 WHERE id = ?'
  ).run('active', '+628****0001', user.id);
  return user.id;
}

const cookieFor = (auth: any, uid: string): string => {
  const { jwt, refreshToken } = auth.issueSession(uid);
  return `session=${jwt}; refresh=${refreshToken}`;
};

const logout = (base: string, path: string, cookie: string | null, key?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { ...(cookie ? { cookie } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
  });

const countAudit = (store: any, event: string): number =>
  (store.dbHandle.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE event = ?').get(event) as any).n;

describe('spec D gap — logout enforces Idempotency-Key', () => {
  it('missing key -> 400, nothing revoked, no audit row', async () => {
    const { base, server, store, auth } = await boot();
    try {
      const uid = makeActive(auth, store, 'nokey@example.com', 'ray-nokey');
      const cookie = cookieFor(auth, uid);
      const res = await logout(base, '/api/auth/logout', cookie);
      expect(res.status).toBe(400);
      expect(((await res.json()) as any).error).toContain('Idempotency-Key');
      // session untouched: the security POST never ran
      expect(auth.verifyJwt(cookie.slice(cookie.indexOf('=') + 1, cookie.indexOf(';')))).not.toBeNull();
      expect(countAudit(store, 'logout')).toBe(0);
    } finally { server.close(); store.close(); }
  });

  it('malformed key (| / spaces / >200 chars) -> 400', async () => {
    const { base, server, store, auth } = await boot();
    try {
      const uid = makeActive(auth, store, 'charset@example.com', 'ray-charset');
      const cookie = cookieFor(auth, uid);
      expect((await logout(base, '/api/auth/logout', cookie, 'evil|x')).status).toBe(400);
      expect((await logout(base, '/api/auth/logout', cookie, 'has space')).status).toBe(400);
      expect((await logout(base, '/api/auth/logout', cookie, 'k'.repeat(201))).status).toBe(400);
      expect(auth.verifyJwt(cookie.split(';')[0].slice('session='.length))).not.toBeNull();
      expect(countAudit(store, 'logout')).toBe(0);
    } finally { server.close(); store.close(); }
  });

  it('valid key executes once; replay serves the cached response with Idempotent-Replay', async () => {
    const { base, server, store, auth } = await boot();
    try {
      const uid = makeActive(auth, store, 'replay@example.com', 'ray-replay');
      const cookie = cookieFor(auth, uid);
      const jwt = cookie.split(';')[0].slice('session='.length);

      const first = await logout(base, '/api/auth/logout', cookie, 'logout-key-1');
      expect(first.status).toBe(200);
      const firstBody: any = await first.json();
      expect(firstBody.ok).toBe(true);
      expect(firstBody.simulasi).toBe(true);
      expect(auth.verifyJwt(jwt)).toBeNull(); // session really revoked
      expect(countAudit(store, 'logout')).toBe(1);

      const replay = await logout(base, '/api/auth/logout', cookie, 'logout-key-1');
      expect(replay.status).toBe(200);
      expect(replay.headers.get('idempotent-replay')).toBe('true');
      expect(await replay.json()).toEqual(firstBody);
      // no second revocation side effects and no duplicate audit row
      expect(countAudit(store, 'logout')).toBe(1);
      expect(auth.verifyJwt(jwt)).toBeNull();
    } finally { server.close(); store.close(); }
  });

  it('same key from a DIFFERENT session is its own bucket (executes, no replay header)', async () => {
    const { base, server, store, auth } = await boot();
    try {
      const uidA = makeActive(auth, store, 'sess-a@example.com', 'ray-sess-a');
      const uidB = makeActive(auth, store, 'sess-b@example.com', 'ray-sess-b');
      const cookieA = cookieFor(auth, uidA);
      const cookieB = cookieFor(auth, uidB);

      const a = await logout(base, '/api/auth/logout', cookieA, 'shared-key');
      expect(a.status).toBe(200);
      expect(a.headers.get('idempotent-replay')).toBeNull();

      // B presents the SAME idempotency key: must NOT be served A's cache
      const b = await logout(base, '/api/auth/logout', cookieB, 'shared-key');
      expect(b.status).toBe(200);
      expect(b.headers.get('idempotent-replay')).toBeNull();
      expect(await b.json()).toEqual(await a.json());

      expect((store.dbHandle.prepare(
        "SELECT COUNT(*) AS n FROM audit_log WHERE event = 'logout' AND user_id = ?"
      ).get(uidB) as any).n).toBe(1);

      // and A's own replay still hits A's cache
      const aReplay = await logout(base, '/api/auth/logout', cookieA, 'shared-key');
      expect(aReplay.headers.get('idempotent-replay')).toBe('true');
    } finally { server.close(); store.close(); }
  });

  it('logout-all enforces the key and replays with the same semantics', async () => {
    const { base, server, store, auth } = await boot();
    try {
      const uid = makeActive(auth, store, 'all@example.com', 'ray-all');
      const cookie = cookieFor(auth, uid);
      const jwt = cookie.split(';')[0].slice('session='.length);

      expect((await logout(base, '/api/auth/logout-all', cookie)).status).toBe(400);

      const first = await logout(base, '/api/auth/logout-all', cookie, 'logout-all-1');
      expect(first.status).toBe(200);
      expect(auth.verifyJwt(jwt)).toBeNull(); // epoch stamped
      expect(countAudit(store, 'logout_all')).toBe(1);

      const replay = await logout(base, '/api/auth/logout-all', cookie, 'logout-all-1');
      expect(replay.status).toBe(200);
      expect(replay.headers.get('idempotent-replay')).toBe('true');
      expect(countAudit(store, 'logout_all')).toBe(1);
    } finally { server.close(); store.close(); }
  });

  it('anonymous logout (no cookies) is still key-gated and idempotent', async () => {
    const { base, server, store } = await boot();
    try {
      expect((await logout(base, '/api/auth/logout', null)).status).toBe(400);
      const first = await logout(base, '/api/auth/logout', null, 'anon-logout-1');
      expect(first.status).toBe(200);
      const replay = await logout(base, '/api/auth/logout', null, 'anon-logout-1');
      expect(replay.status).toBe(200);
      expect(replay.headers.get('idempotent-replay')).toBe('true');
      // anonymous logout still writes its audit row (spec D: every auth event)
      expect(countAudit(store, 'logout')).toBe(1);
    } finally { server.close(); store.close(); }
  });
});
