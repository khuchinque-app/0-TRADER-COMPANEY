# WebSocket Reliability Solution

## Problem
- Engine crashes = all connections die, no recovery
- No heartbeat → proxies kill idle connections after 30-60s
- Messages lost during disconnects have no replay
- Client reconnects get stale state

## Solution Architecture

### 1. PM2 Process Manager
- Auto-restart on crash
- Auto-restart on machine boot
- Log rotation and monitoring
- Zero-downtime restarts

### 2. Enhanced WebSocket Server (`ws.ts`)

**Heartbeat:**
- Ping every 20s (safe under 60s LB timeout)
- Kill stale connections that miss 2 pongs

**Reconnection & Replay:**
- Clients connect with `?cid=client_id&lastSeq=0`
- Server maintains per-client replay buffer (last 500 messages)
- On reconnect, server replays missed messages since lastSeq

**At-Least-Once Delivery:**
- Every message gets a monotonically increasing sequence number
- Client tracks `lastSeq` and requests replay on reconnect
- Optional: add ACK/resend for critical messages

**Client Eviction:**
- Same client ID reconnecting replaces old connection
- Old connection closed with custom code 4000

### 3. WS Client (`ws-client.ts`)

**Exponential Backoff with Jitter:**
```typescript
reconnectDelay = 1s → 2s → 4s → ... → max 30s
addRandomJitter() // prevents thundering herd
```

**State Tracking:**
- Tracks last sequence number
- Requests replay on reconnect with `lastSeq`

## Key Patterns Used

| Pattern | Purpose |
|---------|---------|
| Heartbeat | Keep connection alive through LBs |
| Sequence Numbers | Order messages, detect gaps |
| Replay Buffer | Reconnect recovery (bounded memory) |
| Exponential Backoff | Prevent thundering herd on reconnect |
| Stable Client ID | Match reconnect to existing session |
| Client Eviction | Replace stale connections cleanly |

## Production Checklist

- [x] Heartbeat/ping-pong every 20s
- [x] Exponential backoff with jitter
- [x] Replay buffer (500 messages)
- [x] Sequence numbers for ordering
- [x] Graceful shutdown
- [ ] Add Redis for multi-node (next step)
- [ ] Add ACK/resend for critical orders
- [ ] Add metrics (connections, msgs/sec)
- [ ] Log rotation with pm2-logrotate

## PM2 Commands

```bash
# Start engine
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs engine

# Save startup script
pm2 save
pm2 startup  # auto-start on boot
```
