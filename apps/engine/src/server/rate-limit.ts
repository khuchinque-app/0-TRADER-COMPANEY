// spec D — rate limiting. ONE in-memory token-bucket implementation for the
// whole engine: /api/auth already had a per-IP bucket; spec D asks for
// per-USER AND per-IP limits on the order routes and the wallet withdraw, so
// that exact mechanism is generalized here instead of growing a second copy
// (auth-routes.ts now imports it too).
//
// Semantics:
//   - a request is checked against every configured dimension (user, ip) and
//     drained only when ALL of them have a token: the check is atomic, so a
//     rejected request never partially consumes a quota
//   - buckets are namespaced per route family ('auth' | 'order' | 'withdraw'),
//     so draining the order quota cannot starve withdraw or auth traffic
//   - caps/refill are read from env PER REQUEST: runtime-tunable and easy to
//     pin from tests without module reloading
// Caveats (documented, same posture as the idempotency Maps): in-memory, lost
// on restart; an hourly sweep keeps every map bounded.

import type { Request, Response, NextFunction } from 'express';

type Bucket = { tokens: number; last: number };
type Store = Map<string, Bucket>;

export interface RateDimension {
  /** sub-namespace inside the family — 'user' and 'ip' hold separate quotas */
  name: string;
  /** identity for this dimension; null/undefined skips it (nothing to key on) */
  key: (req: Request) => string | null | undefined;
  /** env var holding the burst cap, e.g. RATE_LIMIT_USER_BURST */
  burstEnv: string;
  defaultBurst: number;
}

export interface RateLimiterOptions {
  /** route family: 'auth' | 'order' | 'withdraw' (one shared store each) */
  namespace: string;
  /** env var holding the refill interval in ms (tokens gained per interval) */
  refillEnv: string;
  defaultRefillMs: number;
  dimensions: RateDimension[];
  /** merged into the 429 body — money routes add the SIMULASI badge */
  extraBody?: Record<string, unknown>;
}

/** namespace -> bucket store. Registered lazily, swept hourly. */
const stores = new Map<string, Store>();

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function createRateLimiter(
  opts: RateLimiterOptions
): (req: Request, res: Response, next: NextFunction) => void {
  let store = stores.get(opts.namespace);
  if (!store) {
    store = new Map<string, Bucket>();
    stores.set(opts.namespace, store);
  }
  const buckets = store;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const refillMs = envInt(opts.refillEnv, opts.defaultRefillMs);
    const passed: Bucket[] = [];
    for (const dim of opts.dimensions) {
      const id = dim.key(req);
      if (id === null || id === undefined || id === '') continue;
      const burst = envInt(dim.burstEnv, dim.defaultBurst);
      const k = `${opts.namespace}|${dim.name}|${id}`;
      let b = buckets.get(k);
      if (!b) { b = { tokens: burst, last: now }; buckets.set(k, b); }
      b.tokens = Math.min(burst, b.tokens + (now - b.last) / refillMs);
      b.last = now;
      if (b.tokens < 1) {
        res.status(429).json({
          error: 'rate_limited',
          message: 'Too many requests — slow down',
          ...opts.extraBody,
        });
        return; // atomic: nothing drained below gets rolled back — we drain only on full pass
      }
      passed.push(b);
    }
    for (const b of passed) b.tokens -= 1;
    next();
  };
}

/**
 * Per-IP dimension. req.ip is the socket address unless the app enables
 * `trust proxy`, in which case X-Forwarded-For supplies the client address.
 */
export function ipKey(req: Request): string | null {
  return req.ip ?? 'unknown';
}

/**
 * Per-user dimension. Session identity first (mockAuth's verified `sub` —
 * unspoofable), then whatever user the transport declares. Guest mode keys on
 * the client-declared userId: that is spoofable by design (guest IS a demo
 * identity), so the per-IP dimension is the backstop there.
 */
export function userKey(req: Request): string | null {
  const session = (req as any).userId;
  if (typeof session === 'string' && session) return session;
  const fromBody = (req.body as any)?.userId;
  if (typeof fromBody === 'string' && fromBody) return fromBody;
  const fromParam = (req.params as any)?.userId;
  if (typeof fromParam === 'string' && fromParam) return fromParam;
  return null;
}

/** Drop buckets nobody has touched for an hour (they are fully refilled anyway). */
const sweepTimer = setInterval(() => {
  const cutoff = Date.now() - 60 * 60_000;
  for (const store of stores.values()) {
    for (const [k, b] of store) if (b.last < cutoff) store.delete(k);
  }
}, 60 * 60_000);
sweepTimer.unref();

/** Test seam: wipe every bucket without re-importing the module graph. */
export function resetRateLimiters(): void {
  for (const store of stores.values()) store.clear();
}
