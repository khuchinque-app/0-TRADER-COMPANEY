"use strict";
/**
 * rate-limiter.ts — client-side politeness limiter.
 *
 * The target service is a public demo endpoint: discovery and normal use must stay
 * at or below 1 request/second (mandate: "Max 1 request per second"). This limiter
 * serialises callers so a concurrent burst can never exceed that, and it honours a
 * server-supplied cool-down (Retry-After) by pushing the next slot out.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    minIntervalMs;
    now;
    sleepFn;
    nextAvailableAt = 0;
    tail = Promise.resolve();
    _waits = 0;
    _waitedMs = 0;
    constructor(opts = {}) {
        this.minIntervalMs = Math.max(0, opts.minIntervalMs ?? 1000);
        this.now = opts.now ?? (() => Date.now());
        this.sleepFn = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    }
    /** Number of times a caller had to wait, and total ms waited (for tests/metrics). */
    get stats() {
        return { waits: this._waits, waitedMs: this._waitedMs };
    }
    /** Block until the next request slot is free. Serialised across concurrent callers. */
    acquire() {
        const run = this.tail.then(() => this.slot());
        // keep the chain alive even if slot() rejects
        this.tail = run.catch(() => undefined);
        return run;
    }
    /** Push every future request out by at least `ms` (used for Retry-After / 429). */
    cooldown(ms) {
        if (ms > 0)
            this.nextAvailableAt = Math.max(this.nextAvailableAt, this.now() + ms);
    }
    async slot() {
        const t = this.now();
        const wait = this.nextAvailableAt - t;
        if (wait > 0) {
            this._waits += 1;
            this._waitedMs += wait;
            await this.sleepFn(wait);
        }
        this.nextAvailableAt = Math.max(this.nextAvailableAt, this.now()) + this.minIntervalMs;
    }
}
exports.RateLimiter = RateLimiter;
