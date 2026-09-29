// FX rate provider - USD to IDR conversion
// Polls open.er-api.com once at boot, caches in-memory for 6 hours

import { FEED_URLS, FX_CACHE_TTL_SECONDS } from '@trading/shared';

interface FXRate {
  rate: number;
  lastUpdated: number;
}

class FXProvider {
  private cache: FXRate | null = null;
  private loadingPromise: Promise<void> | null = null;

  async fetchRate(): Promise<number> {
    // Return cached rate if available and not expired
    if (this.cache) {
      const age = Date.now() - this.cache.lastUpdated;
      if (age < FX_CACHE_TTL_SECONDS * 1000) {
        return this.cache.rate;
      }
    }

    // If already loading, wait for it
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.cache?.rate || 15000;
    }

    // Fetch new rate
    this.loadingPromise = this.doFetch();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }

    return this.cache?.rate || 15000;
  }

  private async doFetch(): Promise<void> {
    try {
      const url = `${FEED_URLS.fx}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FX fetch failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json() as { rates: Record<string, number> };
      
      if (data && data.rates && data.rates.IDR) {
        this.cache = {
          rate: data.rates.IDR,
          lastUpdated: Date.now(),
        };
        console.log(`[FX] USD/IDR rate fetched: ${this.cache.rate}`);
      } else {
        throw new Error('Invalid FX response format');
      }
    } catch (error) {
      console.error('[FX] Failed to fetch rate:', error);
      // Keep any existing cache; do NOT stamp the fallback with a fresh
      // lastUpdated (that pinned a fake 15000 for a full 6h TTL before any
      // retry). With no cache, return a stale-flagged fallback that expires
      // immediately so the next call retries the real source.
      if (!this.cache) {
        this.cache = {
          rate: 15000,
          lastUpdated: 0,
        };
      }
    }
  }

  getRate(): number | null {
    if (!this.cache) return null;
    const age = Date.now() - this.cache.lastUpdated;
    if (age > FX_CACHE_TTL_SECONDS * 1000) return null;
    return this.cache.rate;
  }
}

export const fxProvider = new FXProvider();
