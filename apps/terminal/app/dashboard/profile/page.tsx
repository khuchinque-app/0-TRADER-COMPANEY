'use client';

// Profile & Setting (spec C profile popup item 1) — reads/edits /api/me and
// /api/me/preferences. Dark Mode persists here (spec C). Identity is the
// session cookie when signed in, else the guest localStorage id.

import { useCallback, useEffect, useState } from 'react';
import { applyTheme, fetchPreferences, meHeaders, saveTheme, type Preferences, type Theme } from '../../../lib/theme';

interface Me {
  id: string;
  email: string | null;
  phone: string | null;
  phone_verified: number;
  status: 'pending' | 'active' | 'guest';
  ray_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Preferences;
}

const card = 'rounded-md border border-[var(--border)] bg-[var(--bg-panel)]';
const row = 'flex items-center justify-between gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0';

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { headers: meHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const data: Me = await res.json();
      setMe(data);
      setName(data.display_name ?? '');
      if (data.preferences?.theme) applyTheme(data.preferences.theme);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveName = async () => {
    setSaving(true); setNote(null);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: meHeaders(true), credentials: 'include',
        body: JSON.stringify({ display_name: name }),
      });
      const data = await res.json();
      if (!res.ok) { setNote(data.message ?? 'Could not save'); return; }
      setMe(data);
      setNote('Saved');
    } finally { setSaving(false); }
  };

  const setTheme = async (theme: Theme) => {
    applyTheme(theme);
    setMe((m) => (m ? { ...m, preferences: { ...m.preferences, theme } } : m));
    const saved = await saveTheme(theme);
    if (!saved) setNote('Theme not persisted — engine unreachable');
  };

  const setColorConvention = async (color_convention: 'green-up' | 'red-up') => {
    const res = await fetch('/api/me/preferences', {
      method: 'PATCH', headers: meHeaders(true), credentials: 'include',
      body: JSON.stringify({ color_convention }),
    });
    if (res.ok) {
      const p: Preferences = await res.json();
      setMe((m) => (m ? { ...m, preferences: p } : m));
    }
  };

  if (status === 'loading') {
    return <div className="flex-1 grid place-items-center text-xs text-[var(--text-muted)]">Loading profile…</div>;
  }
  if (status === 'error' || !me) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <div className="text-center max-w-sm">
          <h1 className="text-base font-semibold">Profile unavailable</h1>
          <p className="mt-2 text-xs text-[var(--text-muted)]">The engine did not answer /api/me. Check that the engine is running on :3001.</p>
        </div>
      </div>
    );
  }

  const badge = me.status === 'active' ? 'var(--gain)' : me.status === 'guest' ? 'var(--text-muted)' : 'var(--warn)';

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Profile &amp; Setting</h1>
          <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>

        <div className={card}>
          <div className={row}>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[var(--bg-hover)] border border-[var(--border)] grid place-items-center text-lg overflow-hidden">
                {me.avatar_url
                  ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
                  : '👤'}
              </span>
              <div>
                <div className="text-sm font-medium">{me.display_name || me.email || 'Guest'}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">{me.id}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full border uppercase tracking-wider" style={{ color: badge, borderColor: badge }}>
              {me.status}
            </span>
          </div>

          <div className={row}>
            <span className="text-xs text-[var(--text-muted)]">Email</span>
            <span className="text-xs font-mono">{me.email ?? '— not linked (guest) —'}</span>
          </div>
          <div className={row}>
            <span className="text-xs text-[var(--text-muted)]">Phone</span>
            <span className="text-xs font-mono flex items-center gap-2">
              {me.phone ?? '—'}
              {me.phone_verified ? <span className="text-[10px] text-[var(--gain)]">✓ verified</span> : null}
            </span>
          </div>
          <div className={row}>
            <span className="text-xs text-[var(--text-muted)]">Audit ray</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">{me.ray_id ?? '—'}</span>
          </div>
        </div>

        <div className={card}>
          <div className="px-4 py-2.5 border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Display name</div>
          <div className="p-4 flex items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Your display name"
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-[var(--cyan)] text-[var(--accent-ink)] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {note && <span className="text-[11px] text-[var(--text-muted)]">{note}</span>}
          </div>
        </div>

        <div className={card}>
          <div className="px-4 py-2.5 border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Preferences</div>
          <div className={row}>
            <div>
              <div className="text-xs">Theme</div>
              <div className="text-[10px] text-[var(--text-muted)]">Persisted to /api/me/preferences</div>
            </div>
            <div className="flex rounded border border-[var(--border)] overflow-hidden">
              {(['dark', 'light'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1.5 text-xs ${me.preferences.theme === t ? 'bg-[var(--cyan)] text-[var(--accent-ink)]' : 'text-[var(--text-muted)]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className={row}>
            <div>
              <div className="text-xs">Color convention</div>
              <div className="text-[10px] text-[var(--text-muted)]">Green-up (Western) vs red-up</div>
            </div>
            <select
              value={me.preferences.color_convention}
              onChange={(e) => setColorConvention(e.target.value as 'green-up' | 'red-up')}
              className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs"
            >
              <option value="green-up">green-up</option>
              <option value="red-up">red-up</option>
            </select>
          </div>
          <div className={row}>
            <span className="text-xs">Display currency</span>
            <span className="text-xs font-mono">{me.preferences.display_currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
