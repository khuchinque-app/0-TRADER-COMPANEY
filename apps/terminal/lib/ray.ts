// Cloudflare Ray ID stand-in for the paper venue: real Ray IDs arrive as the
// `cf-ray` response header at the Cloudflare edge (not visible to JS). Until
// the app sits behind Cloudflare we mint a stable per-browser id and carry it
// through signup → audit rows (spec: same ray_id on every row). When the edge
// is live, replace with the first observed cf-ray value.

const KEY = 'venue.rayId';

export function getOrCreateRayId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = `ray-${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 14)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `ray-${Date.now().toString(36)}`;
  }
}
