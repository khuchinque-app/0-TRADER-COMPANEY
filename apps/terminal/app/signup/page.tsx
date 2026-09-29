'use client';

// Sign-Up journey UI — spec A.2 → A.3:
//   step 1: email + password (+ Turnstile slot, + ray id capture)
//   step 2: phone (E.164) → OTP sent via WhatsApp Business (dev: console)
//   step 3: 6-digit code → active → httpOnly session cookies → /dashboard
// Talks to the public edge /api/auth/* (Next rewrites proxy it to :3001).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOrCreateRayId } from '../../lib/ray';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Step = 'signup' | 'phone' | 'otp';

// Cloudflare Turnstile — SITEKEY-GATED (spec A.2 line 33-34).
// NEXT_PUBLIC_TURNSTILE_SITEKEY is empty in the paper venue (see
// next.config.js), so: no script is fetched, no widget is rendered and the
// signup body carries NO turnstileToken key — not even an empty string. The
// engine's dev verifier (auth-routes.ts devTurnstile) accepts exactly that
// path while TURNSTILE_SECRET is unset, so the guest demo stays green.
// With a sitekey configured the widget must solve before we POST; if the
// Cloudflare script itself fails to load we do not lock the form up — the
// server decides (it holds TURNSTILE_SECRET).
const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || '';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, options: Record<string, unknown>): number;
    };
  }
}

// Dev-mode helper: the engine's console OTP provider prints the code to
// server.log; a paper venue needs a visible path for the tester. When the
// backend answers with devCode (see AUTH_DEV_REVEAL), show it — never
// fabricate one client-side.
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const rayRef = useRef('');
  const captchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { rayRef.current = getOrCreateRayId(); }, []);

  // Turnstile widget — loaded ONLY when a sitekey exists. With no sitekey this
  // effect returns on line one: no script request, no DOM widget, no token.
  useEffect(() => {
    if (!TURNSTILE_SITEKEY) return;
    let disposed = false;
    const mountWidget = () => {
      if (disposed || !captchaRef.current || !window.turnstile) return;
      if (captchaRef.current.hasChildNodes()) return; // StrictMode double-run
      window.turnstile.render(captchaRef.current, {
        sitekey: TURNSTILE_SITEKEY,
        theme: 'dark',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => setCaptchaUnavailable(true),
      });
    };
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      if (window.turnstile) mountWidget();
      else existing.addEventListener('load', mountWidget, { once: true });
      return () => { disposed = true; };
    }
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = mountWidget;
    script.onerror = () => { if (!disposed) setCaptchaUnavailable(true); };
    document.head.appendChild(script);
    return () => { disposed = true; };
  }, []);

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  };

  const doSignup = async () => {
    setErr(null);
    if (!EMAIL_RE.test(email)) { setErr('Enter a valid email'); return; }
    if (password.length < 8) { setErr('Password must be at least 8 characters'); return; }
    // Sitekey-gated: only a configured sitekey can hold the form hostage, and
    // even then a failed script load releases it (server verifies instead).
    if (TURNSTILE_SITEKEY && !captchaToken && !captchaUnavailable) {
      setErr('Solve the captcha challenge to continue');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { email, password, rayId: rayRef.current };
      if (TURNSTILE_SITEKEY && captchaToken) body.turnstileToken = captchaToken;
      const d = await post('/api/auth/signup', body);
      setSignupSession(d.signup_session);
      setStep('phone');
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const doOtpRequest = async () => {
    setErr(null); setNote(null);
    if (!signupSession) { setErr('Session expired — start again'); return; }
    setBusy(true);
    try {
      const d = await post('/api/auth/otp/request', { signup_session: signupSession, phone });
      if (d.devCode) setNote(`Dev code: ${d.devCode}`);
      else if (d.provider === 'console-dev') setNote('Demo venue: OTP printed to the engine console/server.log');
      setStep('otp');
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const doVerify = async () => {
    setErr(null);
    if (!/^\d{6}$/.test(code)) { setErr('Enter the 6-digit code'); return; }
    setBusy(true);
    try {
      const d = await post('/api/auth/otp/verify', { signup_session: signupSession, code });
      // session JWT + refresh are httpOnly cookies now; spec step 4:
      router.push(d.redirect || '/dashboard');
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const input = 'w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--cyan)]';
  const btn = 'w-full rounded-md bg-[var(--cyan)] text-black font-semibold py-2.5 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="flex items-center justify-between px-6 h-16 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)]" />
          <span className="font-semibold">Simulasi Exchange</span>
        </Link>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            {(['signup', 'phone', 'otp'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center border ${
                  step === s ? 'border-[var(--cyan)] text-[var(--cyan)]'
                    : (['signup','phone','otp'].indexOf(step) > i) ? 'border-[var(--pos)] text-[var(--pos)]'
                    : 'border-[var(--border)] text-[var(--text-muted)]'
                }`}>{(['signup','phone','otp'].indexOf(step) > i) ? '✓' : i + 1}</span>
                {i < 2 && <span className="w-8 h-px bg-[var(--border)]" />}
              </div>
            ))}
          </div>

          <h1 className="text-xl font-semibold mb-1">
            {step === 'signup' ? 'Create your account' : step === 'phone' ? 'Verify your phone' : 'Enter the code'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            {step === 'signup'
              ? 'Email + password. Cloudflare Turnstile protects the form.'
              : step === 'phone'
                ? 'We send a one-time code via WhatsApp (E.164 format).'
                : 'Check WhatsApp for your 6-digit code.'}
          </p>

          {step === 'signup' && (
            <div className="space-y-3">
              <input className={input} type="email" placeholder="Email (Gmail works best)"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <input className={input} type="password" placeholder="Password (min 8 chars)"
                value={password} onChange={e => setPassword(e.target.value)} />
              {TURNSTILE_SITEKEY && (
                <div ref={captchaRef} className="flex justify-center" />
              )}
              {TURNSTILE_SITEKEY && captchaUnavailable && (
                <p className="text-[10px] text-[var(--text-muted)] text-center">
                  Captcha unavailable — verification falls back to the server.
                </p>
              )}
              <button className={btn} onClick={doSignup} disabled={busy}>
                {busy ? 'Creating account…' : 'Continue → WhatsApp verification'}
              </button>
              <div className="relative py-2 text-center">
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 relative z-10">OR</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />
              </div>
              <button
                className="w-full rounded-md border border-[var(--border)] py-2.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-40 flex items-center justify-center gap-2"
                disabled
                title="Google OAuth — waiting on client credentials"
              >
                <span className="font-semibold">G</span> Continue with Google (coming soon)
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-3">
              <input className={input} type="tel" placeholder="Phone, e.g. 0812-3456-7890"
                value={phone} onChange={e => setPhone(e.target.value)} autoFocus />
              <button className={btn} onClick={doOtpRequest} disabled={busy}>
                {busy ? 'Sending code…' : 'Send OTP via WhatsApp'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-3">
              <input className={`${input} font-mono tracking-[0.5em] text-center`} inputMode="numeric"
                maxLength={6} placeholder="••••••" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
              <button className={btn} onClick={doVerify} disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & enter the venue'}
              </button>
              <button className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1"
                onClick={() => { setStep('phone'); setCode(''); setErr(null); }}>
                Resend code / change number
              </button>
            </div>
          )}

          {note && <p className="mt-3 text-[11px] text-[var(--cyan)]">{note}</p>}
          {err && <p className="mt-3 text-[11px] text-[var(--neg)]">{err}</p>}

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link className="text-[var(--cyan)] hover:underline" href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
