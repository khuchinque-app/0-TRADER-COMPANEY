// HTTP-level idempotency coverage for /api/orders and /api/quick/execute —
// the gap both review lanes flagged (the 126-test suite never touched these
// routes over HTTP). Locks the per-user cacheKey fix:
//   (a) same user + same Idempotency-Key -> cached 201 + Idempotent-Replay
//   (b) different users + same key -> independent executions (no cross-account
//       replay of A's payload to B — the data leak the fix removes)
//   (c) Idempotency-Key charset gate ([\w:-], '|'-forbidden) so the composite
//       cacheKey can't be forged into another user's bucket
//   (d) rejected requests are NOT cached — retry with the same key after a fix
// Guest mode (AUTH_ENABLED unset) — identity is the body userId, which is
// exactly where the bucket-isolation semantics live.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { Matcher } from '../../src/matching/matcher';
import { Ledger } from '../../src/ledger/ledger';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { createOrderEntryRouter } from '../../src/server/orders';
import { createQuickRouter } from '../../src/server/quick';

describe('E2E HTTP: per-user idempotency on /api/orders + /api/quick/execute', () => {
  let store: SQLiteLedgerStore;
  let ledger: Ledger;
  let matcher: Matcher;
  let server: Server;
  let base: string;

  beforeAll(async () => {
    store = new SQLiteLedgerStore(':memory:');
    ledger = new Ledger(store);
    matcher = new Matcher({
      getBalance: (userId, asset) => ledger.getBalanceSync(userId, asset),
    });
    matcher.initPair('BTCUSDT', 50000);
    const app = express();
    app.use(express.json());
    const noop = () => {};
    app.use(createOrderEntryRouter({ matcher, ledger, broadcast: noop, audit: vi.fn() }));
    app.use(createQuickRouter({ matcher, ledger, broadcast: noop, audit: vi.fn() }));
    server = app.listen(0);
    await new Promise<void>((r) => server.once('listening', () => r()));
    const port = (server.address() as { port: number }).port;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.close();
    store.close();
  });

  const post = (path: string, body: unknown, key?: string) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
      body: JSON.stringify(body),
    });

  const orderBody = (userId: string) => ({
    userId, pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 49000, quantity: 0.001,
  });
  const quickBody = (userId: string) => ({
    userId, pair: 'BTCUSDT', side: 'buy', quoteAmount: 50,
  });

  it('(a) same user, same key -> replayed cached 201 with Idempotent-Replay', async () => {
    const first = await post('/api/orders', orderBody('alice_a'), 'key-a-1');
    expect(first.status).toBe(201);
    const firstJson: any = await first.json();
    expect(firstJson.simulasi).toBe(true);

    const replay = await post('/api/orders', orderBody('alice_a'), 'key-a-1');
    expect(replay.status).toBe(201);
    expect(replay.headers.get('idempotent-replay')).toBe('true');
    const replayJson = await replay.json();
    expect(replayJson).toEqual(firstJson);
  });

  it('(b) different users, same key -> independent executions (no leak)', async () => {
    const a = await post('/api/quick/execute', quickBody('user_alpha'), 'key-shared');
    expect(a.status).toBe(201);
    const aJson: any = await a.json();

    const b = await post('/api/quick/execute', quickBody('user_beta'), 'key-shared');
    expect(b.status).toBe(201);
    // Fresh execution for B: no replay header, B's own order payload.
    expect(b.headers.get('idempotent-replay')).toBeNull();
    const bJson: any = await b.json();
    expect(bJson.order.userId).toBe('user_beta');
    expect(bJson).not.toEqual(aJson);
  });

  it('(c) key charset gate: forged "|"/spaces/long keys rejected 400', async () => {
    const pipe = await post('/api/orders', orderBody('alice_c'), 'evil|x');
    expect(pipe.status).toBe(400);
    const space = await post('/api/orders', orderBody('alice_c'), 'has space');
    expect(space.status).toBe(400);
    const long = await post('/api/orders', orderBody('alice_c'), 'k'.repeat(201));
    expect(long.status).toBe(400);
    const ok = await post('/api/orders', orderBody('alice_c'), 'ok_key:1-a');
    expect(ok.status).toBe(201);
  });

  it('(d) missing key -> 400 and never cached; retry with fixed key succeeds', async () => {
    const noKey = await post('/api/quick/execute', quickBody('alice_d'));
    expect(noKey.status).toBe(400);
    const withKey = await post('/api/quick/execute', quickBody('alice_d'), 'key-d-1');
    expect(withKey.status).toBe(201);
  });

  it('(d2) rejected execution is not cached: same key retryable after fix', async () => {
    const bad = await post('/api/orders', { ...orderBody('alice_e'), quantity: -5 }, 'key-e-1');
    expect(bad.status).toBe(400);
    const fixed = await post('/api/orders', orderBody('alice_e'), 'key-e-1');
    expect(fixed.status).toBe(201);
    expect(fixed.headers.get('idempotent-replay')).toBeNull();
  });
});
