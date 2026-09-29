'use client';

// Log In — active users only (spec: pending users resume phone verification).
// Session JWT + refresh arrive as httpOnly cookies from /api/auth/login;
// the page just redirects to the dashboard on success.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doLogin = async () => {
    setErr(null);
    if (!email || !password) { setErr('Email and password required'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'pending_verification') {
          router.push('/signup'); // resume the OTP step for this account
          return;
        }
        throw new Error(data.message || 'Login failed');
      }
      router.push(data.redirect || '/dashboard');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const input = 'w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--cyan)]';

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
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-xs text-[var(--text-muted)] mb-6">Log in to your paper-trading account.</p>
          <div className="space-y-3">
            <input className={input} type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            <input className={input} type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
            <button
              className="w-full rounded-md bg-[var(--cyan)] text-black font-semibold py-2.5 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              onClick={doLogin} disabled={busy}>
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </div>
          {err && <p className="mt-3 text-[11px] text-[var(--neg)]">{err}</p>}
          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            New here?{' '}
            <Link className="text-[var(--cyan)] hover:underline" href="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
