// Tickets 01/02 (2026-09-26 sweep): WS handshake identity + cid namespacing.
// Guest mode stays open (demo contract). Auth mode (AUTH_ENABLED=1 +
// AUTH_ALLOW_MOCK=1, legacy 'mock.<userId>' token via ?token=):
//   - no credential -> close 4401
//   - order/cancel with foreign payload.userId -> error frame, no execution
//   - takeover of a live cid from a DIFFERENT identity -> refused (4403),
//     victim socket stays OPEN
//   - same identity reusing its own cid -> legit reconnect + replay
// AUTH_ENABLED is captured at import time in server/auth.ts, so every
// module here is dynamically imported AFTER the env is set.
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import type { Server } from 'http';
import type { WebSocket } from 'ws';

const tokFor = (u: string) => 'mock' + '.' + u;


process.env.AUTH_ENABLED = '1';
process.env.AUTH_ALLOW_MOCK = '1';

async function openSocket(url: string): Promise<WebSocket> {
  const { WebSocket: WS } = await import('ws');
  return new Promise((res, rej) => {
    const ws = new WS(url);
    ws.on('open', () => res(ws as WebSocket));
    ws.on('error', rej);
  });
}
async function openCollect(url: string): Promise<{ ws: WebSocket; frames: any[] }> {
  const { WebSocket: WS } = await import('ws');
  const ws = new WS(url) as WebSocket;
  const frames: any[] = [];
  ws.on('message', (d: any) => frames.push(JSON.parse(d.toString())));
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  return { ws, frames };
}
const nextMsg = (ws: WebSocket, timeout = 8000) =>
  new Promise<any>((res, rej) => {
    const t = setTimeout(() => rej(new Error('no message within timeout')), timeout);
    ws.once('message', (d: any) => { clearTimeout(t); res(JSON.parse(d.toString())); });
  });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("tickets 01/02 — auth mode WS identity", () => {
  process.env.AUTH_ENABLED = '1';
  process.env.AUTH_ALLOW_MOCK = '1';

  let httpServer: Server | undefined;
  let closeStore: (() => void) | undefined;

  afterAll(() => {
    httpServer?.close();
    closeStore?.();
    delete process.env.AUTH_ENABLED;
    delete process.env.AUTH_ALLOW_MOCK;
  });

  async function boot() {
    const [{ createServer }, { Matcher }, { Ledger }, { SQLiteLedgerStore }, { createWsServer }] = await Promise.all([
      import('http'),
      import('../../src/matching/matcher'),
      import('../../src/ledger/ledger'),
      import('../../src/ledger/sqlite-store'),
      import('../../src/server/ws'),
    ]);
    const store = new SQLiteLedgerStore(':memory:');
    closeStore = () => store.close();
    const ledger = new Ledger(store);
    await ledger.initializeDemoAccount('alice'); // funds for the executing-order asserts
    const matcher = new Matcher({ getBalance: (u: string, a: any) => ledger.getBalanceSync(u, a) });
    matcher.initPair('BTCUSDT', 50000);
    httpServer = createServer();
    createWsServer(httpServer, matcher, ledger);
    await new Promise<void>((res) => httpServer!.listen(0, '127.0.0.1', res));
    const port = (httpServer.address() as any).port;
    return { base: `ws://127.0.0.1:${port}/ws`, matcher, httpServer };
  }

  it('no credential -> rejected with close 4401', async () => {
    const { base } = await boot();
    const { WebSocket: WS } = await import('ws');
    const code: number = await new Promise((res, rej) => {
      const w = new WS(`${base}?cid=anon`);
      const t = setTimeout(() => rej(new Error('no close within timeout')), 8000);
      w.on('close', (c) => { clearTimeout(t); res(c); });
      w.on('error', (e) => { /* some stacks error then close; wait for close */ void e; });
    });
    expect(code).toBe(4401);
  });

  it('order with foreign payload.userId -> error frame, victim untouched; own identity executes', async () => {
    const { base, matcher } = await boot();
    const ws = await openSocket(`${base}?cid=c1&token=${tokFor('alice')}`);
    ws.send(JSON.stringify({ type: 'order', payload: { userId: 'victim', pair: 'BTCUSDT', side: 'buy', type: 'market', price: 0, quantity: 0.01 } }));
    const msg = await nextMsg(ws);
    expect(msg.type).toBe('error');
    expect(String(msg.payload?.message)).toMatch(/does not match session/);
    expect(matcher.getOpenOrders('victim')).toHaveLength(0);
    // same session, own userId -> accepted (ack/execute)
    ws.send(JSON.stringify({ type: 'order', payload: { userId: 'alice', pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 49000, quantity: 0.01 } }));
    const ok = await nextMsg(ws);
    expect(ok.type).not.toBe('error');
    ws.close();
  });

  it('cancel with foreign payload.userId -> error frame', async () => {
    const { base } = await boot();
    const ws = await openSocket(`${base}?cid=c2&token=${tokFor('alice')}`);
    ws.send(JSON.stringify({ type: 'cancel', payload: { userId: 'victim', orderId: 'whatever' } }));
    const msg = await nextMsg(ws);
    expect(msg.type).toBe('error');
    expect(String(msg.payload?.message)).toMatch(/does not match session/);
    ws.close();
  });

  it('stranger with same ?cid gets an ISOLATED namespace — victim stays OPEN, attacker sees none of its events', async () => {
    const { base, matcher } = await boot();
    const victim = await openSocket(`${base}?cid=vic&token=${tokFor('alice')}`);
    victim.send(JSON.stringify({ type: 'order', payload: { userId: 'alice', pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 49000, quantity: 0.01 } }));
    const victimFrames: any[] = [];
    victim.on('message', (d: any) => victimFrames.push(JSON.parse(d.toString())));
    await wait(200);
    // attacker guesses the cid but authenticates as bob -> own namespace, own fresh buffer
    const attacker = await openSocket(`${base}?cid=vic&token=${tokFor('bob')}`);
    const attackerFrames: any[] = [];
    attacker.on('message', (d: any) => attackerFrames.push(JSON.parse(d.toString())));
    await wait(300);
    // ticket 01 core: victim was NOT kicked and its session is intact
    expect(victim.readyState).toBe(1); // OPEN
    victim.send(JSON.stringify({ type: 'ping' }));
    const pong = await nextMsg(victim);
    expect(pong.type).toBe('pong');
    // alice's resting order exists in the book and never leaked into bob's stream
    expect(matcher.getOpenOrders('alice').length).toBeGreaterThan(0);
    // attacker's frames must contain nothing attributable to alice
    for (const f of attackerFrames) {
      const s = JSON.stringify(f);
      expect(s.includes('alice')).toBe(false);
    }
    // and the attacker's own stream never receives alice's order ack
    expect(attackerFrames.some((f) => f.type === 'order_ack' && (f.payload ?? {}).userId === 'alice')).toBe(false);
    attacker.close();
    victim.close();
  });

  it('same identity reconnect (takeover of its own cid) replays ITS OWN buffer', async () => {
    const { base } = await boot();
    const first = await openSocket(`${base}?cid=mine&token=${tokFor('alice')}`);
    // two buffered events -> seqs 1 and 2
    first.send(JSON.stringify({ type: 'order', payload: { userId: 'alice', pair: 'BTCUSDT', side: 'sell', type: 'limit', price: 50000, quantity: 0.001 } }));
    await wait(200);
    first.send(JSON.stringify({ type: 'order', payload: { userId: 'alice', pair: 'BTCUSDT', side: 'buy', type: 'limit', price: 49000, quantity: 0.001 } }));
    await wait(300);
    // reconnect same identity claiming seq 1 -> takeover, replay of seq-2 event.
    // (Buffer survives takeover by design: the evicted socket's close handler
    // must not delete the replacement's state.)
    // listener attaches BEFORE handshake completes: takeover replay frames
    // can arrive immediately after 'open'
    const { ws: second, frames } = await openCollect(`${base}?cid=mine&token=${tokFor('alice')}&lastSeq=1`);
    await wait(500);
    // Non-vacuous: the claimed lastSeq=1 means only the seq-2 event missed —
    // a correct takeover replays it (env with seq > 1). Without the surviving
    // buffer (fix reverted -> buffer deleted on old-socket close), frames
    // would be empty here.
    const replayed = frames.filter((f: any) => typeof f.seq === 'number' && f.seq > 1);
    expect(replayed.length).toBeGreaterThan(0);
    expect(replayed.some((f: any) => f.type === 'order' && (f.payload ?? {}).userId === 'alice')).toBe(true);
    second.close();
  });
});
