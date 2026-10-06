'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
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

  const isActive = (path: string) => pathname === path ? 'text-vice-cyan' : 'text-vice-text-secondary hover:text-vice-cyan';

  if (loading) {
    return (
      <header className="border-b border-vice-border bg-vice-surface px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
          </div>
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
            <Link href="/market" className={`text-sm font-medium transition-colors ${isActive('/market')}`}>
              Market
            </Link>
            <Link href="/trade/BTCIDR" className={`text-sm font-medium transition-colors ${isActive('/trade/BTCIDR')}`}>
              Trade
            </Link>
            {user && (
              <>
                <Link href="/portfolio" className={`text-sm font-medium transition-colors ${isActive('/portfolio')}`}>
                  Portfolio
                </Link>
                <Link 
                  href="/agent-chat" 
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    pathname === '/agent-chat' ? 'text-pink glow-pink' : 'text-vice-text-secondary hover:text-pink'
                  }`}
                >
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
