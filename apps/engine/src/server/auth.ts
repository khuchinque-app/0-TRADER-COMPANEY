// Auth seam — delegated decision Q2b, upgraded by security-lane F1 fix.
//
// AUTH_ENABLED=0 (default): every request passes — today's guest demo mode
//   is untouched (delegated Q3: guest + auth coexist).
// AUTH_ENABLED=1: identity comes from the REAL auth journey, in priority:
//   1. Authorization: Bearer <session-JWT>   (HS256, verified, not revoked)
//   2. session cookie                         (same JWT, browser session)
//   3. Bearer mock.<userId>  ONLY while AUTH_ALLOW_MOCK=1 (legacy demo
//      tokens — kill-switch so scripted demos keep working if ever needed)
// req.userId is set from the verified `sub` claim ONLY — never from the
// body, so money routes can trust it (orders.ts already cross-checks).
// req.rayId carries that session's ray id (spec D: audit rows keep one ray
// lineage across auth + order events); null when there is no session.
// The AuthService registers itself at bootstrap (index.ts); in AUTH_ENABLED=1
// before registration the middleware fails closed.

import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../auth/service';

export const AUTH_ENABLED = process.env.AUTH_ENABLED === '1';
const AUTH_ALLOW_MOCK = process.env.AUTH_ALLOW_MOCK === '1';

let authService: AuthService | null = null;

export function registerAuthService(svc: AuthService): void {
  authService = svc;
}

/** Extract legacy mock token payload. Undefined for anything invalid. */
export function verifyMockToken(header: string | undefined): string | undefined {
  const m = /^Bearer mock\.(.+)$/.exec(header ?? '');
  return m ? m[1] : undefined;
}

export function readSessionCookie(req: Request): string | undefined {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'session') return part.slice(i + 1).trim();
  }
  return undefined;
}

// WS handshake identity — tickets 02/01 (2026-09-26 security sweep).
// Browsers cannot set headers on WebSocket, so the engine also accepts the
// credential as ?token= (raw JWT, or legacy demo token 'mock.<userId>').
// Returns:
//   undefined — guest mode (AUTH_ENABLED=0): no identity required
//   null      — auth required, credential missing/invalid → reject
//   string    — verified userId (JWT sub or mock identity)
export function authenticateWs(
  headers: Record<string, string | string[] | undefined>,
  queryToken?: string,
): string | null | undefined {
  if (!AUTH_ENABLED) return undefined;
  if (!authService && !AUTH_ALLOW_MOCK) return null; // fail closed (mirrors mockAuth)
  const bearer = /^Bearer (.+)$/.exec(String(headers.authorization ?? ''))?.[1];
  if (authService && bearer && !bearer.startsWith('mock.')) {
    const claims = authService.verifyJwt(bearer);
    if (claims) return claims.sub;
  }
  if (authService && queryToken && !queryToken.startsWith('mock.')) {
    const claims = authService.verifyJwt(queryToken);
    if (claims) return claims.sub;
  }
  if (authService) {
    for (const part of String(headers.cookie ?? '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === 'session') {
        const claims = authService.verifySessionCookie(part.slice(i + 1).trim());
        if (claims) return claims.sub;
      }
    }
  }
  if (AUTH_ALLOW_MOCK) {
    const mock = bearer?.startsWith('mock.') ? bearer.slice(5) : queryToken?.startsWith('mock.') ? queryToken.slice(5) : undefined;
    if (mock) return mock;
  }
  return null;
}

export function mockAuth(req: Request, res: Response, next: NextFunction): void {
  if (!AUTH_ENABLED) {
    next();
    return;
  }
  if (!authService && !AUTH_ALLOW_MOCK) {
    // Misconfiguration guard: auth on but no JWT verifier registered.
    res.status(500).json({ error: 'auth misconfigured (no AuthService registered)' });
    return;
  }
  const bearer = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1];
  if (authService && bearer && !bearer.startsWith('mock.')) {
    const claims = authService.verifyJwt(bearer);
    if (claims) {
      (req as any).userId = claims.sub;
      // spec D: the session's ray rides the request so money/order routes can
      // stamp audit rows with the SAME ray as the auth lineage (me-routes
      // resolves it the same way from the verified claims).
      (req as any).rayId = claims.ray ?? null;
      next();
      return;
    }
  }
  if (authService) {
    const ck = readSessionCookie(req);
    if (ck) {
      const claims = authService.verifySessionCookie(ck);
      if (claims) {
        (req as any).userId = claims.sub;
        (req as any).rayId = claims.ray ?? null;
        next();
        return;
      }
    }
  }
  if (AUTH_ALLOW_MOCK) {
    const legacy = verifyMockToken(req.header('authorization'));
    if (legacy) {
      (req as any).userId = legacy;
      // legacy demo token carries no ray claim — fall back to the user row's
      // ray when that identity exists, else null (guest has no lineage).
      (req as any).rayId = authService?.getUser(legacy)?.ray_id ?? null;
      next();
      return;
    }
  }
  res.status(401).json({
    error: 'auth required (AUTH_ENABLED=1) — use Authorization: Bearer <session JWT> or the session cookie',
  });
}
