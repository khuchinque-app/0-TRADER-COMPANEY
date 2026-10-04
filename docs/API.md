# API Documentation

## Base URLs
- Backend: http://localhost:11110
- Terminal: http://localhost:22220 (proxies to backend)

## Auth Endpoints

### POST /api/auth/signup
Create a new user account.

**Request:**
```json
{
  \"email\": \"user@example.com\",
  \"password\": \"SecurePass123!\"
}
```

**Response:**
```json
{
  \"userId\": \"01acf9fe69a32f91\",
  \"simulasi\": true
}
```

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  \"email\": \"chinque@dev.local\",
  \"password\": \"TestTrader2026!\"
}
```

**Response:**
```json
{
  \"ok\": true,
  \"userId\": \"01acf9fe69a32f91\",
  \"rayId\": \"ray-75d3b8cbcfb86099\",
  \"redirect\": \"/dashboard\",
  \"simulasi\": true,
  \"token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"
}
```

### GET /api/auth/me
Get current user profile (requires JWT).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  \"id\": \"01acf9fe69a32f91\",
  \"email\": \"chinque@dev.local\",
  \"phone\": null,
  \"phone_verified\": 1,
  \"status\": \"active\",
  \"ray_id\": \"ray-75d3b8cbcfb86099\",
  \"simulasi\": true
}
```

## Markets Endpoint

### GET /api/markets
Get list of available trading pairs.

**Response:**
```json
{
  \"markets\": [
    {
      \"symbol\": \"BTCUSDT\",
      \"baseAsset\": \"BTC\",
      \"quoteAsset\": \"USDT\",
      \"status\": \"trading\",
      \"price\": \"0.00\",
      \"source\": \"sim\",
      \"simulasi\": true
    }
  ],
  \"simulasi\": true
}
```

## Admin Endpoint

### GET /api/admin/stats
Get platform statistics.

**Response:**
```json
{
  \"users\": 21,
  \"orders\": 12,
  \"simulasi\": true
}
```

## Health Endpoint

### GET /health
Check backend health.

**Response:**
```json
{
  "status": "ok",
  "service": "trading-backend",
  "port": "11110",
  "timestamp": "2026-10-03T19:58:27.716Z"
}
```

## FX Endpoints

### GET /api/fx
Legacy USD/IDR rate (open.er-api.com fallback).

**Response:**
```json
{
  "rate": {
    "usdToIdr": 15000,
    "fetchedAt": 1728000000000
  }
}
```

### GET /api/fx/usdt-idr
Indodax USDT/IDR ticker rate for display toggle. Reference only, not a real venue.

**Response:**
```json
{
  "rate": 15000.50,
  "source": "indodax",
  "ts": 1728000000000,
  "stale": false
}
```

**Fields:**
- `rate`: Current USDT/IDR rate from Indodax
- `source`: "indodax" or "fallback"
- `ts`: Timestamp of last successful fetch (ms)
- `stale`: true if serving cached rate past TTL
