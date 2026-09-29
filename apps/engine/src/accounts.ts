// T11: Guest Accounts - Demo account seeding
// Creates demo accounts with initial funds on first login

import type { Ledger } from './ledger/ledger';

export class GuestAccountManager {
  private initialized = new Set<string>();

  constructor(private ledger: Ledger) {}

  /**
   * Ensure user has a demo account, create if needed
   */
  async ensureAccount(userId: string): Promise<{ created: boolean; userId: string }> {
    if (this.initialized.has(userId)) {
      return { created: false, userId };
    }

    try {
      // Check if account exists
      await this.ledger.getAccount(userId);
      this.initialized.add(userId);
      return { created: false, userId };
    } catch {
      // Account doesn't exist, create it with default funds
      await this.ledger.initializeDemoAccount(userId);
      this.initialized.add(userId);
      return { created: true, userId };
    }
  }

  /**
   * Create a guest account with random ID
   */
  async createGuest(): Promise<string> {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await this.ensureAccount(guestId);
    return guestId;
  }

  /**
   * Reset a user's demo account (for testing)
   * Must WIPE the old books first — initializeDemoAccount early-returns
   * when the account exists, so calling it alone was a silent no-op.
   */
  async resetAccount(userId: string): Promise<void> {
    // Clear initialized state
    this.initialized.delete(userId);

    // Wipe journal/balances/orders/fills for this user, then re-seed fresh
    await this.ledger.resetDemoAccount(userId);
    this.initialized.add(userId);
  }

  /**
   * Get list of initialized accounts (for debugging)
   */
  getInitializedAccounts(): string[] {
    return Array.from(this.initialized);
  }
}
