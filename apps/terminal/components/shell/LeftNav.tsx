'use client';

// Spec B left nav: the 11 menu items IN ORDER, active route highlighted.
// Order and hrefs are acceptance-checked against sitemenu-complete.md;
// only the copy is localized (A5, Indonesian). Branching uses `id`,
// never the label.
//
// Bottom of the rail carries the A5 marketing hook: the "Invest in AI"
// vault card with the "Mulai dari Rp10.000" entry barrier.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEFT_NAV } from '../../lib/nav';

export function LeftNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu utama"
      className="w-52 shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col py-2 overflow-y-auto"
    >
      <div className="flex-1">
        {LEFT_NAV.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname === '/dashboard/marketplace'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                active
                  ? 'border-[var(--cyan)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto shrink-0 text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--cyan)] uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* A5 hook: Invest in AI vault card, pinned to the rail bottom */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <Link
          href="/dashboard/ai"
          className="block rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-3 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
            Vault
          </span>
          <span className="mt-1.5 block text-sm font-semibold text-[var(--text-primary)]">
            Invest in AI
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-[var(--cyan)]">
            Mulai dari Rp10.000
          </span>
          <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
            dana simulasi · buka vault →
          </span>
        </Link>
      </div>
    </nav>
  );
}
