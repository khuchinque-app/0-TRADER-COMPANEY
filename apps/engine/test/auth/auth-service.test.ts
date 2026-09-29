// Auth journey tests — spec A.2/A.3 end-to-end at the service + route level.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';

// vite's builtin list predates node:sqlite — same require() workaround the
// store uses (see src/ledger/sqlite-store.ts).
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: new (p: string) => any };
import {
  AuthService, consoleOtpProvider, normalizePhoneE164, AuthError, type OtpProvider,
} from '../../src/auth/service';

const SCHEMA = fs.readFileSync(path.join(__dirname, '../../src/ledger/schema.sql'), 'utf-8');

function freshDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(SCHEMA);
  return db;
}

class CapturingOtp implements OtpProvider {
  name = 'capture-test';
  sent: Array<{ phone: string; code: string }> = [];
  async send(phone: string, code: string) { this.sent.push({ phone, code }); }
}

describe('normalizePhoneE164', () => {
  it('accepts +62 international form', () => {
    expect(normalizePhoneE164('+62 812-3456-7890')).toBe('+6281234567890');
  });
  it('converts 00 prefix', () => {
    expect(normalizePhoneE164('008012345678')).toBe('+8012345678');
  });
  it('converts ID local 08xx to +62', () => {
    expect(normalizePhoneE164('081234567890')).toBe('+6281234567890');
  });
  it('rejects junk', () => {
    expect(normalizePhoneE164('not-a-phone')).toBeNull();
    expect(normalizePhoneE164('12345')).toBeNull();
  });
});

describe('AuthService journey', () => {
  let db: any;
  let auth: AuthService;
  let otp: CapturingOtp;

  beforeEach(() => {
    db = freshDb();
    otp = new CapturingOtp();
    auth = new AuthService(db, otp, 'test-secret');
  });

  afterEach(() => db.close());

  it('signup creates pending row + signup_session, audit carries ray_id', () => {
    const user = auth.createUser('Ali@Example.com', auth.hashPassword('hunter2!!x'), 'ray-abc');
    expect(user.status).toBe('pending');
    expect(user.email).toBe('ali@example.com');
    const ss = auth.issueSignupSession(user.id);
    expect(ss).toHaveLength(64);
    const rows = auth.getAuditForRay('ray-abc');
    expect(rows.map(r => r.event)).toEqual(['signup', 'signup_session_issue']);
  });

  it('duplicate email rejected with email_taken', () => {
    auth.createUser('a@b.co', null, null);
    try {
      auth.createUser('A@B.co', null, null);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).code).toBe('email_taken');
    }
  });

  it('otp request normalizes phone + sends via provider; row untouched until verify (spec A.3 order)', async () => {
    const u = auth.createUser('c@d.co', null, 'ray-1');
    const r = await auth.requestOtp(u.id, '081234567890');
    expect(r.ok).toBe(true);
    expect(otp.sent).toHaveLength(1);
    expect(otp.sent[0].phone).toBe('+6281234567890');
    expect(/^\d{6}$/.test(otp.sent[0].code)).toBe(true);
    // unverified claim must NOT sit on the user row
    const row = db.prepare('SELECT phone, status FROM users WHERE id = ?').get(u.id) as any;
    expect(row.phone).toBeNull();
    expect(row.status).toBe('pending');
    // ...and it lands there exactly when the code is proven
    auth.verifyOtp(u.id, otp.sent[0].code);
    const after = db.prepare('SELECT phone, status FROM users WHERE id = ?').get(u.id) as any;
    expect(after.phone).toBe('+6281234567890');
    expect(after.status).toBe('active');
  });

  it('bad phone rejected at otp request', async () => {
    const u = auth.createUser('e@f.co', null, null);
    await expect(auth.requestOtp(u.id, 'abc')).rejects.toMatchObject({ code: 'bad_phone' });
  });

  it('full journey: pending → wrong code fails → right code activates + session', async () => {
    const u = auth.createUser('g@h.co', null, 'ray-j');
    const ss = auth.issueSignupSession(u.id);
    expect(auth.checkSignupSession(ss)).toBe(u.id);

    await auth.requestOtp(u.id, '+6281111222333');
    const code = otp.sent[0].code;

    expect(() => auth.verifyOtp(u.id, '000000')).toThrow(/Wrong code/);
    auth.verifyOtp(u.id, code);

    const after = auth.getUser(u.id)!;
    expect(after.status).toBe('active');
    expect(after.phone_verified).toBe(1);

    const { jwt, refreshToken, rayId } = auth.issueSession(u.id);
    expect(rayId).toBe('ray-j');
    const claims = auth.verifyJwt(jwt);
    expect(claims?.sub).toBe(u.id);
    expect(claims?.ray).toBe('ray-j');

    // refresh rotates: old dies, new works
    const rotated = auth.rotateRefresh(refreshToken);
    expect(auth.verifyJwt(rotated.jwt)?.sub).toBe(u.id);
    expect(() => auth.rotateRefresh(refreshToken)).toThrow(/invalid or expired/);
  });

  it('OTP lockout after 5 wrong attempts', async () => {
    const u = auth.createUser('i@j.co', null, null);
    await auth.requestOtp(u.id, '+628123456789');
    for (let i = 0; i < 5; i++) {
      try { auth.verifyOtp(u.id, '111111'); } catch { /* expected */ }
    }
    expect(() => auth.verifyOtp(u.id, otp.sent[0].code)).toThrow(/No OTP pending|Too many/);
  });

  it('session refused for pending users', () => {
    const u = auth.createUser('k@l.co', null, null);
    try {
      auth.issueSession(u.id);
      expect.unreachable();
    } catch (e) {
      expect((e as AuthError).code).toBe('not_active');
    }
  });

  it('jwt tamper and expiry rejected', () => {
    const u = auth.createUser('m@n.co', null, null);
    db.prepare("UPDATE users SET status='active', phone_verified=1 WHERE id=?").run(u.id);
    const { jwt } = auth.issueSession(u.id);
    expect(auth.verifyJwt(jwt.slice(0, -2) + 'xx')).toBeNull();
    const expired = auth.signJwt({ sub: u.id, exp: Math.floor(Date.now() / 1000) - 10 });
    expect(auth.verifyJwt(expired)).toBeNull();
  });

  it('password hash verifies and rejects', () => {
    const h = auth.hashPassword('correct horse');
    expect(auth.verifyPassword('correct horse', h)).toBe(true);
    expect(auth.verifyPassword('wrong', h)).toBe(false);
    expect(auth.verifyPassword('x', null)).toBe(false);
  });

  it('logout-all revokes every refresh', () => {
    const u = auth.createUser('o@p.co', null, null);
    db.prepare("UPDATE users SET status='active' WHERE id=?").run(u.id);
    const a = auth.issueSession(u.id);
    const b = auth.issueSession(u.id);
    auth.revokeAllRefresh(u.id);
    expect(() => auth.rotateRefresh(a.refreshToken)).toThrow();
    expect(() => auth.rotateRefresh(b.refreshToken)).toThrow();
  });

  it('F5: revokeJwt kills a single session JWT; older-than-epoch dies on logout-all', async () => {
    const u = auth.createUser('f5@p.co', null, null);
    db.prepare("UPDATE users SET status='active' WHERE id=?").run(u.id);
    const { jwt } = auth.issueSession(u.id);
    expect(auth.verifyJwt(jwt)?.sub).toBe(u.id);
    auth.revokeJwt(jwt);
    expect(auth.verifyJwt(jwt)).toBeNull(); // denylisted until expiry

    const live = auth.issueSession(u.id).jwt;
    auth.revokeAllRefresh(u.id);           // sets the logout-all epoch
    expect(auth.verifyJwt(live)).toBeNull(); // live cookie JWT from before epoch dies
    // ...and a session issued after the epoch settles works again
    await new Promise(r => setTimeout(r, 5));
    const fresh = auth.issueSession(u.id).jwt;
    expect(auth.verifyJwt(fresh)?.sub).toBe(u.id);
  });

  it('consoleOtpProvider is safe to call (dev stub)', async () => {
    await expect(consoleOtpProvider.send('+628123', '123456')).resolves.toBeUndefined();
  });

  it('garbage signup_session rejected with signup_session_invalid', () => {
    try {
      auth.checkSignupSession('deadbeef'.repeat(8));
      expect.unreachable();
    } catch (e) {
      expect((e as AuthError).code).toBe('signup_session_invalid');
    }
  });

  it('verifyOtp with no pending request → no_otp', () => {
    const u = auth.createUser('q@r.co', null, null);
    try {
      auth.verifyOtp(u.id, '123456');
      expect.unreachable();
    } catch (e) {
      expect((e as AuthError).code).toBe('no_otp');
    }
  });

  it('jwt signed by a different secret instance is rejected', () => {
    const u = auth.createUser('s@t.co', null, null);
    db.prepare("UPDATE users SET status='active' WHERE id=?").run(u.id);
    const { jwt } = auth.issueSession(u.id);
    const other = new AuthService(db, otp, 'a-completely-different-secret');
    expect(other.verifyJwt(jwt)).toBeNull();
  });
});
