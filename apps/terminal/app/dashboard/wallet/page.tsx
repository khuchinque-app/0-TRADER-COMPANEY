'use client';

// Wallet page — spec C: Wallet → /api/wallet/* (SIMULASI: paper funds only).
// Supports multiple Indonesian payment methods: Bank Transfer, E-Wallet (DANA, OVO, GoPay), Phone Recharge, QRIS, Virtual Account.
// Balances + mark-to-market total, deposit/withdraw forms with payment method selection.

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

type PaymentMethod = 'bank_transfer' | 'dana' | 'ovo' | 'gopay' | 'shopeepay' | 'phone_recharge' | 'qris' | 'virtual_account';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; desc: string; fee: number }[] = [
  { id: 'bank_transfer', label: 'Transfer Bank', icon: '🏦', desc: 'BCA, BNI, BRI, Mandiri', fee: 0 },
  { id: 'dana', label: 'DANA', icon: '💙', desc: 'E-Wallet DANA', fee: 500 },
  { id: 'ovo', label: 'OVO', icon: '💜', desc: 'E-Wallet OVO', fee: 500 },
  { id: 'gopay', label: 'GoPay', icon: '💚', desc: 'E-Wallet GoPay', fee: 500 },
  { id: 'shopeepay', label: 'ShopeePay', icon: '🧡', desc: 'E-Wallet ShopeePay', fee: 500 },
  { id: 'phone_recharge', label: 'Pulsa/Telepon', icon: '📱', desc: 'Indosat, XL, Telkomsel', fee: 1000 },
  { id: 'qris', label: 'QRIS', icon: '📷', desc: 'Scan QR Universal', fee: 0 },
  { id: 'virtual_account', label: 'Virtual Account', icon: '🔢', desc: 'VA Bank Digital', fee: 1500 },
];

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function fmtRp(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID');
}

export default function WalletPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [journal, setJournal] = useState<JournalLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');

  const [dep, setDep] = useState<MoveForm>({ asset: 'USDT', amount: '' });
  const [wd, setWd] = useState<MoveForm>({ asset: 'USDT', amount: '' });
  const depKey = useRef('');
  const wdKey = useRef('');

  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('bank_transfer');
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('bank_transfer');

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

  const move = async (kind: 'deposit' | 'withdraw', form: MoveForm, key: string, setForm: SetMoveForm, method: PaymentMethod) => {
    setMsg(null);
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n <= 0) { setMsg({ kind: 'err', text: 'Enter a positive amount' }); return; }
    setBusy(true);
    try {
      const res = await fetch(`${ENGINE_URL}/api/wallet/${uidRef.current}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ asset: form.asset, amount: n, paymentMethod: method }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
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

  const moveForm = (kind: 'deposit' | 'withdraw', state: MoveForm, setState: SetMoveForm, keyRef: typeof depKey, method: PaymentMethod, setMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>) => (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">{kind === 'deposit' ? 'Deposit (simulated)' : 'Withdraw (simulated)'}</div>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
      </div>

      {/* Payment Method Selection */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Metode Pembayaran</div>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-all ${
                method === m.id
                  ? 'border-[var(--cyan)] bg-[var(--cyan-dim)] text-[var(--cyan)]'
                  : 'border-[var(--border)] hover:border-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              <span className="text-[9px] font-medium truncate w-full text-center">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-[var(--text-muted)]">
          {PAYMENT_METHODS.find(m => m.id === method)?.desc} · Fee: {PAYMENT_METHODS.find(m => m.id === method)?.fee === 0 ? 'Gratis' : fmtRp(PAYMENT_METHODS.find(m => m.id === method)!.fee)}
        </div>
      </div>

      <div className="flex gap-2">
        <select value={state.asset} onChange={e => setState(f => ({ ...f, asset: e.target.value }))} className={input}>
          {assetOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className={input} inputMode="decimal" placeholder="Jumlah"
          value={state.amount} onChange={e => setState(f => ({ ...f, amount: e.target.value }))} />
      </div>

      <button type="button" disabled={busy}
        onClick={() => {
          if (!keyRef.current) keyRef.current = crypto.randomUUID();
          const n = Number(state.amount);
          if (Number.isFinite(n) && n > 0) {
            move(kind, state, keyRef.current, setState, method);
          }
        }}
        className="w-full rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-40">
        {busy ? '…' : kind === 'deposit' ? `Deposit via ${PAYMENT_METHODS.find(m => m.id === method)?.label}` : `Withdraw via ${PAYMENT_METHODS.find(m => m.id === method)?.label}`}
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Dompet</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Dana simulasi saja — tidak ada rantai nyata, tidak ada pembayaran nyata.
        </p>

        {/* Total */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total nilai (mark-to-market)</div>
          <div className="mt-1 text-2xl font-bold font-mono">
            {account ? `${fmt(account.totalValueUsdt)} USDT` : '—'}
          </div>
          {account && (
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              ≈ {fmtRp(Math.round(account.totalValueUsdt * 15500))} IDR
            </div>
          )}
        </div>

        {/* Balances */}
        <div className="mt-4 rounded-md border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Aset</th>
                <th className="text-right px-4 py-2 font-medium">Tersedia</th>
                <th className="text-right px-4 py-2 font-medium">Terkunci</th>
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
                <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">Memuat saldo…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Deposit / withdraw with payment methods */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {moveForm('deposit', dep, setDep, depKey, depositMethod, setDepositMethod)}
          {moveForm('withdraw', wd, setWd, wdKey, withdrawMethod, setWithdrawMethod)}
        </div>

        {/* Payment methods info */}
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Metode Pembayaran Tersedia</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_METHODS.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1 p-3 rounded-md border border-[var(--border)]">
                <span className="text-2xl">{m.icon}</span>
                <span className="text-xs font-medium">{m.label}</span>
                <span className="text-[10px] text-[var(--text-muted)] text-center">{m.desc}</span>
                <span className="text-[10px] text-[var(--cyan)]">{m.fee === 0 ? 'Gratis' : fmtRp(m.fee)}</span>
              </div>
            ))}
          </div>
        </div>

        {msg && (
          <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{msg.text}</p>
        )}

        {/* Movements */}
        <div className="mt-6">
          <div className="text-xs font-semibold mb-2">Riwayat Dompet</div>
          <div className="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            {journal.length === 0 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">Belum ada deposit atau penarikan.</div>
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
