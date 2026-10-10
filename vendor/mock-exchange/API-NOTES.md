# Mock Exchange API Notes (Port 11115)

## Base URL
`http://localhost:11115/api/v1`

## Authentication
Demo users with fixed credentials:
| Email | Password |
|-------|----------|
| demo@example.com | password123 |
| trader@example.com | trader123 |

Login returns JWT-style token (prefix `mock_`). Use in Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Health
```
GET /api/v1/ping
```
Returns: `{"status":"ok","service":"mock-exchange","uptime":N}`

### Tickers
```
GET /api/v1/tickers
```
Returns array of all trading pairs with current prices.

### Order Book
```
GET /api/v1/orderbook?symbol=BTCUSDT&limit=20
```
Returns bid/ask levels with simulated depth.

### Balances (Auth Required)
```
GET /api/v1/balances
Authorization: Bearer <token>
```
Returns USDT, BTC, ETH, SOL balances.

### Place Order (Auth Required)
```
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "side": "buy",
  "type": "market",
  "quantity": 0.001
}
```

Returns order with id, status (open/filled), filled quantity.

### Trade History (Auth Required)
```
GET /api/v1/trades
Authorization: Bearer <token>
```
Returns executed trades.

## Features
- Real-time ticker updates (1s interval)
- In-memory data (resets on restart)
- No persistence (use for testing only)
