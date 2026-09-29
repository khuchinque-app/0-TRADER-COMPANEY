'use client';

// Wallet page — spec C: Wallet → /api/wallet/* (SIMULASI: paper funds only).
// Balances + mark-to-market total, deposit/withdraw forms that send a real
// Idempotency-Key per click (spec D money rule), movement journal tail.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface Balance { asset: string; available: number; locked: number }
interface Account {
  userId: string;
  balances: Balance[];
  totalValueUsdt: number;
}
interface JournalLine { id: string; description: string; timestamp: number }
interface MoveForm { asset: string; amount: string }
type SetMoveForm = (fn: (f: MoveForm) => MoveForm) => void;

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export default function WalletPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [journal, setJournal] = useState<JournalLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');

  // ONE state pair PER form — sharing amount/asset across deposit and
  // withdraw let a typed deposit amount submit as a withdrawal.
  const [dep, setDep] = useState<MoveForm>({ asset: 'USDT', amount: '' });
  const [wd, setWd] = useState<MoveForm>({ asset: 'USDT', amount: '' });
  const depKey = useRef('');
  const wdKey = useRef('');

  const load = useCallback(async () => {
    if (!uidRef.current) return;
    try {
      const [acct, jr] = await Promise.all([
        fetch(`${ENGINE_URL}/api/wallet/${uidRef.current}`).then(r => r.json()),
        fetch(`${ENGINE_URL}/api/ledger/${uidRef.current}/journal`).then(r => r.json()),
      ]);
      if (acct.balances) {
        setAccount(acct);
        setJournal((Array.isArray(jr) ? jr : []).filter((e: JournalLine) =>
          /^(Deposit|Withdraw) /.test(e.description ?? '')).slice(0, 12));
      }
    } catch { /* engine offline */ }
  }, []);

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [load]);

  const move = async (kind: 'deposit' | 'withdraw', form: MoveForm, key: string, setForm: SetMoveForm) => {
    setMsg(null);
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n <= 0) { setMsg({ kind: 'err', text: 'Enter a positive amount' }); return; }
    setBusy(true);
    try {
      const res = await fetch(`${ENGINE_URL}/api/wallet/${uidRef.current}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ asset: form.asset, amount: n }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      // replayed:true means a PREVIOUS request under this key already moved
      // money — never claim this click's amount went through.
      setMsg({
        kind: 'ok',
        text: d.replayed
          ? 'A previous request with the same intent was already applied — check the movements list.'
          : `${kind === 'deposit' ? 'Deposited' : 'Withdrew'} ${fmt(n)} ${form.asset}`,
      });
      setForm(f => ({ ...f, amount: '' }));
      await load();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const input = 'flex-1 min-w-0 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)] font-mono';
  const assetOptions = (account?.balances ?? [{ asset: 'USDT' } as Balance]).map(b => b.asset);

  const moveForm = (kind: 'deposit' | 'withdraw', state: MoveForm, setState: SetMoveForm, keyRef: typeof depKey) => (
    <form className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3"
      onSubmit={e => {
        e.preventDefault();
        // One fresh key per explicit click; a browser resend of THIS submit
        // after a dropped response reuses the same key — replay-safe.
        if (!keyRef.current) keyRef.current = crypto.randomUUID();
        move(kind, state, keyRef.current, setState);
      }}>
      <div className="text-xs font-semibold">{kind === 'deposit' ? 'Deposit (simulated)' : 'Withdraw (simulated)'}</div>
      <div className="flex gap-2">
        <select value={state.asset} onChange={e => setState(f => ({ ...f, asset: e.target.value }))} className={input}>
          {assetOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className={input} inputMode="decimal" placeholder="Amount"
          value={state.amount} onChange={e => setState(f => ({ ...f, amount: e.target.value }))} />
      </div>
      <button type="submit" disabled={busy}
        className={kind === 'deposit'
          ? 'w-full rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-40'
          : 'w-full rounded-md border border-[var(--neg)] text-[var(--neg)] text-sm font-semibold py-2 hover:bg-[var(--bg-hover)] disabled:opacity-40'}>
        {busy ? '…' : kind === 'deposit' ? 'Deposit' : 'Withdraw'}
      </button>
    </form>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Wallet</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Paper funds only — no real chain, no real payout.
        </p>

        {/* Total */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total value (mark-to-market)</div>
          <div className="mt-1 text-2xl font-bold font-mono">
            {account ? `${fmt(account.totalValueUsdt)} USDT` : '—'}
          </div>
        </div>

        {/* Balances */}
        <div className="mt-4 rounded-md border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Asset</th>
                <th className="text-right px-4 py-2 font-medium">Available</th>
                <th className="text-right px-4 py-2 font-medium">Locked</th>
              </tr>
            </thead>
            <tbody>
              {(account?.balances ?? []).map(b => (
                <tr key={b.asset} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-medium">{b.asset}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(b.available)}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--text-muted)]">{fmt(b.locked)}</td>
                </tr>
              ))}
              {!account && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">Loading balances…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Deposit / withdraw */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {moveForm('deposit', dep, setDep, depKey)}
          {moveForm('withdraw', wd, setWd, wdKey)}
        </div>
        {msg && (
          <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{msg.text}</p>
        )}

        {/* Movements */}
        <div className="mt-6">
          <div className="text-xs font-semibold mb-2">Wallet movements</div>
          <div className="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            {journal.length === 0 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">No deposits or withdrawals yet.</div>
            )}
            {journal.map(j => (
              <div key={j.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span>{j.description}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {new Date(j.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
