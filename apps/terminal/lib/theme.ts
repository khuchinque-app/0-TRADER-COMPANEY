// Theme preferences client (spec C: Dark Mode -> PATCH /api/me/preferences).
// Server is the source of truth; the DOM attribute is a projection of it.
// In guest mode the engine accepts an x-user-id header (AUTH_ENABLED=0).

import { getOrCreateUserId } from './ids';

export type Theme = 'dark' | 'light';

export interface Preferences {
  theme: Theme;
  color_convention: 'green-up' | 'red-up';
  display_currency: string;
}

/** Identity header for engine calls: guests send their localStorage id,
 *  signed-in users rely on the session cookie (server ignores the header
 *  once a valid session is present). */
export function meHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  try { h['x-user-id'] = getOrCreateUserId(); } catch { /* SSR / no storage */ }
  if (json) h['content-type'] = 'application/json';
  return h;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export async function fetchPreferences(): Promise<Preferences | null> {
  try {
    const res = await fetch('/api/me/preferences', { headers: meHeaders(), credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveTheme(theme: Theme): Promise<Preferences | null> {
  try {
    const res = await fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: meHeaders(true),
      credentials: 'include',
      body: JSON.stringify({ theme }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
