// T8: Reconciliation - Invariant checks
// Verifies: stored balances equal a full replay of the journal.
//
// The ONE balance model (mirrors SQLiteLedgerStore balance updates):
//   delta(line) = +amount if the line was posted in entry.debits
//                 -amount if the line was posted in entry.credits
//   expected(asset) = sum of deltas over ALL entries (deposits included —
//   they are ordinary debit-only external injections in paper mode).
//
// Note: per-entry Σdebits=Σcredits is NOT asserted. Paper-mode fill entries
// are delta postings against an external synthetic counterparty, and
// deposits are external injections; the replay model above is the invariant.

import type { DemoAccount, JournalEntry } from '@trading/shared';
import type { LedgerStore } from './store';

export interface ReconciliationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: number;
}

const EPSILON = 1e-6;
const JOURNAL_SCAN_LIMIT = 10_000;

export class Reconciler {
  constructor(private store: LedgerStore) {}

  /**
   * Run full reconciliation sweep for one user
   */
  async reconcile(userId: string): Promise<ReconciliationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const account = await this.store.getAccount(userId);
      const journal = await this.store.getJournal(userId, JOURNAL_SCAN_LIMIT);

      await this.checkBalancesMatchJournal(account, journal, errors, warnings);
      this.checkJournalLinesWellFormed(journal, errors);
      this.checkNoNegativeBalances(account, errors);
    } catch (e) {
      errors.push(`Reconciliation error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      checkedAt: Date.now(),
    };
  }

  /**
   * Replay every journal entry (debits +, credits -) and compare per asset
   * against the incrementally-maintained stored balance.
   */
  private async checkBalancesMatchJournal(
    account: DemoAccount,
    journal: JournalEntry[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (journal.length === 0) {
      warnings.push('No journal entries found for account');
      return;
    }

    const calculated = new Map<string, number>();
    for (const entry of journal) {
      for (const line of entry.debits) {
        calculated.set(line.asset, (calculated.get(line.asset) || 0) + line.amount);
      }
      for (const line of entry.credits) {
        calculated.set(line.asset, (calculated.get(line.asset) || 0) - line.amount);
      }
    }

    // Check the UNION of journal assets and stored rows: a journal line for
    // an asset with no balances row is itself a divergence (was blind before).
    const stored = new Map<string, number>();
    for (const b of account.balances) stored.set(b.asset, b.available);
    for (const asset of new Set([...calculated.keys(), ...stored.keys()])) {
      const storedAvail = stored.get(asset) ?? 0;
      const expected = calculated.get(asset) || 0;
      const scale = Math.max(1, Math.abs(storedAvail), Math.abs(expected));

      if (Math.abs(storedAvail - expected) > EPSILON * scale) {
        errors.push(
          `Balance mismatch for ${asset}: stored=${storedAvail}, expected=${expected}`
        );
      }
    }

    const hasTradingEntries = journal.some(e => !e.description.startsWith('Deposit '));
    if (!hasTradingEntries) {
      warnings.push('Account is in initial seed state - no trading activity yet');
    }
  }

  /**
   * Line hygiene: magnitudes positive/finite, no duplicate entry ids
   * (a duplicate id here means the journal line fan-out bug is back).
   */
  private checkJournalLinesWellFormed(journal: JournalEntry[], errors: string[]): void {
    const seenEntryIds = new Set<string>();
    for (const entry of journal) {
      if (seenEntryIds.has(entry.id)) {
        errors.push(`Duplicate journal entry id in replay: ${entry.id}`);
      }
      seenEntryIds.add(entry.id);

      for (const line of [...entry.debits, ...entry.credits]) {
        if (!Number.isFinite(line.amount)) {
          errors.push(`Entry ${entry.id}: non-finite amount for ${line.asset}`);
        } else if (line.amount < 0) {
          errors.push(`Entry ${entry.id}: negative magnitude ${line.amount} for ${line.asset} (side encodes sign)`);
        }
      }
    }
  }

  /**
   * No balance may go negative in paper mode (oversell/overspend guard).
   */
  private checkNoNegativeBalances(account: DemoAccount, errors: string[]): void {
    for (const b of account.balances) {
      if (b.available < -EPSILON) {
        errors.push(`Negative ${b.asset} balance: ${b.available}`);
      }
    }
  }
}
