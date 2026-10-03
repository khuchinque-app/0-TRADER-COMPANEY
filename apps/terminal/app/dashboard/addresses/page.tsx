'use client';

// Address Management page — spec C: Address Mgmt → /api/addresses/*
// List deposited addresses and withdraw whitelist. SIMULASI only.

import { useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface Address {
  id: string;
  asset: string;
  address: string;
  tag?: string;
  createdAt: number;
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newAsset, setNewAsset] = useState('USDT');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');

  const load = async () => {
    if (!uidRef.current) return;
    try {
      const [addrRes, wlRes] = await Promise.all([
        fetch(`${ENGINE_URL}/api/addresses/${uidRef.current}`),
        fetch(`${ENGINE_URL}/api/addresses/${uidRef.current}/whitelist`),
      ]);
      const addrData = await addrRes.json();
      const wlData = await wlRes.json();
      if (addrData.addresses) setAddresses(addrData.addresses);
      if (wlData.whitelist) setWhitelist(wlData.whitelist);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    load();
  }, []);

  const addAddress = async () => {
    if (!newAddress.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${ENGINE_URL}/api/addresses/${uidRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ asset: newAsset, address: newAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg({ kind: 'ok', text: 'Alamat berhasil ditambahkan' });
      setNewAddress('');
      await load();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const addToWhitelist = async (addr: string) => {
    try {
      await fetch(`${ENGINE_URL}/api/addresses/${uidRef.current}/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ address: addr }),
      });
      setWhitelist(prev => [...prev, addr]);
    } catch { /* ignore */ }
  };

  const removeFromWhitelist = async (addr: string) => {
    try {
      await fetch(`${ENGINE_URL}/api/addresses/${uidRef.current}/whitelist`, {
        method: 'DELETE',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ address: addr }),
      });
      setWhitelist(prev => prev.filter(a => a !== addr));
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Manajemen Alamat</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Kelola alamat deposit dan whitelist penarikan. SIMULASI — tidak ada rantai nyata.
        </p>

        {/* Deposit Addresses */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Alamat Deposit</div>
          {addresses.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-6">
              Belum ada alamat deposit. Gunakan format di bawah untuk menambah.
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map(addr => (
                <div key={addr.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                  <div>
                    <div className="text-xs font-medium text-[var(--cyan)]">{addr.asset}</div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1 break-all">{addr.address}</div>
                    {addr.tag && <div className="text-[10px] text-[var(--text-muted)]">Tag: {addr.tag}</div>}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(addr.address)}
                    className="text-xs px-2 py-1 border border-[var(--border)] rounded hover:bg-[var(--bg-hover)]"
                  >
                    Salin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Address */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Tambah Alamat Baru</div>
          <div className="flex gap-2">
            <select
              value={newAsset}
              onChange={e => setNewAsset(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
            >
              {['USDT', 'BTC', 'ETH', 'SOL', 'BNB'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <input
              type="text"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              placeholder="Masukkan alamat wallet..."
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)] font-mono"
            />
            <button
              onClick={addAddress}
              disabled={busy || !newAddress}
              className="rounded-md bg-[var(--cyan)] text-black text-sm font-semibold px-4 hover:opacity-90 disabled:opacity-40"
            >
              Tambah
            </button>
          </div>
          {msg && (
            <p className={`mt-2 text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
              {msg.text}
            </p>
          )}
        </div>

        {/* Withdraw Whitelist */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold">Whitelist Penarikan</div>
            <span className="text-[10px] text-[var(--text-muted)]">Hanya alamat dalam daftar yang bisa ditarik</span>
          </div>
          {whitelist.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-4">
              Belum ada alamat di whitelist
            </div>
          ) : (
            <div className="space-y-2">
              {whitelist.map((addr, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                  <div className="text-[10px] font-mono break-all">{addr}</div>
                  <button
                    onClick={() => removeFromWhitelist(addr)}
                    className="text-xs text-[var(--neg)] hover:underline ml-2"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Alamat untuk ditambah..."
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs outline-none focus:border-[var(--cyan)] font-mono"
            />
            <button
              onClick={() => addToWhitelist(newAddress || '0x1234...')}
              className="rounded-md border border-[var(--cyan)] text-[var(--cyan)] text-xs px-3 hover:bg-[var(--cyan-dim)]"
            >
              Tambah ke Whitelist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
