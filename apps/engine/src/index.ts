// Engine bootstrap — wires feed → matcher → ledger → server
// This is the entry point for the paper-trading venue backend

import express from 'express';
import { createServer } from 'http';
import { Matcher } from './matching/matcher';
import { BinanceFeed } from './feed/binance';
import { Ledger } from './ledger/ledger';
import { SQLiteLedgerStore } from './ledger/sqlite-store';
import { GuestAccountManager } from './accounts';
import { createRestServer } from './server/rest';
import { createWsServer } from './server/ws';
import { AuthService, consoleOtpProvider } from './auth/service';
import { createAuthRouter, devTurnstile } from './server/auth-routes';
import { createMeRouter } from './server/me-routes';
import { createStakingRouter } from './server/staking';
import { createAiRouter } from './server/ai';
import { createOrderEntryRouter } from './server/orders';
import { createWalletRouter } from './server/wallet';
import { createQuickRouter } from './server/quick';
import { registerAuthService } from './server/auth';
import { ENGINE_PORT, type TickEvent } from '@trading/shared';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Initialize components — persistent file DB (survives tsx-watch reloads;
  // ':memory:' wiped the ledger on every hot reload)
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  const store = new SQLiteLedgerStore(path.join(__dirname, '..', 'data', 'ledger.db'));
  const ledger = new Ledger(store);
  // Buying-power gate: matcher consults the ledger before accepting orders
  // (overspend/oversell rejected). ws.ts auto-inits the demo account before
  // placeOrder, so balances always exist at gate time.
  const matcher = new Matcher({
    getBalance: (userId, asset) => ledger.getBalanceSync(userId, asset),
  });
  const feed = new BinanceFeed();
  const guestAccounts = new GuestAccountManager(ledger);

  // Set up default pairs with current prices
  const DEFAULT_PRICES: Record<string, number> = {
    'BTCUSDT': 65000,
    'ETHUSDT': 3500,
    'SOLUSDT': 145,
    'BNBUSDT': 600,
    'XRPUSDT': 0.62,
    'LINKUSDT': 18,
    'AAVEUSDT': 180,
  };

  for (const [pair, price] of Object.entries(DEFAULT_PRICES)) {
    matcher.initPair(pair as any, price);
  }

  // Ledger mark-to-market: the store holds no feed, so inject the matcher's
  // mid prices as the USDT price oracle used by `totalValueUsdt`.
  store.setPriceOracle((asset) => matcher.getMidPrice(`${asset}USDT` as any));

  // Wire feed to matcher (update synthetic book mid prices) + broadcast to clients
  feed.onTick((event: TickEvent) => {
    const pair = event.symbol.replace('/', '') as any; // Binance uses BTC/USDT format
    // Update matcher's mid price for this pair
    matcher.updateMid(pair, event.price);
    // Push live market data to terminals (ticker + trade stream)
    const broadcast = (wss as any).broadcast;
    if (broadcast) {
      broadcast({
        type: 'ticker',
        payload: {
          symbol: pair,
          price: event.price,
          timestamp: event.timestamp,
        },
      });
      broadcast({
        type: 'trade',
        payload: {
          symbol: pair,
          price: event.price,
          quantity: event.quantity,
          side: event.isBuyerMaker ? 'sell' : 'buy',
          timestamp: event.timestamp,
        },
      });
    }
  });

  // HTTP server
  const app = express();
  const httpServer = createServer(app);

  // Auth journey routes (public per spec D: /api/auth/* is unauthenticated).
  // Shares the ledger SQLite file handle — same DB, same audit ray lineage.
  // AUTH_SESSION_SECRET keeps JWTs valid across restarts/hot-reloads;
  // unset falls back to a per-boot random secret (dev).
  const authService = new AuthService(
    store.dbHandle, consoleOtpProvider, process.env.AUTH_SESSION_SECRET,
  );
  registerAuthService(authService); // money routes resolve real JWTs via this
  app.use(createAuthRouter(authService, devTurnstile));
  // Profile & Setting + Dark Mode (spec C): /api/me, /api/me/preferences
  app.use(createMeRouter(authService));

  // REST API
  const restApp = createRestServer(matcher, ledger, feed);
  app.use('/', restApp);

  // WebSocket server
  const wss = createWsServer(httpServer, matcher, ledger);

  // Wallet REST (spec map: Wallet → /api/wallet/*) + order entry.
  // Spec D: every ledger mutation writes an audit_log row (ray_id null —
  // wallet calls arrive without an auth-ray context in guest mode).
  app.use(createWalletRouter({
    ledger,
    audit: (userId, event, detail) => authService.audit(null, userId, event, detail),
  }));
  app.use(createOrderEntryRouter({
    matcher,
    ledger,
    broadcast: (msg) => (wss as any).broadcast?.(msg),
    // spec D: order events write an audit row and must carry the caller's ray.
    // mockAuth resolves it from the verified session into req.rayId; guest
    // mode has no session, so the ray is null there (same as the wallet rows).
    audit: (rayId, userId, event, detail) => authService.audit(rayId, userId, event, detail),
  }));
  app.use(createQuickRouter({
    matcher,
    ledger,
    broadcast: (msg) => (wss as any).broadcast?.(msg),
    audit: (rayId, userId, event, detail) => authService.audit(rayId, userId, event, detail),
  }));
  // Staking (spec C: Staking → /api/staking/*)
  app.use(createStakingRouter({
    ledger,
    db: store.dbHandle,
    audit: (userId, event, detail) => authService.audit(null, userId, event, detail),
  }));
  // Invest in AI (spec C: Invest in AI → /api/ai/*)
  app.use(createAiRouter({
    ledger,
    db: store.dbHandle,
    audit: (userId, event, detail) => authService.audit(null, userId, event, detail),
  }));

  // Bind host: default stays loopback (local dev safety); deploys that must be
  // reachable online set ENGINE_HOST=0.0.0.0 (e.g. VPS demo on :22220).
  const ENGINE_HOST = process.env.ENGINE_HOST || '127.0.0.1';
  httpServer.listen(ENGINE_PORT, ENGINE_HOST, () => {
    console.log(`Engine listening on http://${ENGINE_HOST}:${ENGINE_PORT}`);
    console.log(`REST API: http://${ENGINE_HOST}:${ENGINE_PORT}/api`);
    console.log(`WebSocket: ws://${ENGINE_HOST}:${ENGINE_PORT}/ws`);
    console.log('');
    console.log('Demo accounts: use any userId (e.g., "guest1", "user1")');
    console.log('Guest accounts auto-created on first login.');
  });

  // Graceful shutdown (SIGINT + SIGTERM — pm2/systemd send SIGTERM)
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received. Shutting down...`);

    // Force-exit if drain hangs (open WS keep-alive sockets)
    const forceTimer = setTimeout(() => {
      console.warn('Shutdown timed out — forcing exit.');
      process.exit(0);
    }, 5_000);
    forceTimer.unref();

    try { feed.close(); } catch { /* already closed */ }
    try { store.close(); } catch { /* already closed */ }
    // Close WS server and terminate lingering clients so http closes
    for (const client of wss.clients) client.terminate();
    wss.close();
    httpServer.close(() => {
      console.log('Engine stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start engine:', err);
  process.exit(1);
});
