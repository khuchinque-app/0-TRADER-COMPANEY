import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// Mock users database
const mockUsers: any[] = [
  { id: '1', email: 'demo@chinque.trade', password: 'demo123', name: 'Demo User', balance_usdt: 10000, balance_idr: 158500000, created_at: new Date().toISOString() },
  { id: '2', email: 'investor@test.com', password: 'investor123', name: 'Investor Test', balance_usdt: 50000, balance_idr: 792500000, created_at: new Date().toISOString() },
  { id: '3', email: 'trader@crypto.id', password: 'trader123', name: 'Crypto Trader', balance_usdt: 25000, balance_idr: 396250000, created_at: new Date().toISOString() },
];

// Generate mock JWT token
function generateMockToken(user: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ 
    sub: user.id, 
    email: user.email, 
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', 'mock-secret-key').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// GET /api/auth/me - Get current user
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  // Simple token validation (in production, verify JWT signature)
  const payload = token.split('.')[1];
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const user = mockUsers.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        balance_usdt: user.balance_usdt,
        balance_idr: user.balance_idr,
        created_at: user.created_at
      }
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// GET /api/auth/users - List all users (for admin/demo)
router.get('/users', (_req: Request, res: Response) => {
  const users = mockUsers.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    balance_usdt: u.balance_usdt,
    created_at: u.created_at
  }));
  res.json({ success: true, data: users });
});

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
  }
  
  // Check if user exists
  if (mockUsers.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  
  // Create mock user
  const newUser = {
    id: String(mockUsers.length + 1),
    email,
    password, // In production, hash this!
    name,
    balance_usdt: 1000, // Welcome bonus
    balance_idr: 15850000,
    created_at: new Date().toISOString()
  };
  
  mockUsers.push(newUser);
  const token = generateMockToken(newUser);
  
  res.json({
    success: true,
    message: 'Registration successful!',
    token,
    data: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      balance_usdt: newUser.balance_usdt,
      balance_idr: newUser.balance_idr
    }
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  
  const token = generateMockToken(user);
  
  res.json({
    success: true,
    message: 'Login successful!',
    token,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance_usdt: user.balance_usdt,
      balance_idr: user.balance_idr
    }
  });
});

// POST /api/auth/social-login
router.post('/social-login', (req: Request, res: Response) => {
  const { provider, email, name } = req.body;
  
  // Check if user exists
  let user = mockUsers.find(u => u.email === email);
  
  if (!user) {
    // Create new user from social login
    user = {
      id: String(mockUsers.length + 1),
      email,
      password: '', // Social login has no password
      name,
      balance_usdt: 1000,
      balance_idr: 15850000,
      created_at: new Date().toISOString(),
      social_provider: provider
    };
    mockUsers.push(user);
  }
  
  const token = generateMockToken(user);
  
  res.json({
    success: true,
    message: `Login with ${provider} successful!`,
    token,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance_usdt: user.balance_usdt,
      balance_idr: user.balance_idr,
      provider
    }
  });
});

export default router;
