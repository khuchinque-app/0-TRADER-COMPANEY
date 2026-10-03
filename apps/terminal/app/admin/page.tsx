'use client';

import { useState, useEffect } from 'react';

interface Stats {
  users: number;
  orders: number;
  balances: number;
  journalEntries: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch stats from database via backend API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError('Failed to fetch stats');
      }
    };

    // Fetch users list
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchUsers();
  }, []);

  const handleReset = async () => {
    if (!confirm('⚠️ Reset test environment? This will clear all orders and fills.')) return;
    
    try {
      const response = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await response.json();
      alert(data.message || 'Reset completed');
      // Refresh stats
      window.location.reload();
    } catch (err) {
      alert('Failed to reset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[var(--cyan)]"></span>
            <h1 className="text-xl font-semibold">Admin Control Panel</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span>v1.0.0</span>
            <span>•</span>
            <span>DB: SQLite</span>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Users</div>
            <div className="mt-2 text-3xl font-bold text-[var(--cyan)]">{stats?.users || 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Orders</div>
            <div className="mt-2 text-3xl font-bold text-[var(--pos)]">{stats?.orders || 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Balances</div>
            <div className="mt-2 text-3xl font-bold text-[var(--amber)]">{stats?.balances || 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Journal</div>
            <div className="mt-2 text-3xl font-bold text-[var(--purple)]">{stats?.journalEntries || 0}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-sm transition-colors"
          >
            🔄 Reset Test Environment
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-sm transition-colors"
          >
            📊 Refresh Data
          </button>
        </div>

        {/* Users Table */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold">User Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-surface)]">
                    <td className="px-6 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {user.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-3 font-medium">{user.username}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">{user.email || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' 
                          ? 'bg-[var(--pos-dim)] text-[var(--pos)]' 
                          : 'bg-[var(--neg-dim)] text-[var(--neg)]'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 rounded-md bg-[var(--neg-dim)] border border-[var(--neg)] text-[var(--neg)]">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
