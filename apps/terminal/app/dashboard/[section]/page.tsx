'use client';

// Placeholder scaffold for dashboard sections that PLAN-TO-DO builds later
// (wallet, staking, history, …). Static routes take precedence over this
// dynamic segment, so each section replaces its placeholder when built.
// Never a dead link; always honest about state.

import { LEFT_NAV, PROFILE_ITEMS } from '../../../lib/nav';

const TITLES: Record<string, string> = {};
for (const i of [...LEFT_NAV, ...PROFILE_ITEMS]) {
  const seg = i.href.split('/').pop();
  if (seg) TITLES[seg] = i.label;
}

export default function SectionPlaceholder({ params }: { params: { section: string } }) {
  const title = TITLES[params.section] ?? params.section;
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4 opacity-20">▤</div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          This section is on the build list — it will replace this placeholder
          when its task line lands.
        </p>
        <span className="inline-block mt-4 text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
          SIMULASI · coming soon
        </span>
      </div>
    </div>
  );
}
