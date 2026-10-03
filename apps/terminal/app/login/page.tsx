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

  return (
    <div className="min-h-screen flex flex-col bg-[#090909] text-[#F4F4F5] font-inter">
      <header className="flex items-center justify-between px-6 h-[56px] border-b border-[rgba(255,255,255,0.05)]">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span className="font-semibold">Simulasi Exchange</span>
        </Link>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.38)] uppercase tracking-wider">SIMULASI</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-xs text-[rgba(255,255,255,0.62)] mb-6">Log in to your paper-trading account.</p>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl bg-[#121316] border border-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm outline-none focus:border-[rgba(255,255,255,0.05)] text-[#F4F4F5]"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            <input
              className="w-full rounded-xl bg-[#121316] border border-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm outline-none focus:border-[rgba(255,255,255,0.05)] text-[#F4F4F5]"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
            />
            <button
              className="w-full rounded-lg bg-[#F59E0B] text-black font-semibold py-2.5 text-sm hover:bg-[#d97706] disabled:opacity-40 transition-colors duration-200"
              onClick={doLogin}
              disabled={busy}
            >
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </div>
          {err && <p className="mt-3 text-[11px] text-[#EF4444]">{err}</p>}
          <p className="mt-6 text-center text-xs text-[rgba(255,255,255,0.38)]">
            New here?{' '}
            <Link className="text-[#F59E0B] hover:underline" href="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
