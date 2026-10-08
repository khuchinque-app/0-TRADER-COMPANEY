--- FIX-MARKET-PAGE-PROMPT.md (原始)


+++ FIX-MARKET-PAGE-PROMPT.md (修改后)
# 🚨 URGENT FIX: Halaman /market Stuck di "Loading markets..."

## Masalah
URL: http://187.127.178.20:22221/market
Status: **Stuck di "Loading markets..."** - tidak menampilkan 477+ markets

## Diagnosa Cepat

### Step 1: Cek Browser Console
1. Buka http://187.127.178.20:22221/market
2. Tekan **F12** → Tab **Console**
3. Lihat error merah (screenshot jika perlu)

### Step 2: Cek Network Tab
1. **F12** → Tab **Network** → Refresh page
2. Cek apakah ada failed request (merah)
3. Cek apakah JavaScript bundle loading

---

## 🔧 Solusi 1: Rebuild & Restart (Paling Mungkin)

Kemungkinan besar build belum di-deploy atau server belum restart.

```bash
# Di VPS
cd /home/khuchinque/0-TRADER-COMPANEY/apps/terminal

# Clean build
rm -rf dist
npm run build

# Restart server (pilih yang sesuai)
pm2 restart terminal
# ATAU
pm2 restart all
# ATAU jika pakai systemd
sudo systemctl restart terminal
```

---

## 🔧 Solusi 2: Fix Routing Issue

Cek file `apps/terminal/src/App.tsx` atau router config. Pastikan `/market` route mengarah ke `MarketPage` component.

### Contoh App.tsx yang Benar:
```typescript
import { useState } from 'react';
import MarketPage from './pages/MarketPage';

function App() {
  const [view, setView] = useState<'market' | 'terminal'>(() => {
    // Check current path
    if (window.location.pathname === '/market') return 'market';
    return 'terminal';
  });

  if (view === 'market' || window.location.pathname === '/market') {
    return (
      <div className="min-h-screen bg-[#0b0e11]">
        <nav className="bg-[#0b0e11] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-black text-sm">
              QC
            </div>
            <span className="text-white font-bold text-lg">ChinQue<span className="text-yellow-400">Trade</span></span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setView('market')}
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium text-sm"
            >
              Market
            </button>
            <button
              onClick={() => setView('terminal')}
              className="px-4 py-2 bg-[#1e2329] text-gray-400 hover:text-white rounded-lg font-medium text-sm transition-colors"
            >
              Terminal
            </button>
          </div>
        </nav>
        <MarketPage />
      </div>
    );
  }

  // Terminal view
  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <nav className="bg-[#0b0e11] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-black text-sm">
            QC
          </div>
          <span className="text-white font-bold text-lg">ChinQue<span className="text-yellow-400">Trade</span></span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = '/market'}
            className="px-4 py-2 bg-[#1e2329] text-gray-400 hover:text-white rounded-lg font-medium text-sm transition-colors"
          >
            Market
          </button>
          <button
            onClick={() => setView('terminal')}
            className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium text-sm"
          >
            Terminal
          </button>
        </div>
      </nav>
      {/* Terminal content */}
    </div>
  );
}

export default App;
```

---

## 🔧 Solusi 3: Fix MarketPage.tsx (Fallback jika API Gagal)

Jika CORS proxy tidak bekerja, gunakan fallback data langsung.

### Update `apps/terminal/src/pages/MarketPage.tsx`:

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
        // Try multiple CORS proxies
        const urls = [
          'https://corsproxy.io/?' + encodeURIComponent('https://indodax.com/api/summaries'),
          'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://indodax.com/api/summaries'),
          'https://cors-anywhere.herokuapp.com/https://indodax.com/api/summaries',
        ];

        let data = null;
        for (const url of urls) {
          try {
            const response = await fetch(url, {
              signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (response.ok) {
              data = await response.json();
              break;
            }
          } catch (e) {
            console.log(`Proxy failed: ${url}`);
            continue;
          }
        }

        if (data && data.tickers) {
          const tickers = data.tickers;
          const prices24h = data.prices_24h || {};

          const parsedMarkets: Market[] = Object.entries(tickers)
            .filter(([key]) => key.endsWith('_idr'))
            .map(([key, ticker]: [string, any]) => {
              const base = key.replace('_idr', '').toUpperCase();
              const pairKey = `${base.toLowerCase()}idr`;
              const price24hAgo = parseFloat(prices24h[pairKey] || ticker.last);
              const lastPrice = parseFloat(ticker.last);
              const change = price24hAgo > 0 ? ((lastPrice - price24hAgo) / price24hAgo) * 100 : 0;

              let cat: Market['category'] = 'all';
              const memeCoins = ['DOGE', 'SHIB', 'PEPE', 'FARTCOIN', 'BONK', 'FLOKI', 'WIF', 'POPCAT', 'MOG', 'BRETT', 'MUBARAK', 'TROLLSOL', 'SUNDOG', 'PUMP', 'PM', 'USELESS', 'MARSCOIN', 'PIPPIN'];
              const defiCoins = ['AAVE', 'UNI', 'COMP', 'SNX', 'CRV', 'SUSHI', 'YFI', 'YFII', 'BAL', '1INCH', 'LINK', 'OGN', 'RLC', 'MET', 'ENA', 'ONDO', 'BR', 'GTC', 'CST', 'HONEY', 'UAI'];
              const gamingCoins = ['SAND', 'MANA', 'AXS', 'GALA', 'IMX', 'MCT', 'VANRY', 'BEAT'];
              const layer1Coins = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'NEAR', 'SUI', 'ATOM', 'ALGO', 'HBAR', 'FTM', 'ICP', 'VET', 'LTC', 'TRX', 'XLM', 'QNT', 'BNB'];
              const layer2Coins = ['ARB', 'OP', 'MATIC'];

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
            console.log(`✅ Loaded ${parsedMarkets.length} markets from Indodax API`);
          }
        } else {
          console.log('⚠️ Using fallback data (API fetch failed)');
          setTotalMarkets(FALLBACK_MARKETS.length);
        }
      } catch (error) {
        console.error('❌ Error fetching markets:', error);
        console.log('⚠️ Using fallback data');
        setTotalMarkets(FALLBACK_MARKETS.length);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = useMemo(() => {
    let filtered = [...markets];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.symbol.toLowerCase().includes(searchLower) ||
        m.name.toLowerCase().includes(searchLower)
      );
    }

    if (category === 'favorite') {
      filtered = filtered.filter(m => favorites.has(m.symbol));
    } else if (category === 'defi') {
      filtered = filtered.filter(m => m.category === 'defi');
    } else if (category === 'meme') {
      filtered = filtered.filter(m => m.category === 'meme');
    } else if (category === 'gaming') {
      filtered = filtered.filter(m => m.category === 'gaming');
    } else if (category === 'layer1') {
      filtered = filtered.filter(m => m.category === 'layer1');
    } else if (category === 'layer2') {
      filtered = filtered.filter(m => m.category === 'layer2');
    } else if (category === 'gainers') {
      filtered = filtered.filter(m => m.change24h > 0).sort((a, b) => b.change24h - a.change24h);
      return filtered;
    } else if (category === 'losers') {
      filtered = filtered.filter(m => m.change24h < 0).sort((a, b) => a.change24h - b.change24h);
      return filtered;
    }

    if (sortBy === 'volume') {
      filtered.sort((a, b) => b.volume24h - a.volume24h);
    } else if (sortBy === 'change') {
      filtered.sort((a, b) => b.change24h - a.change24h);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return filtered;
  }, [markets, search, category, favorites, sortBy]);

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const categories = [
    { key: 'all', label: `Semua (${totalMarkets})` },
    { key: 'favorite', label: '⭐ Favorit' },
    { key: 'gainers', label: '📈 Naik' },
    { key: 'losers', label: '📉 Turun' },
    { key: 'layer1', label: 'Layer 1' },
    { key: 'layer2', label: 'Layer 2' },
    { key: 'defi', label: 'DeFi' },
    { key: 'gaming', label: 'Gaming' },
    { key: 'meme', label: 'Meme' },
  ];

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 6 })}`;
    } else if (price < 100) {
      return `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 3 })}`;
    }
    return `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000000) {
      return `${(volume / 1000000000000).toFixed(1).replace('.', ',')}tn`;
    } else if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1).replace('.', ',')}bn`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1).replace('.', ',')}mn`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1).replace('.', ',')}rb`;
    }
    return volume.toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Market Crypto</h1>
            <p className="text-gray-500 text-sm">
              Cek harga crypto (IDR) hari ini. Data live dari Indodax API.
              {loading && <span className="text-yellow-400 ml-2">⏳ Memuat data...</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs text-gray-500">Live • Auto-refresh 30s</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={`Cari dari ${totalMarkets} market...`}
              className="w-full bg-[#1e2329] border border-gray-700 rounded-lg px-4 py-2.5 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  category === cat.key
                    ? 'bg-yellow-400 text-black'
                    : 'bg-[#1e2329] text-gray-400 hover:text-white hover:bg-[#2b3139]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <span>{filteredMarkets.length} market ditampilkan</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('volume')}
              className={`px-2 py-1 rounded ${sortBy === 'volume' ? 'text-yellow-400' : 'hover:text-white'}`}
            >
              Vol
            </button>
            <button
              onClick={() => setSortBy('change')}
              className={`px-2 py-1 rounded ${sortBy === 'change' ? 'text-yellow-400' : 'hover:text-white'}`}
            >
              Perubahan
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded ${sortBy === 'name' ? 'text-yellow-400' : 'hover:text-white'}`}
            >
              Nama
            </button>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-[40px_1fr_160px_120px_100px] gap-4 px-4 py-3 text-xs text-gray-500 border-b border-gray-800 font-medium">
          <span></span>
          <span>Nama</span>
          <span className="text-right">Harga Terakhir</span>
          <span className="text-right">24H Vol</span>
          <span className="text-right">24H Chg</span>
        </div>

        <div>
          {paginatedMarkets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🔍</div>
              <p>Tidak ada market ditemukan</p>
            </div>
          ) : (
            paginatedMarkets.map(market => {
              const changeColor = market.change24h >= 0 ? 'text-green-400' : 'text-red-400';
              const changePrefix = market.change24h >= 0 ? '+' : '';
              const isFav = favorites.has(market.symbol);

              return (
                <div
                  key={market.symbol}
                  className="grid grid-cols-[40px_1fr_160px_120px_100px] gap-4 px-4 py-3 items-center border-b border-gray-800/50 hover:bg-[#1e2329] transition-colors cursor-pointer"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(market.symbol); }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {isFav ? '⭐' : '☆'}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-base">
                      {market.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{market.symbol}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{market.name}</div>
                    </div>
                  </div>

                  <div className="text-right font-medium text-white text-sm">
                    {formatPrice(market.price)}
                  </div>

                  <div className="text-right text-gray-400 text-sm">
                    {formatVolume(market.volume24h)}
                  </div>

                  <div className={`text-right font-semibold text-sm ${changeColor}`}>
                    {changePrefix}{market.change24h.toFixed(2)}%
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-8 flex-wrap">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-[#1e2329] rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ←
            </button>

            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 10) {
                pageNum = i + 1;
              } else if (page <= 5) {
                pageNum = i + 1;
              } else if (page >= totalPages - 4) {
                pageNum = totalPages - 9 + i;
              } else {
                pageNum = page - 4 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    page === pageNum
                      ? 'bg-yellow-400 text-black'
                      : 'bg-[#1e2329] text-gray-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 bg-[#1e2329] rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              →
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Data live dari Indodax API • {totalMarkets} pair IDR tersedia • Auto-refresh setiap 30 detik</p>
          <p className="mt-1">Paper Trading Mode • Bukan saran investasi</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 📋 Checklist Deploy

1. ✅ Update `apps/terminal/src/pages/MarketPage.tsx` dengan kode di atas
2. ✅ Update `apps/terminal/src/App.tsx` dengan routing yang benar
3. ✅ Jalankan `npm run build` di `apps/terminal/`
4. ✅ Restart server (`pm2 restart terminal` atau equivalent)
5. ✅ Hard refresh browser (Ctrl+Shift+R)
6. ✅ Buka http://187.127.178.20:22221/market
7. ✅ Cek browser console (F12) untuk error

---

## 🎯 Expected Result

Setelah fix, halaman `/market` akan menampilkan:
- ✅ 477+ markets (jika API berhasil) atau 100+ markets (fallback)
- ✅ Search bar berfungsi
- ✅ 9 kategori filter
- ✅ Pagination (50 per halaman)
- ✅ Favorites dengan bintang
- ✅ Sort by volume/change/name
- ✅ Format IDR (Rp 1.462.499.000)
- ✅ Volume abbreviation (139,4bn)
- ✅ Auto-refresh setiap 30 detik

---

## 🔍 Debug Commands

Jika masih stuck, jalankan di VPS:

```bash
# Cek apakah build berhasil
cd /home/khuchinque/0-TRADER-COMPANEY/apps/terminal
ls -la dist/

# Cek log server
pm2 logs terminal

# Cek apakah server running
pm2 status

# Test API langsung dari VPS
curl https://indodax.com/api/summaries | head -c 500

# Restart semua
pm2 restart all
```

---

## ⚠️ Penting

- **File `marketsFull.ts`** tidak perlu di-update karena sudah ada fallback data
- **Yang penting** adalah `MarketPage.tsx` dan `App.tsx` sudah benar
- Jika CORS proxy gagal, akan otomatis pakai fallback data (100+ markets)
- Hard refresh browser setelah deploy (Ctrl+Shift+R)
