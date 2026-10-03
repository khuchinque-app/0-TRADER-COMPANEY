'use client';

// Security page — spec C: Security → /api/security/*
// Manage password, email, phone, sessions, 2FA, activity log.
// SIMULASI only.

import { useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

export default function SecurityPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sessionIp, setSessionIp] = useState('127.0.0.1');
  const [sessionBrowser, setSessionBrowser] = useState('Chrome');
  const [sessionStarted, setSessionStarted] = useState(new Date().toISOString());

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ kind: 'err', text: 'Password baru tidak cocok' });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ kind: 'err', text: 'Password minimal 8 karakter' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${ENGINE_URL}/api/security/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ kind: 'ok', text: 'Password berhasil diubah' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const revokeAllSessions = async () => {
    if (!confirm('Revoke semua sesi aktif?')) return;
    try {
      await fetch(`${ENGINE_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      setMsg({ kind: 'ok', text: 'Semua sesi telah dicabut' });
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Keamanan</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Kelola password, sesi, dan pengaturan keamanan akunmu.
        </p>

        {/* Change Password */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-4">Ubah Password</div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Password Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2 px-4 hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Memproses...' : 'Ubah Password'}
            </button>
          </form>
          {msg && (
            <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
              {msg.text}
            </p>
          )}
        </div>

        {/* Active Session */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Sesi Aktif</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{sessionBrowser}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{sessionIp}</div>
              </div>
              <div className="text-[10px] text-[var(--pos)]">● Aktif</div>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Dimulai: {new Date(sessionStarted).toLocaleString('id-ID')}
            </div>
          </div>
          <button
            onClick={revokeAllSessions}
            className="mt-3 text-xs text-[var(--neg)] hover:underline"
          >
            Cabut semua sesi
          </button>
        </div>

        {/* 2FA Status */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Authenticator App (2FA)</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">Tambahkan lapisan keamanan tambahan ke akunmu</div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded border border-[var(--neg)] text-[var(--neg)]">Belum Diaktifkan</span>
          </div>
          <button className="mt-3 text-xs border border-[var(--border)] rounded-md px-3 py-1.5 hover:bg-[var(--bg-hover)]">
            Aktifkan 2FA
          </button>
        </div>

        {/* Activity Log */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Log Aktivitas</div>
          <div className="space-y-2 text-xs text-[var(--text-muted)]">
            <div className="flex justify-between">
              <span>Login berhasil</span>
              <span>{new Date().toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Password diubah</span>
              <span>2 jam yang lalu</span>
            </div>
            <div className="flex justify-between">
              <span>Wallet deposit</span>
              <span>1 hari yang lalu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
