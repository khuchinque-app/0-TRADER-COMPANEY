// Backend API Server — Controls frontend (port 22220)
// This is the new backend service running on port 11110

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createFrontendControlRouter } from './routes/frontend-control';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 11110;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route — structured JSON response
app.get('/', (_req, res) => {
  res.json({
    service: 'Trading System API & Control Center',
    version: '1.0.0',
    status: 'online',
    health: '/health',
    apiStatus: '/api/status',
    frontendControl: '/api/frontend',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'trading-backend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/frontend', createFrontendControlRouter());
app.use('/api/admin', adminRouter);

// Status endpoint
app.get('/api/status', (_req, res) => {
  res.json({
    backend: { port: 11110, status: 'running' },
    frontend: { port: 22220, status: 'running' },
    static: { port: 2217, status: 'running' },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend API running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Status: http://localhost:${PORT}/api/status`);
});

export default app;
