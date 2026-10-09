#!/usr/bin/env node
/**
 * scripts/verify-auth.mjs — end-to-end check for member auth + the admin console.
 *
 * Covers member register/login, the password-gated admin sign-in, and — most importantly —
 * the AUTHORIZATION BOUNDARIES between the two: a member token must never reach /api/admin/*.
 *
 * Usage: node scripts/verify-auth.mjs [--base http://localhost:11110]
 *        [--admin-password admin1] [--expect-admin-password <pw>]
 * Exit:  0 = all checks passed, 1 = a check failed.
 */

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:11110').replace(/\/+$/, '');
const ADMIN_PW = arg('admin-password', process.env.ADMIN_PASSWORD || 'admin1');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`PASS  ${name}${detail ? `  — ${detail}` : ''}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`); }
};

const req = async (path, { method = 'GET', token, body } = {}) => {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text.slice(0, 160); }
  return { status: r.status, data, headers: r.headers };
};

// ------------------------------------------------------------------ members
const email = `member.${Date.now()}@example.test`;
const strongPw = 'demoPassword123';

const weak = await req('/api/auth/register', { method: 'POST', body: { email: `weak.${Date.now()}@example.test`, password: 'short' } });
check('register rejects a short password', weak.status === 400 && weak.data?.error?.code === 'weak_password', `${weak.status} ${weak.data?.error?.code}`);

const badEmail = await req('/api/auth/register', { method: 'POST', body: { email: 'not-an-email', password: strongPw } });
check('register rejects a malformed email', badEmail.status === 400 && badEmail.data?.error?.code === 'invalid_email', `${badEmail.status} ${badEmail.data?.error?.code}`);

const reg = await req('/api/auth/register', { method: 'POST', body: { email, password: strongPw, name: 'Demo Member' } });
check('member register succeeds', reg.status === 201 && !!reg.data?.token, `${reg.status}`);
check('register returns the ledger account', !!reg.data?.accountId, reg.data?.accountId);
check('register credits simulated starting funds', (reg.data?.wallet?.balance ?? 0) > 0, `${reg.data?.wallet?.balance} USDT`);
check('registered member is role=customer', reg.data?.user?.role === 'customer', reg.data?.user?.role);
const memberToken = reg.data?.token || '';

const dup = await req('/api/auth/register', { method: 'POST', body: { email, password: strongPw } });
check('register rejects a duplicate email', dup.status === 409 && dup.data?.error?.code === 'email_taken', `${dup.status} ${dup.data?.error?.code}`);

const login = await req('/api/auth/login', { method: 'POST', body: { email, password: strongPw } });
check('member login succeeds', login.status === 200 && !!login.data?.token, `${login.status}`);
check('login returns an expiry-bearing session', !!login.data?.token, login.data?.token ? 'token issued' : 'no token');

const badLogin = await req('/api/auth/login', { method: 'POST', body: { email, password: 'wrong-password' } });
check('member login rejects a bad password', badLogin.status === 401, `${badLogin.status}`);

const me = await req('/api/auth/me', { token: memberToken });
check('GET /api/auth/me resolves the member', me.status === 200 && me.data?.email === email, `${me.status} ${me.data?.email}`);
check('/me reports isAdmin=false for a member', me.data?.isAdmin === false, `role=${me.data?.role} isAdmin=${me.data?.isAdmin}`);

const wallet = await req('/api/wallet/balance', { token: memberToken });
check('registered member owns a usable wallet', wallet.status === 200 && (wallet.data?.balances ?? []).length > 0, `${wallet.status}`);

// ------------------------------------------------- authorization boundaries
const memberOnOverview = await req('/api/admin/overview', { token: memberToken });
check('member token is REJECTED from /api/admin/overview', memberOnOverview.status === 403, `${memberOnOverview.status}`);

const memberOnUsers = await req('/api/admin/users', { token: memberToken });
check('member token is REJECTED from /api/admin/users', memberOnUsers.status === 403, `${memberOnUsers.status}`);

const memberOnWhitelabel = await req('/api/admin/whitelabel', { token: memberToken });
check('member token is REJECTED from /api/admin/whitelabel', memberOnWhitelabel.status === 403, `${memberOnWhitelabel.status}`);

const anonStats = await req('/api/admin/stats');
check('anonymous /api/admin/stats is REJECTED (regression: was unauthenticated)', anonStats.status === 401, `${anonStats.status}`);

const anonIntegrity = await req('/api/admin/integrity');
check('anonymous /api/admin/integrity is REJECTED (regression: was unauthenticated)', anonIntegrity.status === 401, `${anonIntegrity.status}`);

// --------------------------------------------------------------- admin console
const badAdmin = await req('/api/admin/login', { method: 'POST', body: { password: 'definitely-not-it' } });
check('admin login rejects a wrong password', badAdmin.status === 401, `${badAdmin.status}`);

const admin = await req('/api/admin/login', { method: 'POST', body: { password: ADMIN_PW } });
check('admin login accepts the configured password', admin.status === 200 && !!admin.data?.token, `${admin.status}`);
check('admin session carries an expiry', typeof admin.data?.expiresAt === 'number', String(admin.data?.expiresAt));
check('admin session reports the system-admin role', admin.data?.admin?.role === 'system-admin', admin.data?.admin?.role);
const adminToken = admin.data?.token || '';

const session = await req('/api/admin/session', { token: adminToken });
check('admin session is valid', session.status === 200 && session.data?.admin?.role === 'system-admin', `${session.status}`);

const overview = await req('/api/admin/overview', { token: adminToken });
check('admin overview returns counts', overview.status === 200 && typeof overview.data?.counts?.users === 'number', `users=${overview.data?.counts?.users}`);
check('admin overview counts the new member', (overview.data?.counts?.members ?? 0) > 0, `members=${overview.data?.counts?.members}`);
check('admin overview includes recent audit events', Array.isArray(overview.data?.recentAudit) && overview.data.recentAudit.length > 0, `${overview.data?.recentAudit?.length} events`);
check('admin overview includes the live brand', !!overview.data?.brand?.name, overview.data?.brand?.name);

const users = await req('/api/admin/users', { token: adminToken });
const memberRow = (users.data?.users ?? []).find((u) => u.email === email);
check('admin can list members and find the new one', users.status === 200 && !!memberRow, `${users.status}`);

// suspend -> verify the constraint fix and the login gate
if (memberRow) {
  const susp = await req(`/api/admin/users/${memberRow.id}/status`, { method: 'PUT', token: adminToken, body: { status: 'suspended' } });
  check('admin can suspend a member (users.status CHECK widened)', susp.status === 200, `${susp.status} ${JSON.stringify(susp.data).slice(0, 90)}`);

  const suspendedLogin = await req('/api/auth/login', { method: 'POST', body: { email, password: strongPw } });
  check('a suspended member cannot sign in', suspendedLogin.status === 403, `${suspendedLogin.status} ${suspendedLogin.data?.error?.code}`);

  const restore = await req(`/api/admin/users/${memberRow.id}/status`, { method: 'PUT', token: adminToken, body: { status: 'active' } });
  check('admin can restore the member to active', restore.status === 200, `${restore.status}`);
}

const logout = await req('/api/admin/logout', { method: 'POST' });
check('admin logout acknowledges', logout.status === 200, `${logout.status}`);

console.log(`\n${pass}/${pass + fail} checks passed  (base=${BASE})`);
process.exit(fail ? 1 : 0);
