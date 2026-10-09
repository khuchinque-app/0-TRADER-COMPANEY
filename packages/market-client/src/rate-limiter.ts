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

export class RateLimiter {
  readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private nextAvailableAt = 0;
  private tail: Promise<void> = Promise.resolve();
  private _waits = 0;
  private _waitedMs = 0;

  constructor(opts: RateLimiterOptions = {}) {
    this.minIntervalMs = Math.max(0, opts.minIntervalMs ?? 1000);
    this.now = opts.now ?? (() => Date.now());
    this.sleepFn = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  }

  /** Number of times a caller had to wait, and total ms waited (for tests/metrics). */
  get stats(): { waits: number; waitedMs: number } {
    return { waits: this._waits, waitedMs: this._waitedMs };
  }

  /** Block until the next request slot is free. Serialised across concurrent callers. */
  acquire(): Promise<void> {
    const run = this.tail.then(() => this.slot());
    // keep the chain alive even if slot() rejects
    this.tail = run.catch(() => undefined);
    return run;
  }

  /** Push every future request out by at least `ms` (used for Retry-After / 429). */
  cooldown(ms: number): void {
    if (ms > 0) this.nextAvailableAt = Math.max(this.nextAvailableAt, this.now() + ms);
  }

  private async slot(): Promise<void> {
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
