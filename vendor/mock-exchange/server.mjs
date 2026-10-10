// Mock Crypto Exchange Server - Simulates a real exchange API
// For local development and testing only

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.MOCK_EXCHANGE_PORT || '11115');
const API_KEY = process.env.MOCK_EXCHANGE_API_KEY || 'mock-secret-key-for-local-dev';
const BASE_URL = process.env.MOCK_EXCHANGE_BASE_URL || `http://localhost:${PORT}`;

// Load .env if exists
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// ── Mock Data Store ────────────────────────────────────────────────────────────
const PAIRS = (process.env.MOCK_EXCHANGE_DEFAULT_PAIRS || 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,AVAXUSDT,DOTUSDT,MATICUSDT')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const PRICES = {
  BTCUSDT: parseFloat(process.env.MOCK_BTC_PRICE || '65000'),
  ETHUSDT: parseFloat(process.env.MOCK_ETH_PRICE || '3500'),
  SOLUSDT: parseFloat(process.env.MOCK_SOL_PRICE || '150'),
  BNBUSDT: parseFloat(process.env.MOCK_BNB_PRICE || '600'),
  XRPUSDT: parseFloat(process.env.MOCK_XRP_PRICE || '0.65'),
  ADAUSDT: parseFloat(process.env.MOCK_ADA_PRICE || '0.45'),
  DOGEUSDT: parseFloat(process.env.MOCK_DOGE_PRICE || '0.15'),
  AVAXUSDT: parseFloat(process.env.MOCK_AVAX_PRICE || '35'),
  DOTUSDT: parseFloat(process.env.MOCK_DOT_PRICE || '7'),
  MATICUSDT: parseFloat(process.env.MOCK_MATIC_PRICE || '0.75')
};

const USERS = [
  { id: 1, email: 'demo@example.com', password: 'password123', role: 'user' },
  { id: 2, email: 'trader@example.com', password: 'trader123', role: 'user' }
];

const SESSIONS = new Map();
const ORDERS = new Map();
const TRADES = new Map();

let tickerId = 1;
let orderId = 1;
let tradeId = 1;

// ── Express App ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/v1/ping', (req, res) => {
  res.json({ status: 'ok', service: 'mock-exchange', uptime: process.uptime() });
});

// ── Auth ───────────────────────────────────────────────────────────────────────
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = 'mock_' + crypto.randomBytes(16).toString('hex');
  SESSIONS.set(token, user);
  
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
});

app.get('/api/v1/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = SESSIONS.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({ user });
});

// ── Tickers ────────────────────────────────────────────────────────────────────
app.get('/api/v1/tickers', (req, res) => {
  const tickers = PAIRS.map(symbol => ({
    symbol,
    lastPrice: PRICES[symbol],
    volume: Math.random() * 1000000,
    change: (Math.random() - 0.5) * 10
  }));
  
  res.json({ data: tickers });
});

// ── Order Book ─────────────────────────────────────────────────────────────────
app.get('/api/v1/orderbook', (req, res) => {
  const { symbol = 'BTCUSDT', limit = 20 } = req.query;
  const price = PRICES[symbol] || 65000;
  
  const bids = Array.from({ length: limit }, (_, i) => ({
    price: +(price * (1 - (i + 1) * 0.001)).toFixed(2),
    quantity: +(Math.random() * 10).toFixed(4)
  }));
  
  const asks = Array.from({ length: limit }, (_, i) => ({
    price: +(price * (1 + (i + 1) * 0.001)).toFixed(2),
    quantity: +(Math.random() * 10).toFixed(4)
  }));
  
  res.json({ symbol, bids, asks });
});

// ── Balances ───────────────────────────────────────────────────────────────────
app.get('/api/v1/balances', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = SESSIONS.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const balances = {
    USDT: { available: +(Math.random() * 50000).toFixed(2), locked: '0.00' },
    BTC: { available: +(Math.random() * 1).toFixed(6), locked: '0.000000' },
    ETH: { available: +(Math.random() * 10).toFixed(4), locked: '0.0000' },
    SOL: { available: +(Math.random() * 100).toFixed(4), locked: '0.0000' }
  };
  
  res.json({ data: balances });
});

// ── Orders ─────────────────────────────────────────────────────────────────────
app.post('/api/v1/orders', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = SESSIONS.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { symbol, side, type, quantity, price } = req.body;
  const order = {
    id: `ord_${orderId++}`,
    symbol,
    side,
    type,
    quantity: parseFloat(quantity),
    price: price ? parseFloat(price) : PRICES[symbol],
    filled: type === 'market' ? parseFloat(quantity) : 0,
    status: type === 'market' ? 'filled' : 'open',
    createdAt: new Date().toISOString()
  };
  
  ORDERS.set(order.id, order);
  
  // Simulate trade for market orders
  if (type === 'market') {
    const trade = {
      id: `trd_${tradeId++}`,
      orderId: order.id,
      symbol,
      side,
      price: order.price,
      quantity: order.quantity,
      createdAt: new Date().toISOString()
    };
    TRADES.set(trade.id, trade);
  }
  
  res.json({ data: order });
});

app.get('/api/v1/orders', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = SESSIONS.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const orders = Array.from(ORDERS.values());
  res.json({ data: orders });
});

// ── Trades ─────────────────────────────────────────────────────────────────────
app.get('/api/v1/trades', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = SESSIONS.get(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const trades = Array.from(TRADES.values());
  res.json({ data: trades });
});

// ── Real-time ticker updates ───────────────────────────────────────────────────
setInterval(() => {
  PAIRS.forEach(symbol => {
    const current = PRICES[symbol];
    const change = (Math.random() - 0.5) * current * 0.001;
    PRICES[symbol] = +(current + change).toFixed(2);
  });
}, 1000);

// ── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Mock Exchange running on http://localhost:${PORT}`);
  console.log(`📊 Pairs: ${PAIRS.join(', ')}`);
  console.log(`👥 Users: demo@example.com / trader@example.com`);
});
