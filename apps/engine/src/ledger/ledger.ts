// T7: Ledger - Posting semantics for the paper venue
// Wraps the store with semantic operations.
//
// Sign convention (shared with SQLiteLedgerStore.reconcileBalances and
// Reconciler — the ONE model, do not diverge):
//   entry.debits  = lines whose balance delta is POSITIVE (available +=)
//   entry.credits = lines whose balance delta is NEGATIVE (available -=)
//   amounts are always positive magnitudes; the side IS the sign.
//
// Paper mode: the synthetic book is an external counterparty, so fill entries
// are delta postings (not zero-sum double entry). User-vs-user trades produce
// two mirrored fills (taker + maker legs) whose asset deltas cancel across
// accounts; the residue is the venue's fee take.

import type {
  Asset,
  Fill,
  Order,
  JournalEntry,
} from '@trading/shared';
import { DEMO_FUNDS_USDT, DEMO_ALLOCATION } from '@trading/shared';
import type { LedgerStore } from './store';

interface PostingContext {
  userId: string;
  accountId: string;
}

export class Ledger {
  constructor(private store: LedgerStore) {}

  /**
   * Post a fill as balance deltas for ONE side of the trade.
   * Buy:  +quantity base,  -(notional + fee) USDT   (buyer PAYS the fee)
   * Sell: -quantity base,  +(notional - fee) USDT   (seller RECEIVES net of fee)
   */
  async postFill(ctx: PostingContext, fill: Fill): Promise<void> {
    const { accountId } = ctx;
    const asset = fill.pair.replace('USDT', '') as Asset;
    const notional = fill.price * fill.quantity;
    const fee = fill.fee;

    const entry: JournalEntry = {
      id: `j_${fill.id}`,
      timestamp: fill.timestamp,
      description: `Fill ${fill.id}: ${fill.side} ${fill.quantity} ${fill.pair} @ ${fill.price}`,
      debits: [],
      credits: [],
    };

    if (fill.side === 'buy') {
      entry.debits.push({ accountId, asset, amount: fill.quantity });
      entry.credits.push({ accountId, asset: 'USDT', amount: notional + fee });
    } else {
      entry.credits.push({ accountId, asset, amount: fill.quantity });
      // Dust guard: fee floor can exceed notional on sub-cent fills; a
      // negative "amount" would flip side via Math.abs and MINT money.
      entry.debits.push({ accountId, asset: 'USDT', amount: Math.max(0, notional - fee) });
    }

    await this.store.post(entry);
  }

  /**
   * Persist the order snapshot (status/filled qty) after settlement.
   */
  async recordOrder(order: Order): Promise<void> {
    await this.store.persistOrder(order);
  }

  /**
   * Record a settled fill: journal + persistent fills table.
   */
  async recordFill(userId: string, fill: Fill): Promise<void> {
    const accountId = await this.store.getAccountId(userId);
    await this.store.transaction(async () => {
      await this.postFill({ userId, accountId }, fill);
      await this.store.persistFill(fill);
    });
  }

  /**
   * Settle a batch of orders with their fills (taker + maker legs) in ONE
   * store transaction: journal posts + orders/fills persistence commit or
   * roll back together, so a failure can never leave balances moved with
   * no fills row.
   */
  async settleBatch(batch: { order: Order; fills: Fill[] }[]): Promise<void> {
    if (batch.length === 0) return;

    // Resolve accounts per-order BEFORE the write txn. A deleted/reset
    // account must not poison the whole batch (one dead maker used to roll
    // back every unrelated settlement sharing the drain window).
    const accountIds = new Map<string, string>();
    const deadUsers = new Set<string>();
    for (const { order } of batch) {
      if (accountIds.has(order.userId) || deadUsers.has(order.userId)) continue;
      try {
        accountIds.set(order.userId, await this.store.getAccountId(order.userId));
      } catch {
        deadUsers.add(order.userId);
      }
    }
    if (deadUsers.size > 0) {
      batch = batch.filter(({ order }) => !deadUsers.has(order.userId));
    }
    if (batch.length === 0) return;

    const hasJournal = this.store.hasJournal?.bind(this.store);

    await this.store.transaction(async () => {
      for (const { order, fills } of batch) {
        const accountId = accountIds.get(order.userId)!;

        // Order row first: fills FK to orders(id)
        await this.store.persistOrder(order);

        for (const fill of fills) {
          // Settlement watermark: drainPendingSettlements replays an order's
          // FULL fill history whenever it is touched again. Skipping fills
          // whose journal entry already exists stops the UNIQUE(id) poison
          // that used to roll back (and silently lose) whole batches.
          if (hasJournal && hasJournal(`j_${fill.id}`)) continue;
          await this.postFill({ userId: order.userId, accountId }, fill);
          await this.store.persistFill(fill);
        }

        // Refresh order snapshot last (status may have advanced while filling)
        await this.store.persistOrder(order);
      }
    });
  }

  /**
   * Post a deposit (demo seed).
   * Deposits are external injections: debit-only, an exception to the
   * zero-sum rule. Entry id is deterministic per account+asset so replaying
   * an initialization cannot double-credit (INSERT OR IGNORE by PK).
   */
  async postDeposit(ctx: PostingContext, asset: Asset | 'USDT', amount: number): Promise<void> {
    const entry: JournalEntry = {
      id: `dep_${ctx.accountId}_${asset}`,
      timestamp: Date.now(),
      description: `Deposit ${amount} ${asset}`,
      debits: [{ accountId: ctx.accountId, asset, amount }],
      credits: [], // External source - not tracked in paper
    };

    await this.store.post(entry, { ignoreDuplicate: true });
  }

  /**
   * Post an external money movement (wallet deposit/withdraw, SIMULASI).
   * entryId must be deterministic from the caller's Idempotency-Key so a
   * replayed request INSERT OR IGNOREs instead of double-moving funds.
   * Returns false when the entry already existed (replay), true when posted.
   */
  async postExternal(
    entryId: string, userId: string, asset: Asset | 'USDT',
    amount: number, side: 'deposit' | 'withdraw',
  ): Promise<boolean> {
    const accountId = await this.store.getAccountId(userId);
    const entry: JournalEntry = {
      id: entryId,
      timestamp: Date.now(),
      description: side === 'deposit' ? `Deposit ${amount} ${asset}` : `Withdraw ${amount} ${asset}`,
      debits: side === 'deposit' ? [{ accountId, asset, amount }] : [],
      credits: side === 'withdraw' ? [{ accountId, asset, amount }] : [],
    };
    const posted = await this.store.post(entry, { ignoreDuplicate: true });
    return posted === 'posted';
  }

  /**
   * Initialize demo account with starting funds.
   * createAccount seeds zero balance rows, then deposits post through the
   * journal so a ledger replay (reconciliation) reproduces them exactly.
   */
  async initializeDemoAccount(userId: string): Promise<void> {
    const account = await this.store.getAccount(userId).catch(() => null);

    if (account) {
      // Account already exists, skip
      return;
    }

    const accountId = await this.store.createAccount(userId);
    const ctx = { userId, accountId };

    await this.store.transaction(async () => {
      await this.postDeposit(ctx, 'USDT', DEMO_FUNDS_USDT);
      for (const [asset, amount] of Object.entries(DEMO_ALLOCATION)) {
        await this.postDeposit(ctx, asset as Asset, amount);
      }
    });

    console.log(`[Ledger] Demo account initialized for ${userId}`);
  }

  /**
   * Full reset: wipe the account's books and re-seed. Used by guest reset.
   */
  async resetDemoAccount(userId: string): Promise<void> {
    await this.store.deleteAccountData(userId);
    await this.initializeDemoAccount(userId);
  }

  /**
   * Get account state
   */
  async getAccount(userId: string): Promise<any> {
    return this.store.getAccount(userId);
  }

  /**
   * Synchronous available balance for the matcher buying-power gate.
   * Stores without getBalanceSync report 0 (no enforcement possible).
   */
  getBalanceSync(userId: string, asset: string): number {
    return this.store.getBalanceSync?.(userId, asset) ?? 0;
  }

  /**
   * Get journal history
   */
  async getJournal(userId: string, limit = 100): Promise<any[]> {
    return this.store.getJournal(userId, limit);
  }
}
