'use client';

// Staking (spec left-nav item 5) — lists plans and subscribes via
// /api/staking/*. Paper venue: subscriptions debit the real ledger; rewards
// are SIMULASI only (no chain, no real yield). Idempotency-Key per click.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface Plan { id: string; name: string; asset: string; apy: number; lockDays: number; minAmount: number }
interface Position { id: string; plan_id: string; asset: string; amount: number; apy: number; status: string; created_at: number }

export default function StakingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');
  const keyRef = useRef('');

  const loadPositions = useCallback(async () => {
    if (!uidRef.current) return;
    try {
      const r = await fetch(`${ENGINE_URL}/api/staking/positions?userId=${encodeURIComponent(uidRef.current)}`);
      const d = await r.json();
      setPositions(Array.isArray(d.positions) ? d.positions : []);
    } catch { setPositions([]); }
  }, []);

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    fetch(`${ENGINE_URL}/api/staking/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(Array.isArray(d.plans) ? d.plans : []))
      .catch(() => setPlans([]));
    loadPositions();
  }, [loadPositions]);

  const pick = (p: Plan) => {
    setSelected(p);
    setAmount(String(p.minAmount));
    setMsg(null);
    keyRef.current = '';
  };

  const subscribe = async () => {
    if (!selected) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { setMsg({ kind: 'err', text: 'Enter a positive amount' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (!keyRef.current) keyRef.current = crypto.randomUUID();
      const r = await fetch(`${ENGINE_URL}/api/staking/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({ userId: uidRef.current, planId: selected.id, amount: n }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setMsg({ kind: 'ok', text: `Staked ${n} ${selected.asset} in ${selected.name} (SIMULASI)` });
      keyRef.current = '';
      setAmount('');
      setSelected(null);
      loadPositions();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const totalStaked = positions.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Staking</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Put idle assets to work. Rewards are simulated — paper venue, not a real yield.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                selected?.id === p.id
                  ? 'border-[var(--cyan)] bg-[var(--bg-hover)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{p.asset}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono text-[var(--gain)]">{p.apy}%</span>
                <span className="text-[10px] text-[var(--text-muted)]">est. APY</span>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>{p.lockDays === 0 ? 'Flexible' : `${p.lockDays}-day lock`}</span>
                <span>min {p.minAmount} {p.asset}</span>
              </div>
            </button>
          ))}
          {plans.length === 0 && (
            <div className="text-xs text-[var(--text-muted)]">Loading plans… (engine offline?)</div>
          )}
        </div>

        {selected && (
          <div className="mt-5 rounded-lg border border-[var(--cyan)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-semibold">Stake into {selected.name}</div>
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={`Amount in ${selected.asset}`}
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-mono outline-none focus:border-[var(--cyan)]"
              />
              <button
                type="button"
                onClick={subscribe}
                disabled={busy}
                className="px-4 py-2 rounded-md bg-[var(--cyan)] text-[var(--accent-ink)] text-sm font-semibold disabled:opacity-40"
              >
                {busy ? '…' : 'Stake'}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--text-muted)]">
              Est. reward: {Number(amount) > 0 ? ((Number(amount) * selected.apy) / 100).toFixed(4) : '0'} {selected.asset} / year (SIMULASI)
            </div>
          </div>
        )}

        {msg && <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--gain)]' : 'text-[var(--neg)]'}`}>{msg.text}</p>}

        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Your positions</h2>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">total {totalStaked.toFixed(4)}</span>
          </div>
          <div className="mt-2 rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  <th className="text-left px-3 py-2 font-medium">Plan</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-right px-3 py-2 font-medium">APY</th>
                  <th className="text-right px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{p.plan_id}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.amount} {p.asset}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--gain)]">{p.apy}%</td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)]">{p.status}</td>
                  </tr>
                ))}
                {positions.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--text-muted)]">No positions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
