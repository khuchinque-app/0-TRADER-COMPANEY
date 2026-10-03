'use client';

import { useEffect, useState } from 'react';

interface Stats {
  users: number;
  orders: number;
  balances: number;
  journalEntries: number;
}

interface SystemStatus {
  backend: { port: number; status: string };
  frontend: { port: number; status: string };
  static: { port: number; status: string };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, statusRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/status')
        ]);

        const statsData = await statsRes.json();
        const statusData = await statusRes.json();

        setStats(statsData);
        setSystemStatus(statusData);
      } catch (err) {
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleReset = async () => {
    if (!confirm('⚠️ Reset test environment? This will clear all orders and fills.')) return;
    
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Reset completed');
      window.location.reload();
    } catch (err) {
      alert('Failed to reset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[var(--text-muted)]">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-sm transition-colors"
        >
          🔄 Reset Test Data
        </button>
      </div>

      {/* System Status */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <h2 className="font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-md bg-[var(--bg-primary)]">
            <div className="text-xs text-[var(--text-muted)]">Backend API</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pos)]"></span>
              <span className="font-mono text-sm">:{systemStatus?.backend.port || 11110}</span>
            </div>
          </div>
          <div className="p-3 rounded-md bg-[var(--bg-primary)]">
            <div className="text-xs text-[var(--text-muted)]">Frontend Terminal</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pos)]"></span>
              <span className="font-mono text-sm">:{systemStatus?.frontend.port || 22220}</span>
            </div>
          </div>
          <div className="p-3 rounded-md bg-[var(--bg-primary)]">
            <div className="text-xs text-[var(--text-muted)]">Static Server</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pos)]"></span>
              <span className="font-mono text-sm">:{systemStatus?.static.port || 2217}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-[var(--cyan)]">{stats?.users || 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Active Orders</div>
          <div className="mt-2 text-3xl font-bold text-[var(--pos)]">{stats?.orders || 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Balances</div>
          <div className="mt-2 text-3xl font-bold text-[var(--amber)]">{stats?.balances || 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Journal Entries</div>
          <div className="mt-2 text-3xl font-bold text-[var(--purple)]">{stats?.journalEntries || 0}</div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-[var(--neg-dim)] border border-[var(--neg)] text-[var(--neg)]">
          {error}
        </div>
      )}
    </div>
  );
}
