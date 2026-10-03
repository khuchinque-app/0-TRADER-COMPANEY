'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  phone: string | null;
  phone_verified: number;
  status: string;
  created_at: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => setError('Failed to fetch users'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  if (loading) {
    return <div className="text-[var(--text-muted)]">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <span className="text-sm text-[var(--text-muted)]">{users.length} total users</span>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-sm w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)]">
              <tr>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Email</th>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Verified</th>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Status</th>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left uppercase text-[10px] tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="px-6 py-3 font-medium">{user.email}</td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">{user.phone || '-'}</td>
                  <td className="px-6 py-3">
                    {user.phone_verified ? (
                      <span className="text-[var(--pos)]">✓</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === 'active' 
                        ? 'bg-[var(--pos-dim)] text-[var(--pos)]' 
                        : user.status === 'suspended'
                        ? 'bg-[var(--neg-dim)] text-[var(--neg)]'
                        : 'bg-[var(--amber-dim)] text-[var(--amber)]'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => toggleStatus(user.id, user.status)}
                      className="px-3 py-1 rounded text-xs border border-[var(--border)] hover:bg-[var(--bg-hover)]"
                    >
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
