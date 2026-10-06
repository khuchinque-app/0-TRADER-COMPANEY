'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MarketNav() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Auth check failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <header className="border-b border-vice-border bg-vice-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-vice-border bg-vice-surface px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-vice-cyan glow-cyan">
            📈 Trading
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/market" className="text-vice-text-secondary hover:text-vice-cyan transition-colors">
              Market
            </Link>
            <Link href="/trade/BTCIDR" className="text-vice-text-secondary hover:text-vice-cyan transition-colors">
              Trade
            </Link>
            {user && (
              <>
                <Link href="/portfolio" className="text-vice-text-secondary hover:text-vice-cyan transition-colors">
                  Portfolio
                </Link>
                <Link href="/agent-chat" className="flex items-center gap-1 text-pink hover:text-pink/80 transition-colors">
                  🤖 Agent
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-vice-text-secondary">
                👤 {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-vice-text-secondary hover:text-white border border-vice-border hover:border-vice-cyan rounded-lg transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-vice-text-primary hover:text-vice-cyan transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-vice-primary px-4 py-2 text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
