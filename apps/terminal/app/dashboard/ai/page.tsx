'use client';

// Invest in AI (spec left-nav item 11) — the founder's differentiator.
// Lists AI strategy book and subscribes via /api/ai/*. Paper venue: a
// subscription debits USDT; strategy performance is SIMULASI (no real
// strategy runs, no real payout). Idempotency-Key per click.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface Strategy {
  id: string; name: string; blurb: string;
  risk: 'low' | 'medium' | 'high';
  targetApy: number; assets: string[]; minAmount: number;
}
interface Subscription {
  id: string; strategy_id: string; asset: string; amount: number;
  target_apy: number; status: string; created_at: number;
}

const RISK_COLOR: Record<Strategy['risk'], string> = {
  low: 'var(--gain)', medium: 'var(--warn)', high: 'var(--neg)',
};

export default function AiInvestPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');
  const keyRef = useRef('');

  const loadSubs = useCallback(async () => {
    if (!uidRef.current) return;
    try {
      const r = await fetch(`${ENGINE_URL}/api/ai/subscriptions?userId=${encodeURIComponent(uidRef.current)}`);
      const d = await r.json();
      setSubs(Array.isArray(d.subscriptions) ? d.subscriptions : []);
    } catch { setSubs([]); }
  }, []);

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    fetch(`${ENGINE_URL}/api/ai/strategies`)
      .then((r) => r.json())
      .then((d) => setStrategies(Array.isArray(d.strategies) ? d.strategies : []))
      .catch(() => setStrategies([]));
    loadSubs();
  }, [loadSubs]);

  const pick = (s: Strategy) => {
    setSelected(s); setAmount(String(s.minAmount)); setMsg(null); keyRef.current = '';
  };

  const subscribe = async () => {
    if (!selected) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { setMsg({ kind: 'err', text: 'Enter a positive amount' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (!keyRef.current) keyRef.current = crypto.randomUUID();
      const r = await fetch(`${ENGINE_URL}/api/ai/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({ userId: uidRef.current, strategyId: selected.id, amount: n }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setMsg({ kind: 'ok', text: `Subscribed ${n} USDT to ${selected.name} (SIMULASI)` });
      keyRef.current = ''; setAmount(''); setSelected(null); loadSubs();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const totalInvested = subs.reduce((s, x) => s + x.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full grid place-items-center border border-[var(--cyan)] shadow-[0_0_14px_var(--cyan-dim)] text-[var(--cyan)]">◆</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Invest in AI</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Signal-driven allocation built on live indicator reads. Simulated performance — not advice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className={`text-left rounded-lg border p-4 transition-colors flex flex-col gap-2 ${
                selected?.id === s.id
                  ? 'border-[var(--cyan)] bg-[var(--bg-hover)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider" style={{ color: RISK_COLOR[s.risk], borderColor: RISK_COLOR[s.risk] }}>
                  {s.risk}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono text-[var(--cyan)]">{s.targetApy}%</span>
                <span className="text-[10px] text-[var(--text-muted)]">target APY</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">{s.blurb}</p>
              <div className="flex flex-wrap gap-1 mt-auto">
                {s.assets.map((a) => (
                  <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] font-mono">{a}</span>
                ))}
              </div>
            </button>
          ))}
          {strategies.length === 0 && (
            <div className="text-xs text-[var(--text-muted)]">Loading strategies… (engine offline?)</div>
          )}
        </div>

        {selected && (
          <div className="mt-5 rounded-lg border border-[var(--cyan)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-semibold">Allocate into {selected.name}</div>
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Amount in USDT"
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-mono outline-none focus:border-[var(--cyan)]"
              />
              <button
                type="button"
                onClick={subscribe}
                disabled={busy}
                className="px-4 py-2 rounded-md bg-[var(--cyan)] text-[var(--accent-ink)] text-sm font-semibold disabled:opacity-40"
              >
                {busy ? '…' : 'Invest'}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--text-muted)]">
              Min {selected.minAmount} USDT · target {selected.targetApy}% APY (SIMULASI, not a promise)
            </div>
          </div>
        )}

        {msg && <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--gain)]' : 'text-[var(--neg)]'}`}>{msg.text}</p>}

        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Active allocations</h2>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">total {totalInvested.toFixed(2)} USDT</span>
          </div>
          <div className="mt-2 rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  <th className="text-left px-3 py-2 font-medium">Strategy</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-right px-3 py-2 font-medium">Target</th>
                  <th className="text-right px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{s.strategy_id}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.amount} {s.asset}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--cyan)]">{s.target_apy}%</td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)]">{s.status}</td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--text-muted)]">No allocations yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
