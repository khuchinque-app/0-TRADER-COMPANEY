'use client';

// Recurring Invest page — spec C: Recurring Invest → /api/recurring/*
// Automated periodic purchases (DCA) for crypto assets.
// SIMULASI only — no real chain, no real payout.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface RecurringPlan {
  id: string;
  asset: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextDate: string;
  status: 'active' | 'paused' | 'completed';
  created_at: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function fmtRp(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID');
}

const FREQUENCIES = [
  { id: 'daily' as const, label: 'Harian', icon: '📅' },
  { id: 'weekly' as const, label: 'Mingguan', icon: '📆' },
  { id: 'monthly' as const, label: 'Bulanan', icon: '🗓️' },
];

const ASSET_OPTIONS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'LINK'];

export default function RecurringInvestPage() {
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');

  // Form state
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const load = useCallback(async () => {
    if (!uidRef.current) return;
    try {
      const res = await fetch(`${ENGINE_URL}/api/recurring/${uidRef.current}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
    } catch {
      // Engine offline or not implemented yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setMsg({ kind: 'err', text: 'Masukkan jumlah yang valid' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${ENGINE_URL}/api/recurring/${uidRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ asset, amount: n, frequency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ kind: 'ok', text: `Plan "${asset}" ${fmt(n)} ${frequency} berhasil dibuat` });
      setAmount('');
      await load();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const togglePlan = async (planId: string, status: 'active' | 'paused') => {
    try {
      await fetch(`${ENGINE_URL}/api/recurring/${uidRef.current}/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch { /* ignore */ }
  };

  const deletePlan = async (planId: string) => {
    try {
      await fetch(`${ENGINE_URL}/api/recurring/${uidRef.current}/${planId}`, {
        method: 'DELETE',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Investasi Berkala</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Dollar-Cost Averaging (DCA) otomatis untuk aset kripto pilihanmu.
        </p>

        {/* Create new plan form */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-4">Buat Plan Baru</div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Aset</label>
                <select
                  value={asset}
                  onChange={e => setAsset(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
                >
                  {ASSET_OPTIONS.map(a => (
                    <option key={a} value={a}>{a}/USDT</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Jumlah (USDT)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="100"
                  inputMode="decimal"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Frekuensi</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-md border text-xs transition-all ${
                      frequency === f.id
                        ? 'border-[var(--cyan)] bg-[var(--cyan-dim)] text-[var(--cyan)]'
                        : 'border-[var(--border)] hover:border-[var(--border-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    <span className="text-lg">{f.icon}</span>
                    <span className="font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !amount}
              className="w-full rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Memproses...' : 'Buat Plan Investasi'}
            </button>
          </form>
          {msg && (
            <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>
              {msg.text}
            </p>
          )}
        </div>

        {/* Active plans list */}
        <div className="mt-6">
          <div className="text-xs font-semibold mb-3">Plan Aktif</div>
          {loading ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-8">Memuat...</div>
          ) : plans.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-muted)]">
              Belum ada plan investasi berkala. Buat plan pertamamu di atas!
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-lg">
                      {plan.asset.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{plan.asset} · {fmt(plan.amount)} USDT</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {plan.frequency === 'daily' ? 'Harian' : plan.frequency === 'weekly' ? 'Mingguan' : 'Bulanan'} · Next: {new Date(plan.nextDate).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      plan.status === 'active'
                        ? 'border-[var(--pos)] text-[var(--pos)]'
                        : plan.status === 'paused'
                        ? 'border-[var(--text-muted)] text-[var(--text-muted)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {plan.status === 'active' ? 'Aktif' : plan.status === 'paused' ? 'Dijeda' : 'Selesai'}
                    </span>
                    <button
                      onClick={() => togglePlan(plan.id, plan.status === 'active' ? 'paused' : 'active')}
                      className="px-2 py-1 text-[10px] border border-[var(--border)] rounded hover:bg-[var(--bg-hover)]"
                    >
                      {plan.status === 'active' ? 'Jeda' : 'Lanjut'}
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="px-2 py-1 text-[10px] border border-[var(--neg)] text-[var(--neg)] rounded hover:bg-[var(--neg-dim)]"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-2">Apa itu DCA?</div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Dollar-Cost Averaging (DCA) adalah strategi investasi dengan membeli aset secara rutin
            dalam jumlah yang sama setiap periode. Strategi ini mengurangi risiko timing pasar
            dan cocok untuk investor jangka panjang.
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            SIMULASI: Plan ini tidak mengeksekusi transaksi nyata. Semua eksekusi adalah simulasi.
          </p>
        </div>
      </div>
    </div>
  );
}
