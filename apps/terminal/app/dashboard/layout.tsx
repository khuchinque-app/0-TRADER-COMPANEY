'use client';

// Spec B dashboard layout: TOP BAR (with 9-item profile popup) + LEFT NAV
// (11 items) + MAIN CONTENT PANE. Every /dashboard/* section renders inside
// this frame.
//
// Auth gate (spec A journey end, DECISIONS-LOG A4: the guest demo must stay
// green and frictionless). The ONLY backend signal for "auth is on" is
// GET /api/me (me-routes.ts resolveMeIdentity), probed with the guest
// identity header that lib/theme.ts meHeaders() builds:
//
//   200 → the engine accepted an identity → AUTH_ENABLED=0 (guest demo,
//         status 'guest') or a valid session cookie → show the dashboard,
//         no redirect.
//   401 → me-routes fails closed, which happens ONLY when AUTH_ENABLED=1 and
//         the session is missing/invalid (a guest header is never the reason:
//         it is ignored rather than rejected in auth mode) → redirect to
//         /login.
//   anything else — engine down, 502/500 from the Next rewrite, no storage
//         to build a guest id, network error → show the dashboard. The probe
//         fails OPEN on purpose: an unavailable engine must never bounce the
//         demo off its own dashboard.
//
// The probe runs once, after paint, and never blocks rendering: guest mode
// therefore sees zero redirect, zero spinner and zero layout shift.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '../../components/shell/Shell';
import { meHeaders } from '../../lib/theme';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const headers = meHeaders(); // x-user-id: this browser's guest id
      if (!headers['x-user-id']) return; // no identity to test with → fail open
      try {
        const res = await fetch('/api/me', { headers, credentials: 'include' });
        if (cancelled || redirecting.current || res.status !== 401) return;
        redirecting.current = true;
        router.replace('/login');
      } catch {
        // engine unreachable → fail open (guest demo stays usable)
      }
    };
    probe();
    return () => { cancelled = true; };
  }, [router]);

  return <Shell>{children}</Shell>;
}
