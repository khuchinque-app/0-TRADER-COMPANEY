'use client';

// Dashboard frame (spec B): top bar on top; below it LEFT NAV | main pane.
// The workspace (marketplace) fills the main pane.

import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <LeftNav />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
