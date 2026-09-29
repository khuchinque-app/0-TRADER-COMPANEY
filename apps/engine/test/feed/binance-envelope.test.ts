// Deterministic feed test: combined-stream frames must reach subscribers.
// Regression: onmessage checked data.e on the RAW frame, but the combined
// /stream endpoint wraps events as {stream, data:{...}} — no tick ever
// fired, and the matcher's book froze at seed prices while the REST ticker
// kept moving (the two-price UI bug).
import { describe, it, expect, vi } from 'vitest';

class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 1; // OPEN
  constructor(public url: string) { FakeSocket.instances.push(this); }
  close() { this.readyState = 3; }
  ping() {}
}

vi.mock('ws', async (importOriginal) => {
  const orig = await importOriginal<typeof import('ws')>();
  return {
    ...orig,
    WebSocket: function (url: string) { return new FakeSocket(url); },
  };
});

import { BinanceFeed } from '../../src/feed/binance';
import type { TickEvent } from '@trading/shared';

describe('BinanceFeed WS envelope', () => {
  it('dispatches trades from COMBINED-STREAM wrapped frames', async () => {
    const feed = new BinanceFeed();
    const events: TickEvent[] = [];
    const unsub = feed.onTick(e => events.push(e));

    const sock = FakeSocket.instances[FakeSocket.instances.length - 1];
    expect(sock, 'onTick must open a socket').toBeTruthy();

    // The exact shape stream.binance.com:9443/stream?streams=btcusdt@trade sends
    sock.onmessage?.({
      data: JSON.stringify({
        stream: 'btcusdt@trade',
        data: {
          e: 'trade', E: Date.now(), s: 'BTCUSDT', p: '84512.30',
          q: '0.01', T: Date.now(), m: false,
        },
      }),
    });

    expect(events.length).toBe(1);
    expect(events[0].symbol).toBe('BTCUSDT');
    expect(events[0].price).toBe(84512.30);
    expect(events[0].isBuyerMaker).toBe(false);

    // Raw (non-wrapped) frames must also still work (defensive)
    sock.onmessage?.({
      data: JSON.stringify({
        e: 'trade', E: Date.now() + 1000, s: 'BTCUSDT', p: '84513.00',
        q: '0.02', m: true,
      }),
    });
    expect(events.length).toBe(2);
    expect(events[1].price).toBe(84513.00);

    // Out-of-order tick (older E) must be dropped
    sock.onmessage?.({
      data: JSON.stringify({
        stream: 'btcusdt@trade',
        data: { e: 'trade', E: Date.now() - 5000, s: 'BTCUSDT', p: '1.00', q: '1', m: false },
      }),
    });
    expect(events.length).toBe(2);

    unsub();
    feed.close();
  });
});
