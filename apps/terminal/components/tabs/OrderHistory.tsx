// OrderHistory component - account order/fill history
//
// Fill rows come from GET /api/fills (spec marketplace fills endpoint,
// rest.ts:110-118):
//   guest mode (AUTH_ENABLED=0) — ask for the scoped path /api/fills/:userId
//     so the demo lists only THIS identity's fills; the bare path would hand
//     back every guest's trades.
//   auth mode (AUTH_ENABLED=1)  — the scoped path is cross-checked against the
//     session (403 for a mismatched userId), so we fall back to bare
//     GET /api/fills, which the engine scopes to the caller's own fills.
// Non-fill movements (deposits, fees) still come from the ledger journal,
// GET /api/ledger/:userId/journal, which also remains the fallback whenever
// the fills endpoint cannot answer (engine offline / not signed in).

'use client';

import { useEffect, useState } from 'react';

interface Props {
  userId: string;
}

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

interface JournalLine {
  asset: string;
  amount: number;
}

interface JournalEntry {
  id: string;
  timestamp: number;
  description: string;
  debits: JournalLine[];
  credits: JournalLine[];
}

/** Row shape returned by GET /api/fills (matcher.getRecentFills → Fill). */
interface FillRow {
  id: string;
  userId: string;
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: number;
}

/** Unified render row: fills (from /api/fills) + journal movements. */
interface Row {
  id: string;
  timestamp: number;
  kind: 'fill' | 'deposit' | 'other';
  side?: 'buy' | 'sell';
  pair?: string;
  qty?: number;
  price?: number;
  title: string;
  badge: string;
  detail: string;
}

// Journal fill lines read: "Fill <fillId>: <side> <qty> <pair> @ <price>"
const FILL_RE = /^Fill (\S+): (buy|sell) ([\d.]+) (\w+USDT) @ ([\d.]+)/;

const money = (n: number): string =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });

function fillRow(f: FillRow): Row {
  return {
    id: f.id,
    timestamp: f.timestamp,
    kind: 'fill',
    side: f.side,
    pair: f.pair,
    qty: f.quantity,
    price: f.price,
    title: `${f.side.toUpperCase()} ${f.pair}`,
    badge: 'FILLED',
    detail: `${f.quantity} @ $${money(f.price)}`,
  };
}

function journalRow(e: JournalEntry, listedFills: Set<string>): Row | null {
  if (e.description.startsWith('Deposit ')) {
    return {
      id: e.id,
      timestamp: e.timestamp,
      kind: 'deposit',
      title: 'DEPOSIT',
      badge: 'DEPOSIT',
      detail: e.description,
    };
  }
  const m = FILL_RE.exec(e.description);
  if (m) {
    // Already rendered from /api/fills — one row per fill, never a double.
    if (listedFills.has(m[1])) return null;
    return {
      id: e.id,
      timestamp: e.timestamp,
      kind: 'fill',
      side: m[2] as 'buy' | 'sell',
      pair: m[4],
      qty: Number(m[3]),
      price: Number(m[5]),
      title: `${m[2].toUpperCase()} ${m[4]}`,
      badge: 'FILLED',
      detail: `${m[3]} @ $${money(Number(m[5]))}`,
    };
  }
  return {
    id: e.id,
    timestamp: e.timestamp,
    kind: 'other',
    title: e.description.slice(0, 40),
    badge: 'OTHER',
    detail: e.description,
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  try {
    const res = await fetch(url, init);
    return res.ok ? await res.json() : null;
  } catch {
    return null; // engine offline
  }
}

function fillsOf(data: unknown): FillRow[] | null {
  const fills = (data as { fills?: unknown } | null)?.fills;
  return Array.isArray(fills) ? (fills as FillRow[]) : null;
}

export default function OrderHistory({ userId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [scoped, journal] = await Promise.all([
        fetchJson(`${ENGINE_URL}/api/fills/${userId}`),
        fetchJson(`${ENGINE_URL}/api/ledger/${userId}/journal`),
      ]);
      // Scoped path first (guest mode); an empty-but-valid reply is honoured
      // so a user with no fills never sees the whole venue's trades.
      let fills = fillsOf(scoped);
      if (fills === null) {
        // 401/403 on the scoped path (auth mode) → bare, session-scoped path.
        fills = fillsOf(await fetchJson('/api/fills', { credentials: 'include' })) ?? [];
      }
      if (cancelled) return;
      const listed = new Set(fills.map(f => f.id));
      const entries: JournalEntry[] = Array.isArray(journal) ? (journal as JournalEntry[]) : [];
      const merged: Row[] = [
        ...fills.map(fillRow),
        ...entries.map(e => journalRow(e, listed)).filter((r): r is Row => r !== null),
      ].sort((a, b) => b.timestamp - a.timestamp);
      setRows(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <div className="p-3 text-[var(--text-muted)] text-xs">Loading...</div>;
  }

  if (rows.length === 0) {
    return <div className="p-3 text-[var(--text-muted)] text-xs">No order history</div>;
  }

  return (
    <div className="h-full overflow-auto">
      {rows.map((row) => (
        <div key={row.id} className="p-3 border-b border-[var(--border)] text-xs">
          <div className="flex justify-between mb-1">
            <span className={`font-bold ${
              row.side === 'buy' ? 'text-[var(--gain)]' :
              row.side === 'sell' ? 'text-[var(--loss)]' :
              'text-[var(--text-primary)]'
            }`}>
              {row.title}
            </span>
            <span className={`px-1 py-0.5 rounded ${
              row.kind === 'fill' ? 'bg-[var(--gain-dim)] text-[var(--gain)]' :
              'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }`}>
              {row.badge}
            </span>
          </div>
          <div className="text-[var(--text-secondary)]">{row.detail}</div>
          <div className="text-[var(--text-muted)] mt-1">
            {new Date(row.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
