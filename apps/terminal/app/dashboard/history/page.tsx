'use client';

// History page — spec C: History → /api/history/*
// List orders, fills, tx, deposits, withdrawals, PnL with export.

import { useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

type HistoryType = 'order' | 'fill' | 'deposit' | 'withdraw' | 'tx';

interface HistoryItem {
  id: string;
  type: HistoryType;
  timestamp: number;
  detail: string;
  amount?: number;
  asset?: string;
  side?: string;
  pair?: string;
  price?: number;
  status?: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const uidRef = useRef('');

  const load = async () => {
    if (!uidRef.current) return;
    try {
      const res = await fetch(`${ENGINE_URL}/api/history/${uidRef.current}?limit=100`);
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch {
      // Fallback to demo data
      setItems([
        { id: '1', type: 'deposit', timestamp: Date.now() - 86400000, detail: 'Deposit via Bank Transfer', amount: 1000, asset: 'USDT' },
        { id: '2', type: 'fill', timestamp: Date.now() - 7200000, detail: 'Buy BTC/USDT', amount: 0.01, asset: 'BTC', pair: 'BTCUSDT', side: 'buy', price: 65000, status: 'filled' },
        { id: '3', type: 'order', timestamp: Date.now() - 3600000, detail: 'Sell ETH/USDT', amount: 0.5, asset: 'ETH', pair: 'ETHUSDT', side: 'sell', price: 3500, status: 'open' },
        { id: '4', type: 'withdraw', timestamp: Date.now() - 1800000, detail: 'Withdraw to wallet', amount: 100, asset: 'USDT' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    load();
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Timestamp', 'Detail', 'Amount', 'Asset', 'Side', 'Pair', 'Price', 'Status'];
    const rows = filtered.map(i => [
      i.id, i.type, new Date(i.timestamp).toISOString(), i.detail,
      i.amount ?? '', i.asset ?? '', i.side ?? '', i.pair ?? '', i.price ?? '', i.status ?? ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history-${Date.now()}.csv`;
    a.click();
  };

  const typeColors: Record<string, string> = {
    order: 'text-blue-400',
    fill: 'text-[var(--pos)]',
    deposit: 'text-[var(--pos)]',
    withdraw: 'text-[var(--neg)]',
    tx: 'text-[var(--text-muted)]',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Riwayat</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Riwayat transaksi, order, deposit, dan penarikan.
        </p>

        {/* Filters */}
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {(['all', 'order', 'fill', 'deposit', 'withdraw', 'tx'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--cyan)] text-black'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'order' ? 'Order' : f === 'fill' ? 'Fill' : f === 'deposit' ? 'Deposit' : f === 'withdraw' ? 'Withdraw' : 'TX'}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={exportCSV}
              className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* History list */}
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Belum ada riwayat untuk filter ini.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-primary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Tipe</th>
                  <th className="text-left px-4 py-2 font-medium">Detail</th>
                  <th className="text-right px-4 py-2 font-medium">Jumlah</th>
                  <th className="text-left px-4 py-2 font-medium">Pair</th>
                  <th className="text-left px-4 py-2 font-medium">Harga</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className={`px-4 py-3 text-xs font-medium ${typeColors[item.type] || 'text-[var(--text-muted)]'}`}>
                      {item.type.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{item.detail}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {item.amount != null ? `${item.amount} ${item.asset || ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{item.pair || '-'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-muted)]">{item.price ? item.price.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-xs">
                      {item.status ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.status === 'filled' ? 'bg-[var(--pos-dim)] text-[var(--pos)]' :
                          item.status === 'open' ? 'bg-[var(--cyan-dim)] text-[var(--cyan)]' :
                          'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                        }`}>
                          {item.status}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                      {new Date(item.timestamp).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PnL Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total Deposit</div>
            <div className="mt-1 text-lg font-bold text-[var(--pos)]">1,000 USDT</div>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total Withdraw</div>
            <div className="mt-1 text-lg font-bold text-[var(--neg)]">100 USDT</div>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Net PnL</div>
            <div className="mt-1 text-lg font-bold text-[var(--pos)]">+42.50 USDT</div>
          </div>
        </div>
      </div>
    </div>
  );
}
