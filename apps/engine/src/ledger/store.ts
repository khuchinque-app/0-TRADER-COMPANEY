// LedgerStore interface — seam #2
// Only this file touches the DB driver
//
// Sign convention (shared with Ledger + Reconciler):
//   JournalEntry.debits  -> lines whose balance delta is POSITIVE
//   JournalEntry.credits -> lines whose balance delta is NEGATIVE
//   amounts are positive magnitudes; the side IS the sign.

import type { JournalEntry, DemoAccount, Order, Fill } from '@trading/shared';

export interface LedgerStore {
  /** Get account state including balances and positions */
  getAccount(userId: string): Promise<DemoAccount>;

  /** Get the internal account ID for a user */
  getAccountId(userId: string): Promise<string>;

  /** Optional sync balance read for the matcher's buying-power gate */
  getBalanceSync?(userId: string, asset: string): number;

  /** Optional settlement watermark: journal entry already posted? */
  hasJournal?(id: string): boolean;

  /**
   * Post a journal entry (delta posting; deposits are the debit-only exception).
   * opts.ignoreDuplicate: skip (not error) when the entry id already exists.
   */
  post(entry: JournalEntry, opts?: { ignoreDuplicate?: boolean }): Promise<'posted' | 'duplicate'>;

  /**
   * Run fn inside ONE store transaction. All writes fn performs commit or
   * roll back together. Must be reentrant-safe: no nested transaction.
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /** Get journal entries (one per entry, not per line) for an account */
  getJournal(userId: string, limit?: number): Promise<JournalEntry[]>;

  /** Initialize a new demo account with starting funds */
  createAccount(userId: string, initialFunds?: Record<string, number>): Promise<string>;

  /** Persist a matched order snapshot (idempotent upsert) */
  persistOrder(order: Order): Promise<void>;

  /** Persist a fill (idempotent insert) */
  persistFill(fill: Fill): Promise<void>;

  /** Delete every trace of a user's account (reset path). */
  deleteAccountData(userId: string): Promise<void>;
}
