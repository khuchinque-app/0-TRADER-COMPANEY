// T6: SQLite Store - LedgerStore seam #2
// Uses Node.js 26 built-in node:sqlite (DatabaseSync)
// Postgres-compatible schema per ADR 0001

import * as path from 'path';
import type { LedgerStore } from './store';
import type { JournalEntry, DemoAccount, Balance, Position, Order, Fill, Asset } from '@trading/shared';
import { ASSET_SHORTLIST } from '@trading/shared';

// Node 26 has built-in sqlite via 'node:sqlite'
// The API uses DatabaseSync
const sqliteModule = require('node:sqlite');

export class SQLiteLedgerStore implements LedgerStore {
  private db: any;
  private schemaPath: string;
  private priceOracle?: (asset: Asset) => number | undefined;

  constructor(dbPath: string = ':memory:', schemaPath?: string) {
    this.schemaPath = schemaPath || path.join(__dirname, 'schema.sql');
    this.db = new sqliteModule.DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode=WAL');
    this.db.exec('PRAGMA foreign_keys=ON');
    
    // Initialize schema
    const fs = require('fs');
    const schema = fs.readFileSync(this.schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  async getAccount(userId: string): Promise<DemoAccount> {
    const account = this.db.prepare(
      'SELECT id, user_id, name, created_at, updated_at FROM accounts WHERE user_id = ?'
    ).get(userId) as any;

    if (!account) {
      throw new Error(`Account not found: ${userId}`);
    }

    const balances = this.db.prepare(
      'SELECT asset, available, locked FROM balances WHERE account_id = ?'
    ).all(account.id) as Balance[];

    const positions = this.db.prepare(`
      SELECT
        pair,
        SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) as quantity,
        AVG(price) as avgEntryPrice
      FROM fills
      WHERE user_id = ? AND quantity > 0
      GROUP BY pair
    `).all(userId) as Position[];

    const totalValueUsdt = this.calculateTotalValue(balances, positions);

    return {
      userId,
      balances,
      positions,
      totalValueUsdt,
    };
  }

  async getAccountId(userId: string): Promise<string> {
    const account = this.db.prepare(
      'SELECT id FROM accounts WHERE user_id = ?'
    ).get(userId) as { id: string } | undefined;

    if (!account) {
      throw new Error(`Account not found: ${userId}`);
    }

    return account.id;
  }

  /**
   * Inject a USDT mark-price source (asset -> price). The store holds no feed
   * of its own, so main() wires this to the matcher's live mid prices.
   */
  setPriceOracle(fn: (asset: Asset) => number | undefined): void {
    this.priceOracle = fn;
  }

  /** True if a journal entry id already exists (settlement watermark). */
  hasJournal(id: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM journal WHERE id = ?').get(id);
  }

  /**
   * Synchronous available-balance read for the matcher's buying-power gate
   * (node:sqlite is sync under the hood; 0 when account/asset unknown).
   */
  getBalanceSync(userId: string, asset: string): number {
    const row = this.db.prepare(`
      SELECT b.available FROM balances b
      JOIN accounts a ON b.account_id = a.id
      WHERE a.user_id = ? AND b.asset = ?
    `).get(userId, asset) as { available: number } | undefined;
    return row ? row.available : 0;
  }

  async post(entry: JournalEntry, opts?: { ignoreDuplicate?: boolean }): Promise<'posted' | 'duplicate'> {
    if (opts?.ignoreDuplicate) {
      const exists = this.db.prepare('SELECT 1 FROM journal WHERE id = ?').get(entry.id);
      if (exists) return 'duplicate';
    }
    // Nested-safe: ledger.transaction wraps outer txn; plain post self-wraps
    if (this.txnDepth > 0) {
      this.postInner(entry);
      return 'posted';
    }
    this.db.exec('BEGIN');
    try {
      this.postInner(entry);
      this.db.exec('COMMIT');
      return 'posted';
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  private postInner(entry: JournalEntry): void {
    // Insert journal header
    this.db.prepare(
      'INSERT INTO journal (id, timestamp, description, created_at) VALUES (?, ?, ?, ?)'
    ).run(entry.id, entry.timestamp, entry.description, Date.now());

    // Insert journal lines — entry_type comes from the SIDE the line was
    // posted on (debits array = increase, credits array = decrease).
    // NEVER infer it from the amount's sign: a positive-amount credit line
    // was being stored as a 'debit' and ADDED to balances.
    for (const line of entry.debits) {
      this.db.prepare(
        'INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)'
      ).run(entry.id, line.accountId, line.asset, Math.abs(line.amount), 'debit');
    }
    for (const line of entry.credits) {
      this.db.prepare(
        'INSERT INTO journal_lines (journal_id, account_id, asset, amount, entry_type) VALUES (?, ?, ?, ?, ?)'
      ).run(entry.id, line.accountId, line.asset, Math.abs(line.amount), 'credit');
    }

    // Update balances
    this.reconcileBalances(entry.id);
  }

  /**
   * Reentrant transaction: synchronous bodies only (all store methods are
   * sync under node:sqlite); depth counter lets nested ledger helpers share
   * one BEGIN/COMMIT.
   */
  private txnDepth = 0;
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.txnDepth > 0) {
      this.txnDepth++;
      try {
        return await fn();
      } finally {
        this.txnDepth--;
      }
    }
    this.db.exec('BEGIN');
    this.txnDepth++;
    try {
      const result = await fn();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.txnDepth--;
    }
  }

  async deleteAccountData(userId: string): Promise<void> {
    const account = this.db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: string } | undefined;
    if (!account) return;
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM journal_lines WHERE account_id = ?').run(account.id);
      this.db.prepare('DELETE FROM balances WHERE account_id = ?').run(account.id);
      this.db.prepare('DELETE FROM fills WHERE user_id = ?').run(userId);
      this.db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId);
      // journal rows not referenced by any remaining line
      this.db.prepare('DELETE FROM journal WHERE id NOT IN (SELECT DISTINCT journal_id FROM journal_lines)').run();
      this.db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  async getJournal(userId: string, limit: number = 100): Promise<JournalEntry[]> {
    // DISTINCT: one row PER ENTRY, not per journal line (the plain join
    // fanned every 2-line entry out twice, double-counting downstream).
    const entries = this.db.prepare(`
      SELECT DISTINCT j.id, j.timestamp, j.description, j.created_at
      FROM journal j
      JOIN journal_lines jl ON j.id = jl.journal_id
      JOIN accounts a ON jl.account_id = a.id
      WHERE a.user_id = ?
      ORDER BY j.timestamp DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return Promise.all(entries.map((row) => {
      const lines = this.db.prepare(
        'SELECT account_id, asset, amount, entry_type FROM journal_lines WHERE journal_id = ?'
      ).all(row.id) as any[];

      const debits = lines.filter(l => l.entry_type === 'debit').map(l => ({
        accountId: l.account_id,
        asset: l.asset,
        amount: Math.abs(l.amount),
      }));

      const credits = lines.filter(l => l.entry_type === 'credit').map(l => ({
        accountId: l.account_id,
        asset: l.asset,
        amount: Math.abs(l.amount),
      }));

      return {
        id: row.id,
        timestamp: row.timestamp,
        description: row.description,
        debits,
        credits,
      };
    }));
  }

  /**
   * Create a new account with optional initial funds
   * Returns the account's internal ID for use in journal entries
   */
  async createAccount(userId: string, initialFunds: Record<string, number> = {}): Promise<string> {
    let accountId: string;
    
    this.db.exec('BEGIN');
    try {
      // Create account
      const now = Date.now();
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO accounts (id, user_id, name, created_at, updated_at)
        VALUES (lower(hex(randomblob(4))), ?, ?, ?, ?)
      `);
      
      stmt.run(userId, `User ${userId}`, now, now);
      
      // Get the created account's ID
      const account = this.db.prepare(
        'SELECT id FROM accounts WHERE user_id = ?'
      ).get(userId) as { id: string };
      accountId = account.id;

      // Guarantee a balances row per tradeable asset (double-entry UPDATE needs rows)
      for (const asset of ['USDT', ...ASSET_SHORTLIST]) {
        this.db.prepare(`
          INSERT OR IGNORE INTO balances (account_id, asset, available, locked)
          VALUES (?, ?, 0, 0)
        `).run(accountId, asset);
      }
      // Override with explicit initial funds if provided
      if (Object.keys(initialFunds).length > 0) {
        for (const [asset, amount] of Object.entries(initialFunds)) {
          this.db.prepare(`
            INSERT OR REPLACE INTO balances (account_id, asset, available, locked)
            VALUES (?, ?, ?, 0)
          `).run(accountId, asset, amount);
        }
      }
      
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    
    return accountId;
  }

  async persistOrder(order: Order): Promise<void> {
    this.db.prepare(`
      INSERT INTO orders (id, user_id, pair, side, type, price, quantity, filled_quantity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        filled_quantity = excluded.filled_quantity,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(order.id, order.userId, order.pair, order.side, order.type, order.price,
          order.quantity, order.filledQuantity, order.status, order.createdAt, order.updatedAt);
  }

  async persistFill(fill: Fill): Promise<void> {
    this.db.prepare(`
      INSERT OR IGNORE INTO fills (id, order_id, user_id, pair, side, price, quantity, fee, fee_asset, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fill.id, fill.orderId, fill.userId, fill.pair, fill.side, fill.price,
          fill.quantity, fill.fee, fill.feeAsset, fill.timestamp);
  }

  private reconcileBalances(journalId: string): void {
    const changes = this.db.prepare(`
      SELECT account_id, asset, 
             SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) as net_change
      FROM journal_lines
      WHERE journal_id = ?
      GROUP BY account_id, asset
    `).all(journalId) as any[];

    for (const change of changes) {
      this.db.prepare(`
        UPDATE balances
        SET available = available + ?
        WHERE account_id = ? AND asset = ?
      `).run(change.net_change, change.account_id, change.asset);
    }
  }

  /**
   * Mark-to-market portfolio value in USDT.
   *
   * Pre-fix bug: every balance's `available` was summed as if one unit of any
   * asset were one USDT (BTC + ETH + XRP units added at face value), then each
   * position's notional was ADDED ON TOP — double-counting the base asset that
   * the balance already reflects. Fix: value each asset at its USDT mark, and
   * never add positions (they are a fill-derived view of the same holdings).
   */
  private calculateTotalValue(balances: Balance[], positions: Position[]): number {
    let total = 0;

    for (const b of balances) {
      const units = (b.available || 0) + (b.locked || 0);
      if (units === 0) continue;

      if (b.asset === 'USDT') {
        total += units;
        continue;
      }

      const mark = this.priceOracle?.(b.asset as Asset);
      // Cold-boot fallback: with no live mark yet, fall back to the position's
      // average entry price so a traded holding is not valued at zero.
      const fallback = positions.find(p => p.pair === `${b.asset}USDT`)?.avgEntryPrice;
      const price = Number.isFinite(mark) && (mark as number) > 0 ? mark : fallback;

      if (price === undefined || !Number.isFinite(price) || price <= 0) continue;
      total += units * price;
    }

    return total;
  }

  close(): void {
    this.db.close();
  }

  /** Raw handle for sibling services (auth) sharing this database file. */
  get dbHandle(): any {
    return this.db;
  }
}
