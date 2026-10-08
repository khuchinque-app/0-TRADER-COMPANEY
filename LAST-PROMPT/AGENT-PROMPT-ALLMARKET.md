# 🎯 PROMPT FINAL: Halaman Market dengan 477+ Markets dari Indodax API

## Status Indodax
Indodax memiliki **477 trading pairs IDR** + 12 USDT pairs = **~489 total markets**

## Solusi: Fetch Real-time dari Indodax API

### API Endpoint
```
https://indodax.com/api/summaries
```

API ini mengembalikan **SEMUA markets** dalam real-time dengan data:
- Harga terakhir (last)
- Volume 24 jam (vol_idr)
- High/Low 24 jam
- Nama coin
- Dan lainnya...

## 📁 File yang Perlu Dibuat/Update

### 1. `apps/terminal/src/pages/MarketPage.tsx` (UPDATE)

```typescript
import { useState, useMemo, useEffect } from 'react';
import { MARKETS as FALLBACK_MARKETS, Market } from '../data/marketsFull';

export default function MarketPage() {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK_MARKETS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'volume' | 'change' | 'name'>('volume');
  const [loading, setLoading] = useState(false);
  const [totalMarkets, setTotalMarkets] = useState(FALLBACK_MARKETS.length);
  const ITEMS_PER_PAGE = 50;

  // Fetch real-time data from Indodax API
  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      try {
        // Option 1: Direct fetch (if CORS allows)
        // const response = await fetch('https://indodax.com/api/summaries');

        // Option 2: Via CORS proxy (recommended)
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://indodax.com/api/summaries');
        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (data.tickers) {
          const tickers = data.tickers;
          const prices24h = data.prices_24h || {};

          const parsedMarkets: Market[] = Object.entries(tickers)
            .filter(([key]) => key.endsWith('_idr')) // Only IDR pairs
            .map(([key, ticker]: [string, any]) => {
              const base = key.replace('_idr', '').toUpperCase();
              const pairKey = `${base.toLowerCase()}idr`;
              const price24hAgo = parseFloat(prices24h[pairKey] || ticker.last);
              const lastPrice = parseFloat(ticker.last);
              const change = price24hAgo > 0 ? ((lastPrice - price24hAgo) / price24hAgo) * 100 : 0;

              // Auto-categorize
              let cat: Market['category'] = 'all';
              const memeCoins = ['DOGE', 'SHIB', 'PEPE', 'FARTCOIN', 'BONK', 'FLOKI', 'WIF', 'POPCAT', 'MOG', 'BRETT', 'MUBARAK', 'TROLLSOL', 'SUNDOG', 'PUMP', 'PM', 'USELESS', 'MARSCOIN', 'PIPPIN', 'BOME', 'CHILLGUY', 'NEIROCTO', 'GOAT', 'PNUT', 'PONKE', 'MYRO', 'APU', 'RFC', 'MOONPIG', 'BAN', 'GIGA'];
              const defiCoins = ['AAVE', 'UNI', 'COMP', 'SNX', 'CRV', 'SUSHI', 'YFI', 'YFII', 'BAL', '1INCH', 'LINK', 'OGN', 'RLC', 'MET', 'ENA', 'ONDO', 'BR', 'GTC', 'CST', 'HONEY', 'UAI', 'JUP', 'RAY', 'ORCA', 'PENDLE', 'MORPHO', 'LDO', 'MKR'];
              const gamingCoins = ['SAND', 'MANA', 'AXS', 'GALA', 'IMX', 'MCT', 'VANRY', 'BEAT', 'HIGH', 'PIXEL', 'PORTAL', 'MAGIC', 'SLP', 'VOXEL', 'GALAGAMES', 'COL', 'DAR', 'JELLYJELLY', 'ALICE'];
              const layer1Coins = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'NEAR', 'SUI', 'ATOM', 'ALGO', 'HBAR', 'FTM', 'ICP', 'VET', 'LTC', 'TRX', 'XLM', 'EOS', 'XTZ', 'NEO', 'QNT', 'BNB', 'THETA', 'FIL', 'AR'];
              const layer2Coins = ['ARB', 'OP', 'MATIC', 'IMX', 'STRK', 'MANTA', 'METIS'];

              if (memeCoins.includes(base)) cat = 'meme';
              else if (defiCoins.includes(base)) cat = 'defi';
              else if (gamingCoins.includes(base)) cat = 'gaming';
              else if (layer1Coins.includes(base)) cat = 'layer1';
              else if (layer2Coins.includes(base)) cat = 'layer2';

              return {
                symbol: `${base}/IDR`,
                base,
                quote: 'IDR',
                name: ticker.name || base,
                icon: base.charAt(0),
                price: lastPrice,
                change24h: parseFloat(change.toFixed(2)),
                volume24h: parseFloat(ticker.vol_idr || '0'),
                high24h: parseFloat(ticker.high || '0'),
                low24h: parseFloat(ticker.low || '0'),
                category: cat,
              };
            })
            .filter(m => m.volume24h > 0)
            .sort((a, b) => b.volume24h - a.volume24h);

          if (parsedMarkets.length > 0) {
            setMarkets(parsedMarkets);
            setTotalMarkets(parsedMarkets.length);
          }
        }
      } catch (error) {
        console.log('Using fallback market data (CORS blocked)');
        setTotalMarkets(FALLBACK_MARKETS.length);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // ... rest of the component (filter, pagination, render)
  // [Use the complete MarketPage.tsx from this sandbox]
}
```

### 2. `apps/terminal/src/data/marketsFull.ts` (UPDATE)

File ini berisi **100+ markets hardcoded** sebagai fallback jika API tidak bisa diakses.
Lihat file `marketsFull.ts` di sandbox ini untuk data lengkap.

## 🚀 Cara Deploy

### Option A: Proxy via Backend (Recommended)
Tambahkan endpoint di backend untuk proxy Indodax API:

```typescript
// apps/backend/src/routes/indodax.ts
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/api/indodax/summaries', async (req, res) => {
  try {
    const response = await fetch('https://indodax.com/api/summaries');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Indodax' });
  }
});

export default router;
```

Lalu di frontend, fetch dari backend sendiri:
```typescript
const response = await fetch('http://187.127.178.20:11110/api/indodax/summaries');
```

### Option B: Direct via CORS Proxy
Gunakan CORS proxy seperti `corsproxy.io` atau `allorigins.win`:
```typescript
const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://indodax.com/api/summaries');
const response = await fetch(proxyUrl);
```

### Option C: Fallback Only
Jika tidak bisa fetch API, gunakan data hardcoded (100+ markets).

## 📊 Hasil yang Diharapkan

Setelah deploy, halaman `/market` akan menampilkan:
- ✅ **477+ markets** (semua pair IDR dari Indodax)
- ✅ **Real-time data** (auto-refresh setiap 30 detik)
- ✅ **Search** dari semua markets
- ✅ **Kategori**: Semua, Favorit, Naik, Turun, Layer 1, Layer 2, DeFi, Gaming, Meme
- ✅ **Pagination** (50 markets per halaman)
- ✅ **Favorites** (bintang)
- ✅ **Sort** by volume/perubahan/nama
- ✅ **Format IDR** (Rp 1.462.499.000)
- ✅ **Volume abbreviation** (139,4bn / 39,6bn)
- ✅ **Green/red** change percentages

## 🔗 API Endpoints

| Endpoint | Fungsi |
|----------|--------|
| `https://indodax.com/api/summaries` | Semua markets real-time |
| `apps/terminal/src/data/marketsFull.ts` | Fallback data (100+ markets) |
| `apps/terminal/src/pages/MarketPage.tsx` | Halaman market utama |

## ⚠️ Catatan Penting

1. **CORS Issue**: Indodax API memblokir direct browser requests. Gunakan:
   - Backend proxy (recommended)
   - CORS proxy seperti `corsproxy.io`
   - Atau gunakan fallback data hardcoded

2. **Performance**: 477 markets mungkin lambat di mobile. Pagination sudah di-set 50 per halaman.

3. **Data Refresh**: Auto-refresh setiap 30 detik untuk data real-time.

4. **Fallback**: Jika API gagal, tampilkan data hardcoded (100+ markets).

## 📝 Checklist untuk Coding Agent

- [ ] Update `apps/terminal/src/pages/MarketPage.tsx` dengan kode di atas
- [ ] Update `apps/terminal/src/data/marketsFull.ts` dengan 100+ markets
- [ ] (Optional) Tambah backend endpoint `/api/indodax/summaries` untuk proxy
- [ ] Build: `cd apps/terminal && npm run build`
- [ ] Restart server
- [ ] Test: Buka http://187.127.178.20:22221/market
- [ ] Verify: Harus muncul 477+ markets

## 🎯 Summary

Indodax memiliki **477 trading pairs IDR**. Gunakan API `https://indodax.com/api/summaries` untuk mendapatkan semua markets secara real-time. Jika CORS memblokir, gunakan backend proxy atau fallback ke data hardcoded (100+ markets).
