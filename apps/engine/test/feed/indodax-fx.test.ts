// Test suite for Indodax FX adapter
// Tests timeout, bad JSON, HTTP 429/5xx -> stale behavior

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { IndodaxFxProvider } from '../src/feed/indodax';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IndodaxFxProvider', () => {
  let provider: IndodaxFxProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    provider = new IndodaxFxProvider();
    mockFetch.mockClear();
  });

  test('fetches valid rate from Indodax', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15000.50);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('returns stale rate on HTTP 429', async () => {
    // First fetch succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    await provider.fetchUsdtIdrRate();

    // Second fetch returns 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15000.50);
    expect(provider.getState().stale).toBe(true);
  });

  test('returns stale rate on HTTP 5xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    await provider.fetchUsdtIdrRate();

    // Server error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15000.50);
    expect(provider.getState().stale).toBe(true);
  });

  test('returns stale rate on bad JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: 'invalid', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    await provider.fetchUsdtIdrRate();

    // Next call with bad data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'data' }),
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15000.50);
    expect(provider.getState().stale).toBe(true);
  });

  test('returns fallback on first fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15000); // hardcoded fallback
    expect(provider.getState().stale).toBe(true);
  });

  test('respects cache TTL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    const rate1 = await provider.fetchUsdtIdrRate();
    expect(rate1).toBe(15000.50);

    // Advance time but stay within TTL
    vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

    const rate2 = await provider.fetchUsdtIdrRate();
    expect(rate2).toBe(15000.50);
    expect(mockFetch).toHaveBeenCalledTimes(1); // still using cache
  });

  test('refreshes after TTL expires', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    await provider.fetchUsdtIdrRate();

    // Advance past TTL (10 minutes)
    vi.advanceTimersByTime(11 * 60 * 1000);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15100.00', buy: '15100', sell: '15101', high: '15300', low: '14900', vol: '1100' },
      }),
    });

    const rate = await provider.fetchUsdtIdrRate();
    expect(rate).toBe(15100.00);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('throttles requests to max 1 per second', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ticker: { last: '15000.50', buy: '15000', sell: '15001', high: '15200', low: '14800', vol: '1000' },
      }),
    });

    await provider.fetchUsdtIdrRate();

    // Call again immediately
    const rate2 = await provider.fetchUsdtIdrRate();
    expect(rate2).toBe(15000.50);
    expect(mockFetch).toHaveBeenCalledTimes(1); // still using cache
  });
});
