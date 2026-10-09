/**
 * cache.ts — tiny TTL cache.
 *
 * The upstream service already caches internally (2.5s tickers, 1s depth, 5s klines),
 * so the client only needs a short-lived local cache to avoid re-hitting it when the
 * same sub-resource is requested repeatedly (e.g. a polling UI). Entries are keyed by
 * full request URL, so params are part of the identity.
 */
export declare class TtlCache<T = unknown> {
    private store;
    private readonly now;
    private _hits;
    private _misses;
    constructor(opts?: {
        now?: () => number;
    });
    get stats(): {
        size: number;
        hits: number;
        misses: number;
    };
    get(key: string): T | undefined;
    set(key: string, value: T, ttlMs: number): void;
    /** Delete expired entries; returns how many were evicted. */
    prune(): number;
    clear(): void;
}
