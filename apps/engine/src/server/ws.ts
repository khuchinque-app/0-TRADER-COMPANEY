// T10: WebSocket Server - Bidirectional stream with reliability
// - Heartbeat/ping-pong to detect dead connections
// - Sequence numbers for ordered delivery
// - Per-client replay buffer
// - Reconnect replay from lastSeq (URL param or 'resume' message)
// - Per-client message serialization (no interleaved handler races)

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { Matcher } from '../matching/matcher';
import type { Ledger } from '../ledger/ledger';
import type { Order, Fill } from '@trading/shared';
import type { WsOutboundType, WsInboundType } from '@trading/shared';
import { authenticateWs } from './auth';

// Message types — outbound `type` is pinned to the shared contract union
// (packages/shared/src/api.ts): a new outbound type that is not declared
// there fails at compile time instead of drifting silently. Inbound frames
// are parsed into the same shape and switch on WsInboundType.
type WsAnyType = WsOutboundType | WsInboundType;
export interface WsMessage {
  type: WsAnyType;
  seq?: number;           // optional sequence for ack
  payload?: any;
}

// Envelope for at-least-once delivery
interface Envelope {
  type: string;
  seq: number;
  payload: any;
}

// ws sockets get an isAlive flag for the heartbeat ping/pong dance
type TrackedSocket = WebSocket & { isAlive: boolean };

// Client metadata
interface ClientInfo {
  ws: TrackedSocket;
  lastSeq: number;
  clientId: string;
  connectedAt: number;
  /** Tail of this client's handler chain — serializes async handling */
  chain: Promise<void>;
  /** Verified handshake identity (tickets 01/02); null in guest mode. */
  identity: string | null;
}

const HEARTBEAT_INTERVAL_MS = 20_000;     // 20s ping (safely under 60s LB timeout)
const REPLAY_BUFFER_SIZE = 500;           // keep last N messages per client

export function createWsServer(httpServer: HttpServer, matcher: Matcher, ledger: Ledger): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Track clients by ID (survives reconnects)
  const clients = new Map<string, ClientInfo>();

  // Per-client replay buffers
  const replayBuffers = new Map<string, Envelope[]>();

  // Global sequence counter
  let globalSeq = 0;

  // Heartbeat to detect stale connections
  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((raw) => {
      const ws = raw as TrackedSocket;
      if (!ws.isAlive) {
        ws.terminate(); // Kill stale connection
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', (raw, req) => {
    const ws = raw as TrackedSocket;
    // Extract or generate client ID from query params.
    // Tickets 01/02 (2026-09-26 sweep): identity comes from the handshake
    // credential (JWT bearer / session cookie / ?token= for browsers), NOT
    // from the payload. cid is namespaced per verified user so a stranger
    // cannot take over someone else's session or replay buffer by guessing
    // ?cid=. Guest mode (AUTH_ENABLED=0) keeps today's open demo behavior.
    const url = new URL(req.url!, 'http://localhost');
    const identity = authenticateWs(req.headers as any, url.searchParams.get('token') ?? undefined);
    if (identity === null) {
      try { ws.send(JSON.stringify({ type: 'error', payload: { message: 'auth required for websocket' } })); } catch { /* died */ }
      ws.close(4401, 'auth required');
      return;
    }
    const rawCid = url.searchParams.get('cid') || generateClientId();
    // Length-prefixed namespace: 'a|b' + 'c' can never collide with 'a' + 'b|c'
    const clientId = identity ? `${identity.length}:${identity}|${rawCid}` : rawCid;
    const claimedLastSeq = Number(url.searchParams.get('lastSeq')) || 0;

    // Mark alive and track
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Get or create client info
    const existing = clients.get(clientId);
    if (existing) {
      // Ticket 01: takeover must come from the SAME verified identity —
      // a stranger cannot close a live user's socket by guessing ?cid=.
      // (clientId is already namespaced by identity in auth mode, so a
      // mismatch can only happen with the '|'-containing spoofing attempt
      // or a changed credential; refused with an error frame + close 4403.)
      const newIdentity = identity ?? null;
      if (existing.identity !== null && existing.identity !== newIdentity) {
        try { ws.send(JSON.stringify({ type: 'error', payload: { message: 'client id belongs to another session' } })); } catch { /* died */ }
        ws.close(4403, 'foreign cid');
        return;
      }
      // Reconnect (or takeover): the OLD socket's close handler must not
      // evict this new registration — it checks identity before deleting.
      const oldWs = existing.ws;
      if (oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close(4000, 'Replaced'); // Custom code: replaced by new connection
      }
      existing.ws = ws;
      existing.connectedAt = Date.now();
      existing.chain = Promise.resolve();
      existing.lastSeq = claimedLastSeq;
      existing.identity = identity ?? null;
    } else {
      clients.set(clientId, {
        ws,
        lastSeq: claimedLastSeq,
        clientId,
        connectedAt: Date.now(),
        chain: Promise.resolve(),
        identity: identity ?? null,
      });
      replayBuffers.set(clientId, []);
    }

    console.log(`[WS] Client ${clientId} connected. Total: ${clients.size}`);

    // Reconnect: replay missed messages
    const clientInfo = clients.get(clientId)!;
    if (clientInfo.lastSeq > 0) {
      const buffer = replayBuffers.get(clientId) ?? [];
      const missed = buffer.filter(e => e.seq > clientInfo.lastSeq);

      if (missed.length > 0) {
        console.log(`[WS] Replaying ${missed.length} missed messages for ${clientId}`);
        // Send snapshot first
        sendDirect(ws, { type: 'snapshot', payload: buildSnapshot(matcher) });
        // Then replay missed events (direct: replays must NOT re-buffer)
        for (const env of missed) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(env));
        }
      }
    }

    ws.on('message', (data, isBinary) => {
      if (isBinary) return;

      let msg: WsMessage & { seq?: number };
      try {
        msg = JSON.parse(data.toString()) as WsMessage & { seq?: number };
      } catch {
        sendError(ws, 'Invalid JSON');
        return;
      }

      const info = clients.get(clientId);
      if (!info || info.ws !== ws) return; // stale socket

      // Serialize handling per client: chain each message's async work so a
      // second 'order'/'cancel' cannot interleave into the first's awaits.
      info.chain = info.chain.then(() =>
        handleInboundMessage(msg, ws, clientId)
      ).catch((e) => {
        // Never let a handler rejection kill the process or stall the chain
        console.error('[WS] Handler error:', e instanceof Error ? e.message : e);
        sendError(ws, e instanceof Error ? e.message : 'Internal error');
      });

      // Ack receipt of client-sent seq frames
      if (msg.seq !== undefined && typeof msg.seq === 'number') {
        try {
          ws.send(JSON.stringify({ type: 'ack', seq: msg.seq }));
        } catch { /* socket may be closing */ }
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Client ${clientId} closed (${code}): ${reason.toString()}`);
      // Only evict state if THIS socket is still the registered one —
      // otherwise we'd delete the replacement client (eviction race).
      const current = clients.get(clientId);
      if (current && current.ws === ws) {
        clients.delete(clientId);
        replayBuffers.delete(clientId);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client ${clientId} error:`, err.message);
      const current = clients.get(clientId);
      if (current && current.ws === ws) {
        clients.delete(clientId);
        replayBuffers.delete(clientId);
      }
    });
  });

  // Helper: send envelope with sequence tracking (live traffic only)
  function sendEnvelope(ws: TrackedSocket, env: Envelope): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(env));

    const clientId = getClientIdForWs(ws);
    if (!clientId) return;

    // Add to replay buffer
    let buffer = replayBuffers.get(clientId);
    if (!buffer) {
      buffer = [];
      replayBuffers.set(clientId, buffer);
    }
    buffer.push(env);
    if (buffer.length > REPLAY_BUFFER_SIZE) {
      buffer = buffer.slice(buffer.length - REPLAY_BUFFER_SIZE);
      replayBuffers.set(clientId, buffer);
    }
  }

  // Helper: send message with auto-sequence
  function send(ws: TrackedSocket, message: WsMessage): void {
    const env: Envelope = {
      type: message.type,
      seq: ++globalSeq,
      payload: message.payload,
    };
    sendEnvelope(ws, env);
  }

  // Helper: send WITHOUT buffering (used for snapshot on reconnect)
  function sendDirect(ws: TrackedSocket, message: WsMessage): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: message.type, seq: ++globalSeq, payload: message.payload }));
  }

  // Helper: error frame that never throws back into the caller
  function sendError(ws: TrackedSocket, message: string): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', payload: { message } }));
      }
    } catch { /* socket died */ }
  }

  // Helper: broadcast to all clients
  function broadcast(message: WsMessage): void {
    const env: Envelope = {
      type: message.type,
      seq: ++globalSeq,
      payload: message.payload,
    };

    for (const [, clientInfo] of clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        sendEnvelope(clientInfo.ws, env);
      }
    }
  }

  // Helper: build snapshot for replay
  function buildSnapshot(m: Matcher): any {
    const pairs = m.getPairs();
    return {
      pairs: pairs.map((p: string) => ({
        symbol: p,
        midPrice: m.getMidPrice(p as any) ?? 0,
      })),
    };
  }

  // Helper: get client ID for WebSocket
  function getClientIdForWs(ws: TrackedSocket): string | null {
    for (const [id, info] of clients) {
      if (info.ws === ws) return id;
    }
    return null;
  }

  // Helper: generate unique client ID
  function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async function handleInboundMessage(msg: WsMessage, ws: TrackedSocket, clientId: string): Promise<void> {
    // Ticket 02: identity from the handshake — payload.userId must match it
    // when auth is on (mirrors orders.ts session-match). Guest mode: payload
    // identity stays trusted (demo venue contract).
    const identity = clients.get(clientId)?.identity ?? null;
    const assertSelf = (userId: unknown): boolean => {
      if (identity !== null && String(userId ?? '') !== identity) {
        sendError(ws, 'userId does not match session');
        return false;
      }
      return true;
    };
    switch (msg.type) {
      case 'order': {
        const payload = msg.payload ?? {};
        const { userId, pair, side, type, price, quantity } = payload;

        if (!userId || !pair || !side || !type || typeof quantity !== 'number' || !Number.isFinite(quantity)) {
          sendError(ws, 'Missing or invalid required fields');
          return;
        }
        if (!assertSelf(userId)) return;
        if (typeof price !== 'number' || !Number.isFinite(price)) {
          sendError(ws, 'price must be a finite number');
          return;
        }

        try {
          // Auto-create demo account on first order (per engine design)
          await ledger.initializeDemoAccount(String(userId));

          const order = matcher.placeOrder(String(userId), pair, side, type, price, quantity);

          // Settle every order that moved: taker + maker legs, one txn
          const batch = matcher.drainPendingSettlements();
          try {
            await ledger.settleBatch(batch);
          } catch (e) {
            // Settlement failure must reach the ordering client, not just logs
            sendError(ws, `Settlement failed: ${(e as Error).message}`);
            console.error('[WS] Settlement failed:', (e as Error).message);
          }

          // Broadcast settled activity to all clients
          for (const { order: o, fills } of batch) {
            broadcast({ type: 'order', payload: o });
            for (const f of fills) {
              broadcast({ type: 'fill', payload: f });
            }
          }
        } catch (e) {
          sendError(ws, e instanceof Error ? e.message : 'Order rejected');
        }
        break;
      }

      case 'cancel': {
        const payload = msg.payload ?? {};
        const { orderId, userId } = payload;
        if (!userId || !orderId) {
          sendError(ws, 'cancel requires userId and orderId');
          return;
        }
        if (!assertSelf(userId)) return;

        const order = matcher.cancelOrder(String(userId), String(orderId));

        if (order) {
          // Persist the cancelled snapshot (guarded: can be a settlement race)
          try {
            await ledger.recordOrder(order);
          } catch (e) {
            console.error('[WS] Cancel persist failed:', (e as Error).message);
          }
          broadcast({
            type: 'cancel_ack',
            payload: order,
          });
        } else {
          sendError(ws, 'Order not found, not yours, or already settled');
        }
        break;
      }

      case 'resume': {
        // Client requesting replay
        const lastSeq = msg.payload?.lastSeq;
        if (typeof lastSeq === 'number' && lastSeq > 0) {
          const info = clients.get(clientId);
          if (!info) return;
          info.lastSeq = lastSeq;

          const buffer = replayBuffers.get(clientId) ?? [];
          const missed = buffer.filter(e => e.seq > lastSeq);

          sendDirect(ws, {
            type: 'replay',
            payload: {
              messages: missed,
              nextSeq: globalSeq + 1,
            },
          });
        }
        break;
      }

      case 'ping': {
        sendDirect(ws, { type: 'pong', payload: { serverSeq: globalSeq } });
        break;
      }

      default:
        sendError(ws, `Unknown message type: ${msg.type}`);
    }
  }

  // Export for engine to use (market-data broadcasts from the feed wiring)
  (wss as any).broadcast = broadcast;
  (wss as any).getClients = () => clients;
  (wss as any).send = send;

  return wss;
}
