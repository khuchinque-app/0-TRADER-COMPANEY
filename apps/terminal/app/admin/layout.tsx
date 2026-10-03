'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'admin' || data.email?.includes('chinque') || data.email?.includes('admin')) {
            setUser(data);
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[var(--cyan)]"></span>
            <h1 className="font-semibold">Admin Panel</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Control Center</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-surface)] transition-colors">
              <span>📊</span> Dashboard
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-surface)] transition-colors">
              <span>👥</span> Users
            </Link>
            <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-surface)] transition-colors">
              <span>📋</span> Orders
            </Link>
            <Link href="/admin/ledger" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-surface)] transition-colors">
              <span>📒</span> Ledger
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-surface)] transition-colors">
              <span>⚙️</span> Settings
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <span>←</span> Back to Terminal
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{user?.email || 'Admin'}</h2>
              <p className="text-xs text-[var(--text-muted)]">Super Administrator</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
              <span className="px-2 py-1 rounded bg-[var(--pos-dim)] text-[var(--pos)] text-xs">SYSTEM ONLINE</span>
            </div>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
