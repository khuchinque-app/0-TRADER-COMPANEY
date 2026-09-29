'use client';

// Spec B top bar: brand, SIMULASI badge, the A5 "Invest in AI" vault hook
// (center), [Profil ▾] button opening the 9-entry profile popup.
// Manajemen Alamat is the default focused entry (spec: "selected/default
// focus"). Keluar hits the real /api/auth/logout (spec D edge rule) then
// returns to landing.
//
// A5 localization: copy is Indonesian; branching uses the stable `id`
// keys from lib/nav (labels are localizable, ids are not).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PROFILE_ITEMS } from '../../lib/nav';
import { applyTheme, fetchPreferences, saveTheme, type Theme } from '../../lib/theme';

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Theme is server-persisted (PATCH /api/me/preferences); the DOM follows it.
  useEffect(() => {
    let alive = true;
    fetchPreferences().then((p) => {
      if (alive && p?.theme) { setTheme(p.theme); applyTheme(p.theme); }
    });
    return () => { alive = false; };
  }, []);

  const toggleTheme = async () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next); // optimistic — paint immediately, server confirms
    const saved = await saveTheme(next);
    if (saved?.theme) setTheme(saved.theme);
    setOpen(false);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Idempotency-Key': `logout-${Date.now()}` },
        credentials: 'include',
      });
    } catch { /* clear locally regardless */ }
    router.push('/');
  };

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)]" />
          <span className="font-semibold tracking-tight text-sm">Simulasi Exchange</span>
        </Link>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider ml-1">
          SIMULASI
        </span>
      </div>

      {/* A5 marketing hook — always visible in the dashboard shell */}
      <Link
        href="/dashboard/ai"
        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-hover)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <span className="text-[var(--cyan)]" aria-hidden="true">◆</span>
        <span>Vault Invest in AI</span>
        <span className="text-[var(--border-light)]" aria-hidden="true">·</span>
        <span className="font-semibold text-[var(--cyan)]">Mulai dari Rp10.000</span>
      </Link>

      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu profil"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)] transition-colors"
        >
          <span className="w-5 h-5 rounded-full bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[10px]">👤</span>
          <span className="text-xs text-[var(--text-muted)]">Profil</span>
          <span className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-10 w-56 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] shadow-xl z-50 py-1"
          >
            {PROFILE_ITEMS.map((item) => {
              const focused = item.id === 'addresses'; // spec default focus
              if (item.id === 'logout') {
                return (
                  <button
                    key={item.id}
                    role="menuitem"
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-[var(--bg-hover)] text-[var(--neg)]"
                  >
                    <span className="w-4 text-center opacity-70">{item.icon}</span>
                    {item.label}
                  </button>
                );
              }
              if (item.id === 'dark-mode') {
                return (
                  <button
                    key={item.id}
                    role="menuitem"
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-[var(--bg-hover)]"
                    onClick={toggleTheme}
                  >
                    <span className="w-4 text-center opacity-70">{item.icon}</span>
                    {item.label}
                    <span className="ml-auto text-[10px] text-[var(--text-muted)] uppercase">
                      {theme === 'dark' ? 'aktif' : 'mati'}
                    </span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-[var(--bg-hover)] ${
                    focused ? 'bg-[var(--bg-hover)]' : ''
                  }`}
                >
                  <span className="w-4 text-center opacity-70">{item.icon}</span>
                  {item.label}
                  {focused && <span className="ml-auto text-[9px] text-[var(--cyan)]">•</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
