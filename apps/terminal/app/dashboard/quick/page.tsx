'use client';

// Quick Buy/Sell — spec: "simplified trading for beginners", /api/quick/*.
// Amount-in (USDT) → live quote → one-click market execute. No order book,
// no limit fields, no jargon. Idempotency-Key per click (spec D).

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface Quote { pair: string; side: 'buy' | 'sell'; price: number; quoteAmount: number; quantity: number }
interface ExecResult { order: { id: string; status: string }; fills: unknown[] }

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'LINKUSDT', 'AAVEUSDT'];

export default function QuickPage() {
  const [pair, setPair] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const uidRef = useRef('');
  const keyRef = useRef('');
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { uidRef.current = getOrCreateUserId(); }, []);

  // Debounced live quote as the beginner types.
  const refreshQuote = useCallback(async (p: string, s: 'buy' | 'sell', a: number) => {
    if (!Number.isFinite(a) || a <= 0) { setQuote(null); return; }
    try {
      const r = await fetch(`${ENGINE_URL}/api/quick/quote?pair=${p}&side=${s}&quoteAmount=${a}`);
      const d = await r.json();
      setQuote(r.ok ? d : null);
    } catch { setQuote(null); }
  }, []);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => refreshQuote(pair, side, Number(amount)), 350);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [pair, side, amount, refreshQuote]);

  const execute = async () => {
    setMsg(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { setMsg({ kind: 'err', text: 'Enter an amount in USDT' }); return; }
    setBusy(true);
    try {
      if (!keyRef.current) keyRef.current = crypto.randomUUID(); // fresh per click, stable on resend
      const r = await fetch(`${ENGINE_URL}/api/quick/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({ userId: uidRef.current, pair, side, quoteAmount: n }),
      });
      const d: ExecResult & { error?: string } = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setMsg({ kind: 'ok', text: `${side === 'buy' ? 'Bought' : 'Sold'} — order ${d.order.id.slice(-6)} ${d.order.status}` });
      keyRef.current = ''; // success → next click gets a NEW intent key
      setAmount('100');
      refreshQuote(pair, side, 100);
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    }
    setBusy(false);
  };

  const btn = (s: 'buy' | 'sell') =>
    `flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
      side === s
        ? s === 'buy' ? 'bg-[var(--pos)] text-black' : 'bg-[var(--neg)] text-white'
        : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Quick Buy / Sell</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Enter an amount, we do the rest. Paper funds only.
        </p>

        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setSide('buy')} className={btn('buy')}>Buy</button>
            <button type="button" onClick={() => setSide('sell')} className={btn('sell')}>Sell</button>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Asset</label>
            <select value={pair} onChange={e => setPair(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]">
              {PAIRS.map(p => <option key={p} value={p}>{p.replace('USDT', '')} (USDT pair)</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Amount (USDT)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-lg font-mono outline-none focus:border-[var(--cyan)]" />
          </div>

          <div className="rounded-md bg-[var(--bg-primary)] border border-[var(--border)] p-3 text-sm space-y-1">
            {quote ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">You {side === 'buy' ? 'get about' : 'sell about'}</span>
                  <span className="font-mono">{quote.quantity} {pair.replace('USDT', '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Price</span>
                  <span className="font-mono">{quote.price.toLocaleString('en-US')} USDT</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--text-muted)]">Fetching live price…</div>
            )}
          </div>

          <button type="button" onClick={execute} disabled={busy || !quote}
            className={`w-full rounded-md py-3 text-sm font-bold disabled:opacity-40 ${
              side === 'buy' ? 'bg-[var(--pos)] text-black hover:opacity-90' : 'bg-[var(--neg)] text-white hover:opacity-90'}`}>
            {busy ? '…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${pair.replace('USDT', '')}`}
          </button>

          {msg && (
            <p className={`text-xs ${msg.kind === 'ok' ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{msg.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
