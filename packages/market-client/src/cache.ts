/**
 * cache.ts — tiny TTL cache.
 *
 * The upstream service already caches internally (2.5s tickers, 1s depth, 5s klines),
 * so the client only needs a short-lived local cache to avoid re-hitting it when the
 * same sub-resource is requested repeatedly (e.g. a polling UI). Entries are keyed by
 * full request URL, so params are part of the identity.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T = unknown> {
  private store = new Map<string, Entry<T>>();
  private readonly now: () => number;
  private _hits = 0;
  private _misses = 0;

  constructor(opts: { now?: () => number } = {}) {
    this.now = opts.now ?? (() => Date.now());
  }

  get stats(): { size: number; hits: number; misses: number } {
    return { size: this.store.size, hits: this._hits, misses: this._misses };
  }

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) {
      this._misses += 1;
      return undefined;
    }
    if (e.expiresAt <= this.now()) {
      this.store.delete(key);
      this._misses += 1;
      return undefined;
    }
    this._hits += 1;
    return e.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  /** Delete expired entries; returns how many were evicted. */
  prune(): number {
    const t = this.now();
    let n = 0;
    for (const [k, e] of this.store) {
      if (e.expiresAt <= t) {
        this.store.delete(k);
        n += 1;
      }
    }
    return n;
  }

  clear(): void {
    this.store.clear();
    this._hits = 0;
    this._misses = 0;
  }
}
