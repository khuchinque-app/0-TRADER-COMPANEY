# INDODAX — Whole Structure: Files & Folders

> Source package: `indodax-tokocrypto-info.zip` → folder `TRADING-COMPANEY/` (flat, hosted via `server.py` on port 5011)
> Files below are the ones belonging to INDODAX.

```
TRADING-COMPANEY/
├── README.md                          ← index + executive summary (mentions both exchanges)
├── 01-indodax-overview.md             ← INDODAX company profile, history, metrics
├── 02-indodax-tech-stack.md           ← INDODAX technology stack analysis
├── 05-comparative-analysis.md         ← side-by-side (INDODAX vs Tokocrypto)
├── 06-indonesia-market-overview.md    ← market context (mentions INDODAX)
├── 07-api-documentation-reference.md  ← API docs (INDODAX section)
└── server.py                          ← static file host, port 5011
```

## INDODAX External Resources (structure beyond the package)

```
indodax.com
├── https://indodax.com                         ← main site
├── Trade API v2.0                              ← updated trading API (Aug 2026)
├── Public REST API                             ← market data endpoints
├── Private REST API                            ← trading & account management
├── WebSocket APIs                              ← real-time market + private streams
├── DAX Rewards                                 ← gamification feature (Aug 2026)
└── Mobile apps
    ├── iOS    → App Store ID 1349104693
    └── Android → id.co.bitcoin (Google Play)

GitHub
└── github.com/btcid
    └── indodax-official-api-docs               ← 173 stars, 123 forks, 226 commits

Social / Company
├── LinkedIn → linkedin.com/company/indodax/
└── Email formats → @bitcoin.co.id (90%), @indodax.com (21/68/6/5% variants)

Partners
├── DigiAsia Corp   → fiat transfer services (announced Jun 4, 2025)
└── Chainalysis     → Crypto Compliance (transaction monitoring, AML/KYC)
```

## INDODAX API Endpoints (from docs)

```
REST (api.indodax.com)
├── Public
│   ├── GET /api/ticker/{pair}                ← ticker prices
│   ├── GET /api/depth/{pair}                 ← order book
│   ├── GET /api/trade/{pair}                 ← recent trades
│   ├── GET /api/candles/{pair}               ← OHLCV candlestick data
│   └── GET /api/summaries                    ← all market summaries
└── Private (HMAC-SHA512 signed, API key)
    ├── POST /api/getInfo                     ← balances & account info
    ├── POST /api/trade                       ← place order (buy/sell)
    ├── POST /api/cancelOrder                 ← cancel order
    ├── POST /api/orderHistory                ← order history
    ├── POST /api/tradeHistory                ← trade history
    ├── POST /api/withdrawCoin                ← crypto withdrawal
    └── POST /api/depositAddress              ← deposit address

WebSocket
├── Public stream  → market data (tickers, orderbook, trades)
└── Private stream → account updates (auth required)
```

## Data Snapshot (what the structure contains)

| Item | Detail |
|------|--------|
| Founded | 2014 (originally Bitcoin.co.id) |
| HQ | Jakarta, Indonesia — privately held |
| License | OJK regulated; Bappebti registered; Chainalysis integrated |
| Scale | 500K+ users, 500+ coins, ~740–842 employees |
| Financials | Revenue est. $250M–$500M; total funding $1.1M |
| Security event | Sep 2024 breach (~$20M stolen) → recovered, security upgraded |
| Leadership | Founder Oscar Darmawan; CEO William Sutanto (May 2025) |
