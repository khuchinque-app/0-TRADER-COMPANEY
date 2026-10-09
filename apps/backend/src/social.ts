// apps/backend/src/social.ts — OAuth (Google) + Telegram login for the exchange manager login.
// Google Identity (OAuth 2.0) + Telegram (Share/Deep-Message link + simulated login) for real
// manager sign-up. IsAuthenticated routes need admin role (system-admin) or whitelabel editor.
import express, { Request, Response } from "express";
import { randomBytes } from "crypto";

// NOTE: social routes read/write the same ledger via the backend's `const db`.
// The social.ts module gets its own import at runtime once social.ts exports
// a typed handle; for now each social route calls `db` from the imported
// handler module (social.ts.reply_db) — or the backend passes the handle on mount.
export function createSocialRouter() {
  const router = express.Router();

  // ---- Google OAuth 2.0 flow helpers (stub endpoints; replace with real provider once
  // keys are wired: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env) ----
  const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
  const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

  /** Step 1: client sends urn:id="google-auth" -> returns Google consent URL. */
  router.post("/google/auth", (_req: Request, res: Response) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_INTERNAL_URL || "http://localhost:11110"}/api/social/google/callback`;
    const state = randomBytes(16).toString("hex");
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "<REPLACE_WITH_GOOGLE_CLIENT_ID>");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    res.json({
      redirectUrl: url.toString(),
      oauthProvider: "google",
      simulasi: false, // real OAuth flow — no simulation badge
    });
  });

  /** Step 2: Google callback -> exchange code for token, get email. Stub: returns mock until real keys wired.
   *   When provider is wired, implement the real call to GOOGLE_TOKEN_URL / GOOGLE_USERINFO_URL here. */
  router.post("/google/callback", async (req: Request, res: Response) => {
    const { code, state } = req.body ?? {};
    if (!code) return res.status(400).json({ error: "missing_code", simulasi: false });
    // TODO: when GOOGLE_CLIENT_ID is set real, perform htt[... more] — skip for placeholder
    // This stub only mirrors the flow; clients should show "微信登录" like real provider login buttons.
    const mockUser = {
      provider: "google",
      email: `user-${randomBytes(4).toString("hex")}@simulasi-account-id.google-oauth-tbd`,
      name: "User Google",
      simulasi: true,
    };
    res.json({ ok: true, user: mockUser, code: "placeholder-google-oauth", simulasi: true });
  });

  // ---- Telegram login: opens Telegram Web App / deep-link to app; when not installed,
  // show "Telegram 登录" link + QR style. Simulated auth for now (token generated server-side). ----
  router.post("/telegram/login", async (req: Request, res: Response) => {
    const { phone, authCode } = req.body ?? {};
    if (authCode) {
      // TODO: when Telegram WebApp set, validate by calling Telegram endpoints (e.g. /auth)
      return res.json({ ok: false, message: "Telegram Web login not wired yet", simulasi: false });
    }
    // placeholder: simulate a Telegram user
    const tgUser = {
      provider: "telegram",
      phone: phone || null,
      name: "User Telegram",
      simulasi: true,
    };
    res.json({ ok: true, user: tgUser, code: "placeholder-telegram-auth", simulasi: true });
  });

  // ---- manager lookup: index.ts mounts this router and exposes the shared
  // ledger handle on globalThis.__backdb, so manager login can resolve a user
  // row without opening a second better-sqlite3 connection here. ----
  router.post("/manager/lookup", (req: Request, res: Response) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: { code: "invalid_params", message: "email required" }, simulasi: true });
    }
    const handle = (globalThis as any).__backdb;
    if (!handle) {
      return res.status(503).json({ error: { code: "db_unavailable", message: "ledger handle not mounted" }, simulasi: true });
    }
    try {
      const user = handle.prepare("SELECT id, email, role FROM users WHERE email = ?").get(email) as
        | { id: string; email: string; role: string }
        | undefined;
      if (!user) {
        return res.status(404).json({ ok: false, message: "manager email not found (use /akun/masuk manager login)", simulasi: true });
      }
      res.json({ ok: true, userId: user.id, role: user.role, email: user.email, simulasi: true });
    } catch (e: any) {
      res.status(500).json({ error: { code: "internal", message: e.message }, simulasi: true });
    }
  });

  return router;
}
