'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.user?.role === 'admin') {
        localStorage.setItem('token', data.token);
        router.push('/admin/dashboard');
      } else if (res.ok) {
        // Check if email contains admin indicators
        if (data.user?.email?.includes('chinque') || data.user?.email?.includes('admin')) {
          localStorage.setItem('token', data.token);
          router.push('/admin/dashboard');
        } else {
          setError('Access denied. Admin privileges required.');
        }
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h1 className="mt-4 text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-[var(--text-muted)]">Trading System Control Panel</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--cyan)]"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--cyan)]"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-[var(--neg-dim)] border border-[var(--neg)] text-[var(--neg)] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-md bg-[var(--cyan)] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              ← Back to Terminal
            </a>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            <strong>Dev Credentials:</strong><br />
            Username: chinque<br />
            Password: admin1
          </p>
        </div>
      </div>
    </div>
  );
}
