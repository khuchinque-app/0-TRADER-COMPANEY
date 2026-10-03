'use client';

// Trade API page — spec C: Trade API → /api/api-keys/*
// Create and revoke API keys for programmatic trading.

import { useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface ApiKey {
  id: string;
  label: string;
  key: string;
  secret: string;
  permissions: string[];
  createdAt: number;
  lastUsed?: number;
}

export default function TradeApiPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const uidRef = useRef('');

  const load = async () => {
    if (!uidRef.current) return;
    try {
      const res = await fetch(`${ENGINE_URL}/api/api-keys/${uidRef.current}`);
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    load();
  }, []);

  const togglePermission = (perm: string) => {
    setPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const createKey = async () => {
    if (!label.trim()) return;
    setBusy(true);
    setNewKey(null);
    try {
      const res = await fetch(`${ENGINE_URL}/api/api-keys/${uidRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ label, permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setNewKey(data.key);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };

  const revokeKey = async (keyId: string) => {
    try {
      await fetch(`${ENGINE_URL}/api/api-keys/${uidRef.current}/${keyId}`, {
        method: 'DELETE',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      await load();
    } catch { /* ignore */ }
  };

  const COPY_TEXT = 'PENTING: Salin API Secret sekarang! Tidak akan ditampilkan lagi.';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">API Trading</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Kelola API key untuk trading programmatik. Gunakan dengan hati-hati.
        </p>

        {/* Create new key form */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Buat API Key Baru</div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Label</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Contoh: Trading Bot, Script, dll"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {['read', 'trade', 'deposit', 'withdraw'].map(perm => (
                  <button
                    key={perm}
                    onClick={() => togglePermission(perm)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      permissions.includes(perm)
                        ? 'bg-[var(--cyan)] text-black'
                        : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {perm.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={createKey}
              disabled={busy || !label.trim()}
              className="rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2 px-4 hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Membuat...' : 'Buat API Key'}
            </button>
          </div>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="mt-4 rounded-md border border-[var(--pos)] bg-[var(--pos-dim)] p-4">
            <div className="text-xs font-semibold text-[var(--pos)] mb-2">✅ API Key Berhasil Dibuat</div>
            <p className="text-[10px] text-[var(--neg)] mb-3">{COPY_TEXT}</p>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">API Key</div>
                <div className="font-mono text-sm bg-[var(--bg-primary)] p-2 rounded border border-[var(--border)] break-all">{newKey.key}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">API Secret</div>
                <div className="font-mono text-sm bg-[var(--bg-primary)] p-2 rounded border border-[var(--border)] break-all">{newKey.secret}</div>
              </div>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Existing keys */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">API Keys Tersimpan</div>
          {keys.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-6">
              Belum ada API key. Buat yang pertama di atas.
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                  <div>
                    <div className="text-sm font-medium">{k.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{k.key.slice(0, 12)}...</div>
                    <div className="flex gap-1 mt-1">
                      {k.permissions.map(p => (
                        <span key={p} className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                          {p.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="text-xs text-[var(--neg)] hover:underline px-2 py-1 border border-[var(--neg)] rounded"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-2">Panduan Penggunaan</div>
          <ul className="text-[11px] text-[var(--text-muted)] space-y-1 list-disc list-inside">
            <li>Gunakan API Key dan Secret untuk autentikasi ke endpoint /api/*</li>
            <li>Setiap request memerlukan header: <code className="bg-[var(--bg-primary)] px-1 rounded">X-API-Key: {newKey?.key || 'YOUR_KEY'}</code></li>
            <li>Signature diperlukan untuk request yang mengubah data (POST/PATCH/DELETE)</li>
            <li>Jangan bagikan API Secret kepada siapapun</li>
            <li>Revoka key jika tidak digunakan lagi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
