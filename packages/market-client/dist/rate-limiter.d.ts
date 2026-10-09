/**
 * rate-limiter.ts — client-side politeness limiter.
 *
 * The target service is a public demo endpoint: discovery and normal use must stay
 * at or below 1 request/second (mandate: "Max 1 request per second"). This limiter
 * serialises callers so a concurrent burst can never exceed that, and it honours a
 * server-supplied cool-down (Retry-After) by pushing the next slot out.
 */
export interface RateLimiterOptions {
    /** Minimum gap between the *starts* of two requests. 1000 => 1 req/s. */
    minIntervalMs?: number;
    /** Injectable clock/sleep so tests do not actually wait. */
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
}
export declare class RateLimiter {
    readonly minIntervalMs: number;
    private readonly now;
    private readonly sleepFn;
    private nextAvailableAt;
    private tail;
    private _waits;
    private _waitedMs;
    constructor(opts?: RateLimiterOptions);
    /** Number of times a caller had to wait, and total ms waited (for tests/metrics). */
    get stats(): {
        waits: number;
        waitedMs: number;
    };
    /** Block until the next request slot is free. Serialised across concurrent callers. */
    acquire(): Promise<void>;
    /** Push every future request out by at least `ms` (used for Retry-After / 429). */
    cooldown(ms: number): void;
    private slot;
}
