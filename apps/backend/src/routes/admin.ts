import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

const router = Router();
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "../../../apps/engine/data/ledger.db");

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

// GET /api/admin/stats
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const balancesCount = db.prepare('SELECT COUNT(*) as count FROM balances').get() as { count: number };
    const journalCount = db.prepare('SELECT COUNT(*) as count FROM journal').get() as { count: number };

    res.json({
      users: usersCount.count,
      orders: ordersCount.count,
      balances: balancesCount.count,
      journalEntries: journalCount.count
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', (_req: Request, res: Response) => {
  try {
    const users = db.prepare(
      'SELECT id, email, phone, phone_verified, status, created_at FROM users ORDER BY created_at DESC LIMIT 100'
    ).all() as Array<{
      id: string;
      email: string;
      phone: string | null;
      phone_verified: number;
      status: string;
      created_at: number;
    }>;

    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/reset
router.post('/reset', (_req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM fills').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare("DELETE FROM journal WHERE action NOT IN ('deposit', 'withdrawal', 'transfer')").run();

    res.json({
      message: 'Test environment reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin reset error:', error);
    res.status(500).json({ error: 'Failed to reset environment' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'pending', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      userId: id,
      status
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;
