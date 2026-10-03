// Frontend Control Routes
// These routes control the frontend on port 22220

import { Router } from 'express';

const router = Router();

// Get frontend status
router.get('/status', (_req, res) => {
  res.json({
    frontend: {
      port: 22220,
      status: 'active',
      uptime: 'running',
      last_check: new Date().toISOString()
    }
  });
});

// Restart frontend
router.post('/restart', (_req, res) => {
  res.json({
    message: 'Frontend restart requested',
    command: 'pm2 restart terminal'
  });
});

// Stop frontend
router.post('/stop', (_req, res) => {
  res.json({
    message: 'Frontend stop requested',
    command: 'pm2 stop terminal'
  });
});

// Start frontend
router.post('/start', (_req, res) => {
  res.json({
    message: 'Frontend start requested',
    command: 'pm2 start terminal'
  });
});

export const createFrontendControlRouter = () => router;
