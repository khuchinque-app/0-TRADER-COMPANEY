// T9: REST Server - API endpoints for the terminal
// Provides: /api/market/<pair>, /api/ledger/<account>, /api/fx
// CORS-enabled for localhost:3000

import express from 'express';
import type { Matcher } from '../matching/matcher';
import type { Ledger } from '../ledger/ledger';
import type { FeedAdapter } from '../feed/feed';
import { fxProvider } from '../feed/fx';
import { ENGINE_PORT, PAIRS } from '@trading/shared';
import { mockAuth, AUTH_ENABLED } from './auth';

// Whitelist of pairs the venue trades (uppercase, e.g. BTCUSDT)
const PAIR_SET = new Set<string>(PAIRS as readonly string[]);

// Ticket 03 (2026-09-26 sweep): per-userId READS leaked other users' open
// orders, fills, balances and journals with no auth at all. Identity rule
// mirrors wallet.ts/orders.ts: guest mode (AUTH_ENABLED=0) stays open —
// that's the demo venue contract — but when auth is ON, the session wins
// and must match the :userId in the path. Routes WITHOUT a userId are
// market data (public by spec D's allowlist intent) and are unaffected.
function ownedBySession(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (AUTH_ENABLED) {
    const uid = (req as any).userId;
    const wanted = (req.params as any).userId;
    if (wanted !== undefined && uid !== wanted) {
      res.status(403).json({ error: 'userId does not match session', simulasi: true });
      return;
    }
  }
  next();
}

export function createRestServer(
  matcher: Matcher,
  ledger: Ledger,
  feed: FeedAdapter
): express.Express {
  const app = express();

  // CORS headers for terminal on :3000
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // X-Simulasi rides on money-touching reads — expose it so cross-origin
    // clients (terminal on another origin) can actually observe the badge.
    res.setHeader('Access-Control-Expose-Headers', 'X-Simulasi');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  // All-pair ticker snapshot (tape / watchlist / gainers — one round trip)
  app.get('/api/tickers', (_req, res) => {
    const out: Record<string, unknown> = {};
    for (const p of PAIRS) {
      const t = (feed as any).getTicker?.(p) || null;
      out[p] = t || {
        // Synthesize from synthetic-book mid so the tape is never blank pre-cache
        symbol: p,
        lastPrice: matcher.getMidPrice?.(p as any) ?? 0,
        priceChange: 0, priceChangePercent: 0,
        highPrice: 0, lowPrice: 0, volume: 0, quoteVolume: 0,
        timestamp: Date.now(),
      };
    }
    res.json(out);
  });

  // Market snapshot: book + ticker + klines
  app.get('/api/market/:pair', (req, res) => {
    const rawPair = req.params.pair;
    const pair = String(rawPair).toUpperCase().replace('/', '');

    if (!PAIR_SET.has(pair)) {
      return res.status(404).json({ error: `Unknown pair: ${rawPair}` });
    }

    const book = matcher.getOrderBook(pair as any);
    const recentFills = matcher.getRecentFills(20);

    // Get ticker from feed cache or REST API
    const ticker = (feed as any).getTicker?.(pair) || null;
    const klines = (feed as any).getKlines?.(pair) || [];

    res.json({
      pair,
      book,
      ticker,
      klines: klines.slice(-100),
      recentFills,
    });
  });

  // Open orders for a user (from live matcher book).
  // spec D gap: SIMULASI badge on this read. The payload is a BARE ARRAY (the
  // terminal does r.json() and iterates it), so — exactly like the journal
  // read below — the badge rides the X-Simulasi header instead of reshaping
  // the body.
  app.get('/api/orders/:userId', mockAuth, ownedBySession, (req, res) => {
    res.set('X-Simulasi', 'true');
    res.json(matcher.getOpenOrders(req.params.userId));
  });

  // Recent fills — GET /api/fills or /api/fills/:userId (spec: /api/fills)
  // Ticket 03: with auth ON, the no-param form returns only the CALLER's
  // fills (there is no admin role in a paper venue).
  app.get('/api/fills/:userId?', mockAuth, (req, res, next) => {
    if (AUTH_ENABLED && req.params.userId === undefined) {
      (req as any).params = { ...req.params, userId: (req as any).userId };
    }
    ownedBySession(req, res, next);
  }, (req, res) => {
    const recent = matcher.getRecentFills(100);
    const uid = req.params.userId;
    res.json({ simulasi: true, fills: uid ? recent.filter(f => f.userId === uid) : recent });
  });

  // Ledger state for a user — auto-creates the demo account on first login
  app.get('/api/ledger/:userId', mockAuth, ownedBySession, async (req, res) => {
    try {
      let account;
      try {
        account = await ledger.getAccount(req.params.userId);
      } catch (e) {
        if (!(e as Error).message.startsWith('Account not found')) throw e;
        await ledger.initializeDemoAccount(req.params.userId);
        account = await ledger.getAccount(req.params.userId);
      }
      // spec D gap: SIMULASI badge on the ledger read — object payload takes
      // the field (same shape wallet.ts uses), header for a uniform read.
      res.set('X-Simulasi', 'true');
      res.json({ ...account, simulasi: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.startsWith('Account not found') ? 404 : 500;
      res.status(status).json({ error: status === 404 ? msg : 'Internal error' });
      if (status === 500) console.error('[REST] ledger error:', msg);
    }
  });

  // Journal history
  app.get('/api/ledger/:userId/journal', mockAuth, ownedBySession, async (req, res) => {
    try {
      const journal = await ledger.getJournal(req.params.userId, 50);
      // SIMULASI badge without breaking the bare-array response shape.
      res.set('X-Simulasi', 'true');
      res.json(journal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.startsWith('Account not found') ? 404 : 500;
      res.status(status).json({ error: status === 404 ? msg : 'Internal error' });
      if (status === 500) console.error('[REST] journal error:', msg);
    }
  });

  // FX rate (USD/IDR) — served by the FX provider, matches FxResponse contract
  app.get('/api/fx', async (_req, res) => {
    try {
      const rate = await fxProvider.fetchRate();
      if (!Number.isFinite(rate) || rate <= 0) {
        return res.status(503).json({ error: 'FX rate unavailable' });
      }
      res.json({ rate: { usdToIdr: rate, fetchedAt: Date.now() } });
    } catch (_e) {
      res.status(503).json({ error: 'FX fetch failed' });
    }
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  return app;
}
