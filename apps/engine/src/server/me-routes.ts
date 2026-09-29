// /api/me family (spec C profile popup):
//   GET   /api/me                 → identity + profile + preferences
//   PATCH /api/me                 → display_name / avatar_url
//   GET   /api/me/preferences     → theme, color_convention, display_currency
//   PATCH /api/me/preferences     → dark-mode toggle persists here (spec C)
//   POST  /api/me/avatar          → set avatar_url (alias of PATCH /api/me)
//
// Identity resolution mirrors the rest of the engine:
//   1. session JWT (Authorization: Bearer / session cookie) — verified `sub`
//   2. guest mode (AUTH_ENABLED=0): x-user-id header or ?userId= — the
//      localStorage demo id has no users row, so the service synthesizes a
//      `status: 'guest'` view (DECISIONS-LOG #5 keeps the demo functional)
//   3. AUTH_ENABLED=1 with no valid session → 401 (fail closed)
//
// Every response carries the SIMULASI badge (paper venue, ADR 0002).

import express, { Router, type Request, type Response } from 'express';
import { AuthError, type AuthService } from '../auth/service';
import { AUTH_ENABLED, readSessionCookie } from './auth';

function resolveMeIdentity(auth: AuthService, req: Request): { userId: string; ray: string | null } | null {
  // Same credential precedence as mockAuth: bearer JWT, then session cookie.
  const bearer = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1];
  const fromBearer = bearer && !bearer.startsWith('mock.') ? auth.verifyJwt(bearer) : null;
  const cookie = readSessionCookie(req);
  const claims = fromBearer ?? (cookie ? auth.verifySessionCookie(cookie) : null);
  if (claims) return { userId: claims.sub, ray: claims.ray };
  if (AUTH_ENABLED) return null; // fail closed
  // Guest fallback — demo identity from the browser; never trusted in auth mode.
  const header = req.header('x-user-id');
  const query = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const guestId = header || query;
  if (guestId && /^[\w.-]{1,64}$/.test(guestId)) return { userId: guestId, ray: null };
  return null;
}

export function createMeRouter(auth: AuthService): Router {
  const router = Router();
  router.use(express.json());

  const fail = (res: Response, e: unknown): void => {
    if (e instanceof AuthError) res.status(e.status).json({ error: e.code, message: e.message });
    else {
      console.error('[ME] unexpected:', e);
      res.status(500).json({ error: 'internal', message: 'Internal error' });
    }
  };

  const requireIdentity = (req: Request, res: Response): { userId: string; ray: string | null } | null => {
    const who = resolveMeIdentity(auth, req);
    if (!who) {
      res.status(401).json({ error: 'unauthenticated', message: 'Sign in to view your profile' });
      return null;
    }
    return who;
  };

  router.get('/api/me', (req: Request, res: Response) => {
    try {
      const who = requireIdentity(req, res);
      if (!who) return;
      res.json({ ...auth.getMe(who.userId), simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.patch('/api/me', (req: Request, res: Response) => {
    try {
      const who = requireIdentity(req, res);
      if (!who) return;
      const { display_name, avatar_url } = req.body ?? {};
      const me = auth.updateProfile(who.userId, { display_name, avatar_url }, who.ray);
      res.json({ ...me, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.post('/api/me/avatar', (req: Request, res: Response) => {
    try {
      const who = requireIdentity(req, res);
      if (!who) return;
      const { avatar_url } = req.body ?? {};
      const me = auth.updateProfile(who.userId, { avatar_url }, who.ray);
      res.json({ ...me, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.get('/api/me/preferences', (req: Request, res: Response) => {
    try {
      const who = requireIdentity(req, res);
      if (!who) return;
      res.json({ ...auth.getPreferences(who.userId), simulasi: true });
    } catch (e) { fail(res, e); }
  });

  router.patch('/api/me/preferences', (req: Request, res: Response) => {
    try {
      const who = requireIdentity(req, res);
      if (!who) return;
      const { theme, color_convention, display_currency } = req.body ?? {};
      const prefs = auth.updatePreferences(who.userId, { theme, color_convention, display_currency }, who.ray);
      res.json({ ...prefs, simulasi: true });
    } catch (e) { fail(res, e); }
  });

  return router;
}
