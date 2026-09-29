// 3g: WS robustness — one bad frame must never down the venue
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import { Matcher } from '../../src/matching/matcher';
import { Ledger } from '../../src/ledger/ledger';
import { SQLiteLedgerStore } from '../../src/ledger/sqlite-store';
import { createWsServer } from '../../src/server/ws';

let httpServer: ReturnType<typeof createServer>;
let store: SQLiteLedgerStore;
let url: string;
const uncaught: unknown[] = [];
const onUncaught = (e: unknown) => uncaught.push(e);

beforeAll(async () => {
  process.on('uncaughtException', onUncaught);
  store = new SQLiteLedgerStore(':memory:');
  const ledger = new Ledger(store);
  const matcher = new Matcher();
  matcher.initPair('BTCUSDT', 50000);
  httpServer = createServer();
  createWsServer(httpServer, matcher, ledger);
  await new Promise<void>(res => httpServer.listen(0, '127.0.0.1', res));
  const port = (httpServer.address() as any).port;
  url = `ws://127.0.0.1:${port}/ws?cid=test_cid`;
});

afterAll(async () => {
  process.off('uncaughtException', onUncaught);
  await new Promise<void>(res => httpServer.close(() => res()));
  store.close();
});

function openSocket(): Promise<WebSocket> {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.on('open', () => res(ws));
    ws.on('error', rej);
  });
}

describe('3g: WS crash guard', () => {
  it('order frame without payload gets an error reply, engine survives', async () => {
    const ws = await openSocket();
    const reply = new Promise<any>((res) => {
      ws.on('message', (d) => res(JSON.parse(d.toString())));
    });

    ws.send(JSON.stringify({ type: 'order' })); // no payload at all

    const msg = await reply;
    expect(msg.type).toBe('error');
    expect(ws.readyState).toBe(WebSocket.OPEN); // still connected
    ws.close();
  });

  it('garbage JSON is ignored, connection stays open', async () => {
    const ws = await openSocket();
    ws.send('not json at all {{{');
    await new Promise(r => setTimeout(r, 100));
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('NaN quantity in JSON (null trick) is rejected with error, not a crash', async () => {
    const ws = await openSocket();
    const reply = new Promise<any>((res) => {
      ws.on('message', (d) => res(JSON.parse(d.toString())));
    });
    // JSON has no NaN literal; a string quantity must be rejected as invalid
    ws.send(JSON.stringify({
      type: 'order',
      payload: { userId: 'u1', pair: 'BTCUSDT', side: 'buy', type: 'market', price: 0, quantity: '1e999' },
    }));
    const msg = await reply;
    expect(msg.type).toBe('error');
    ws.close();
  });

  it('cancel for unknown order gets error reply (not silent, not crash)', async () => {
    const ws = await openSocket();
    const reply = new Promise<any>((res) => {
      ws.on('message', (d) => res(JSON.parse(d.toString())));
    });
    ws.send(JSON.stringify({ type: 'cancel', payload: { userId: 'u1', orderId: 'ghost' } }));
    const msg = await reply;
    expect(msg.type).toBe('error');
    ws.close();
  });

  it('happy path: order places, settles, broadcasts order+fill', async () => {
    const ws = await openSocket();
    const msgs: any[] = [];
    ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));

    ws.send(JSON.stringify({
      type: 'order',
      payload: { userId: 'ws_u1', pair: 'BTCUSDT', side: 'buy', type: 'market', price: 0, quantity: 0.01 },
    }));

    await new Promise(r => setTimeout(r, 300));
    expect(msgs.some(m => m.type === 'order')).toBe(true);
    expect(msgs.some(m => m.type === 'fill')).toBe(true);

    // Settled into the ledger: journal entry exists, balance moved
    const acct = await store.getAccount('ws_u1');
    const usdt = acct.balances.find(b => b.asset === 'USDT')!;
    expect(usdt.available).toBeLessThan(100000);
    ws.close();
  });

  it('no uncaught exceptions escaped during the abuse run', () => {
    expect(uncaught).toEqual([]);
  });
});
