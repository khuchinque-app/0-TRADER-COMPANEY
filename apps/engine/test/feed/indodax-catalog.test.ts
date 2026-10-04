// Catalog test: verify INDODAX PAIRS from research data
// Ensures our asset shortlist has corresponding IDR pairs

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ASSET_SHORTLIST } from '@trading/shared';

describe('Indodax Pairs Catalog', () => {
  test('every asset in shortlist has a corresponding IDR pair', () => {
    // Load the verified pairs data from VPS research
    const pairsPath = resolve(__dirname, '../../../docs/research/indodax-pairs.json');
    const pairsData = JSON.parse(readFileSync(pairsPath, 'utf-8')) as Array<{ symbol: string; quote: string }>;

    const idrPairs = new Set(pairsData.filter(p => p.quote === 'IDR').map(p => p.symbol));
    const usdtPairs = new Set(pairsData.filter(p => p.quote === 'USDT').map(p => p.symbol));

    for (const asset of ASSET_SHORTLIST) {
      const baseSymbol = asset;

      // Each asset should have at least one IDR pair
      const hasIdrPair = Array.from(idrPairs).some(pair => pair.startsWith(baseSymbol));
      expect(hasIdrPair, `${asset} should have an IDR pair`).toBe(true);

      // And also a USDT pair (our internal quote)
      const usdtPair = `${baseSymbol}USDT`;
      expect(usdtPairs.has(usdtPair), `${usdtPair} should exist in USDT pairs`).toBe(true);
    }
  });

  test('USDT pairs exist for all shortlist assets', () => {
    const pairsPath = resolve(__dirname, '../../../docs/research/indodax-pairs.json');
    const pairsData = JSON.parse(readFileSync(pairsPath, 'utf-8')) as Array<{ symbol: string; quote: string }>;

    const usdtPairs = new Set(pairsData.filter(p => p.quote === 'USDT').map(p => p.symbol));

    for (const asset of ASSET_SHORTLIST) {
      const usdtPair = `${asset}USDT`;
      expect(usdtPairs.has(usdtPair), `${usdtPair} should exist`).toBe(true);
    }
  });

  test('total pairs count matches expected (477)', () => {
    const pairsPath = resolve(__dirname, '../../../docs/research/indodax-pairs.json');
    const pairsData = JSON.parse(readFileSync(pairsPath, 'utf-8')) as Array<{ symbol: string; quote: string }>;

    expect(pairsData.length).toBe(477);
  });

  test('USDT pairs count matches expected (12)', () => {
    const pairsPath = resolve(__dirname, '../../../docs/research/indodax-pairs.json');
    const pairsData = JSON.parse(readFileSync(pairsPath, 'utf-8')) as Array<{ symbol: string; quote: string }>;

    const usdtPairs = pairsData.filter(p => p.quote === 'USDT');
    expect(usdtPairs.length).toBe(12);
  });

  test('IDR pairs count matches expected (465)', () => {
    const pairsPath = resolve(__dirname, '../../../docs/research/indodax-pairs.json');
    const pairsData = JSON.parse(readFileSync(pairsPath, 'utf-8')) as Array<{ symbol: string; quote: string }>;

    const idrPairs = pairsData.filter(p => p.quote === 'IDR');
    expect(idrPairs.length).toBe(465);
  });
});
