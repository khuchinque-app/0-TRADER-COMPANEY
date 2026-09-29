// /api/me family (spec C profile popup) — profile + preferences + dark-mode
// persistence. AUTH_ENABLED is read at import time, so each mode gets a fresh
// module graph via vi.resetModules (same convention as rest-reads-auth).
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

async function boot() {
  vi.resetModules();
  const [{ SQLiteLedgerStore }, { AuthService, consoleOtpProvider }, { createMeRouter }] = await Promise.all([
    import('../../src/ledger/sqlite-store'),
    import('../../src/auth/service'),
    import('../../src/server/me-routes'),
  ]);
  const store = new SQLiteLedgerStore(':memory:');
  const auth = new AuthService(store.dbHandle, consoleOtpProvider, 'test-secret');
  const app = express();
  app.use(createMeRouter(auth));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, server, store, auth };
}

function makeActive(auth: any, store: any, email = 'me@example.com'): string {
  const user = auth.createUser(email, auth.hashPassword('password123'), 'ray-me-1');
  store.dbHandle.prepare('UPDATE users SET status = ?, phone = ?, phone_verified = 1 WHERE id = ?')
    .run('active', '+6281234567890', user.id);
  return user.id;
}

describe('guest mode (AUTH_ENABLED=0): demo identity still gets a real profile', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; });

  it('GET /api/me synthesizes a guest view with dark default', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/me`, { headers: { 'x-user-id': 'guest_demo_1' } });
      expect(res.status).toBe(200);
      const me: any = await res.json();
      expect(me.id).toBe('guest_demo_1');
      expect(me.status).toBe('guest');
      expect(me.preferences.theme).toBe('dark');
      expect(me.simulasi).toBe(true);
    } finally { server.close(); store.close(); }
  });

  it('no identity at all -> 401', async () => {
    const { base, server, store } = await boot();
    try {
      expect((await fetch(`${base}/api/me`)).status).toBe(401);
    } finally { server.close(); store.close(); }
  });

  it('PATCH preferences persists across reads (dark -> light -> dark)', async () => {
    const { base, server, store } = await boot();
    const opts = (body: unknown) => ({
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-user-id': 'guest_demo_2' },
      body: JSON.stringify(body),
    });
    try {
      const light: any = await (await fetch(`${base}/api/me/preferences`, opts({ theme: 'light' }))).json();
      expect(light.theme).toBe('light');
      const read: any = await (await fetch(`${base}/api/me`, { headers: { 'x-user-id': 'guest_demo_2' } })).json();
      expect(read.preferences.theme).toBe('light');
      const back: any = await (await fetch(`${base}/api/me/preferences`, opts({ theme: 'dark' }))).json();
      expect(back.theme).toBe('dark');
      // audit row on the security-adjacent mutation
      const rows = store.dbHandle.prepare(
        "SELECT event FROM audit_log WHERE user_id = ? AND event = 'preferences_update'"
      ).all('guest_demo_2');
      expect(rows.length).toBe(2);
    } finally { server.close(); store.close(); }
  });

  it('rejects an unknown theme with 400 (no silent coercion)', async () => {
    const { base, server, store } = await boot();
    try {
      const res = await fetch(`${base}/api/me/preferences`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-user-id': 'g3' },
        body: JSON.stringify({ theme: 'neon' }),
      });
      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error).toBe('bad_theme');
    } finally { server.close(); store.close(); }
  });
});

describe('session mode: real user profile', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; });

  it('GET /api/me and PATCH display_name via session JWT', async () => {
    const { base, server, store, auth } = await boot();
    const uid = makeActive(auth, store);
    const { jwt } = auth.issueSession(uid);
    const hdr = { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' };
    try {
      const me: any = await (await fetch(`${base}/api/me`, { headers: hdr })).json();
      expect(me.id).toBe(uid);
      expect(me.status).toBe('active');
      expect(me.email).toBe('me@example.com');
      expect(me.display_name).toBeNull();

      const patched: any = await (await fetch(`${base}/api/me`, {
        method: 'PATCH', headers: hdr, body: JSON.stringify({ display_name: '  Satoshi  ' }),
      })).json();
      expect(patched.display_name).toBe('Satoshi'); // trimmed

      const reread: any = await (await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${jwt}` } })).json();
      expect(reread.display_name).toBe('Satoshi');
    } finally { server.close(); store.close(); }
  });

  it('rejects a bad avatar URL; accepts a good one via /api/me/avatar', async () => {
    const { base, server, store, auth } = await boot();
    const uid = makeActive(auth, store, 'avatar@example.com');
    const { jwt } = auth.issueSession(uid);
    const hdr = { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' };
    try {
      const bad = await fetch(`${base}/api/me/avatar`, {
        method: 'POST', headers: hdr, body: JSON.stringify({ avatar_url: 'javascript:alert(1)' }),
      });
      expect(bad.status).toBe(400);
      const ok: any = await (await fetch(`${base}/api/me/avatar`, {
        method: 'POST', headers: hdr, body: JSON.stringify({ avatar_url: 'https://cdn.example.com/a.png' }),
      })).json();
      expect(ok.avatar_url).toBe('https://cdn.example.com/a.png');
    } finally { server.close(); store.close(); }
  });
});

describe('auth mode (AUTH_ENABLED=1): fail closed', () => {
  afterEach(() => { delete process.env.AUTH_ENABLED; });

  it('no session -> 401 even with a guest header', async () => {
    process.env.AUTH_ENABLED = '1';
    const { base, server, store } = await boot();
    try {
      expect((await fetch(`${base}/api/me`, { headers: { 'x-user-id': 'guest_x' } })).status).toBe(401);
      expect((await fetch(`${base}/api/me/preferences`)).status).toBe(401);
    } finally { server.close(); store.close(); }
  });
});
