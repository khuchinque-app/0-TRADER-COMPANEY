// Indodax FX Provider - USDT/IDR ticker from Indodax public API
// Serves GET /api/fx/usdt-idr with rate, source, ts, stale flag

import {
  INDODAX_BASE_URL,
  FX_TTL_MS,
  FX_STALE_MAX_MS,
} from '@trading/shared';

interface IndodaxTickerResponse {
  ticker: {
    last: string;
    buy: string;
    sell: string;
    high: string;
    low: string;
    vol: string;
  };
}

interface FXCacheEntry {
  rate: number;
  timestamp: number;
  source: string;
  stale: boolean;
}

export class IndodaxFxProvider {
  private cache: FXCacheEntry | null = null;
  private lastFetchTime = 0;
  private fetchInProgress = false;

  async fetchUsdtIdrRate(): Promise<number> {
    const now = Date.now();

    // Return cached rate if within TTL and not too stale
    if (this.cache) {
      const age = now - this.cache.timestamp;
      if (age < FX_TTL_MS) {
        return this.cache.rate;
      }
      // Serve stale if under max age
      if (age < FX_STALE_MAX_MS) {
        return this.cache.rate;
      }
    }

    // Throttle: max 1 request per second
    if (now - this.lastFetchTime < 1000) {
      if (this.cache) {
        return this.cache.rate;
      }
      return 15000; // hardcoded fallback only if no cache at all
    }

    return this.doFetch();
  }

  private async doFetch(): Promise<number> {
    if (this.fetchInProgress) {
      // Wait for in-flight request
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.cache?.rate || 15000;
    }

    this.fetchInProgress = true;
    this.lastFetchTime = Date.now();

    try {
      const url = `${INDODAX_BASE_URL}/ticker`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as IndodaxTickerResponse;

      if (!data.ticker?.last) {
        throw new Error('Invalid response format');
      }

      const rate = parseFloat(data.ticker.last);

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Invalid rate: ${rate}`);
      }

      this.cache = {
        rate,
        timestamp: Date.now(),
        source: 'indodax',
        stale: false,
      };

      console.log(`[IndodaxFX] USDT/IDR rate fetched: ${rate}`);
      return rate;
    } catch (error) {
      console.error('[IndodaxFX] Failed to fetch rate:', error);

      // On failure, serve last good value with stale flag
      if (this.cache) {
        this.cache.stale = true;
        return this.cache.rate;
      }

      // No cache available, use hardcoded fallback
      return 15000;
    } finally {
      this.fetchInProgress = false;
    }
  }

  /**
   * Get current state for the /api/fx/usdt-idr endpoint
   */
  getState() {
    if (!this.cache) {
      return {
        rate: 15000,
        source: 'fallback',
        ts: Date.now(),
        stale: true,
      };
    }
    const age = Date.now() - this.cache.timestamp;
    return {
      rate: this.cache.rate,
      source: this.cache.source,
      ts: this.cache.timestamp,
      stale: this.cache.stale || age > FX_STALE_MAX_MS,
    };
  }
}

export const indodaxFxProvider = new IndodaxFxProvider();
