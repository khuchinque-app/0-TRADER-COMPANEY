--- src/pages/MarketPage.tsx (原始)
import { useState, useMemo } from 'react';
import { MARKETS, Market } from '../data/marketsFull';

export default function MarketPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'volume' | 'change' | 'name'>('volume');
  const ITEMS_PER_PAGE = 10;

  const filteredMarkets = useMemo(() => {
    let filtered = [...MARKETS];

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
  }, [search, category, favorites, sortBy]);

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
    { key: 'all', label: 'Semua' },
    { key: 'favorite', label: '⭐ Favorit' },
    { key: 'gainers', label: '📈 Naik' },
    { key: 'losers', label: '📉 Turun' },
    { key: 'defi', label: 'DeFi' },
    { key: 'meme', label: 'Meme' },
  ];

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 6 })}`;
    }
    return `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1).replace('.', ',')}bn`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1).replace('.', ',')}mn`;
    }
    return volume.toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Market Crypto</h1>
          <p className="text-gray-500 text-sm">Cek harga crypto (IDR) hari ini. Data referensi dari Indodax.</p>
        </div>

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari market..."
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <span>{filteredMarkets.length} market ditemukan</span>
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

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[40px_1fr_160px_120px_100px] gap-4 px-4 py-3 text-xs text-gray-500 border-b border-gray-800 font-medium">
          <span></span>
          <span>Nama</span>
          <span className="text-right">Harga Terakhir</span>
          <span className="text-right">24H Vol</span>
          <span className="text-right">24H Chg</span>
        </div>

        {/* Market Rows */}
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
                  className="grid grid-cols-[40px_1fr_160px_120px_100px] gap-4 px-4 py-4 items-center border-b border-gray-800/50 hover:bg-[#1e2329] transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/trade/${market.symbol}`}
                >
                  {/* Favorite */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(market.symbol); }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {isFav ? '⭐' : '☆'}
                  </button>

                  {/* Name + Icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-lg">
                      {market.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{market.symbol}</div>
                      <div className="text-xs text-gray-500">{market.name}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right font-medium text-white text-sm">
                    {formatPrice(market.price)}
                  </div>

                  {/* Volume */}
                  <div className="text-right text-gray-400 text-sm">
                    {formatVolume(market.volume24h)}
                  </div>

                  {/* Change */}
                  <div className={`text-right font-semibold text-sm ${changeColor}`}>
                    {changePrefix}{market.change24h.toFixed(2)}%
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-[#1e2329] rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  page === p
                    ? 'bg-yellow-400 text-black'
                    : 'bg-[#1e2329] text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 bg-[#1e2329] rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Data referensi dari Indodax • Paper Trading Mode • Bukan saran investasi</p>
        </div>
      </div>
    </div>
  );
}


+++ src/pages/MarketPage.tsx (修改后)
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
        // Try fetching from Indodax API via CORS proxy
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

              // Determine category
              let cat: Market['category'] = 'all';
              const memeCoins = ['DOGE', 'SHIB', 'PEPE', 'FARTCOIN', 'BONK', 'FLOKI', 'WIF', 'POPCAT', 'MOG', 'BRETT', 'MUBARAK', 'TROLLSOL', 'SUNDOG', 'PUMP', 'PM', 'USELESS', 'MARSCOIN', 'PIPPIN', 'BOME', 'CHILLGUY', 'NEIROCTO', 'GOAT', 'PNUT', 'PONKE', 'MYRO', 'APU', 'RFC', 'MOONPIG', 'BAN', 'GIGA', 'LUNA', 'LUNC'];
              const defiCoins = ['AAVE', 'UNI', 'COMP', 'SNX', 'CRV', 'SUSHI', 'YFI', 'YFII', 'BAL', '1INCH', 'LINK', 'OGN', 'RLC', 'MET', 'ENA', 'ONDO', 'BR', 'GTC', 'CST', 'HONEY', 'UAI', 'JUP', 'RAY', 'ORCA', 'PENDLE', 'MORPHO', 'LDO', 'MKR', 'RPL', 'SSV'];
              const gamingCoins = ['SAND', 'MANA', 'AXS', 'GALA', 'IMX', 'MCT', 'VANRY', 'BEAT', 'HIGH', 'PIXEL', 'PORTAL', 'MAGIC', 'SLP', 'VOXEL', 'GALAGAMES', 'COL', 'DAR', 'JELLYJELLY', 'ALICE', 'MYRIA'];
              const layer1Coins = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'NEAR', 'SUI', 'ATOM', 'ALGO', 'HBAR', 'FTM', 'ICP', 'VET', 'LTC', 'TRX', 'XLM', 'EOS', 'XTZ', 'NEO', 'QNT', 'BNB', 'THETA', 'ONE', 'FIL', 'AR'];
              const layer2Coins = ['ARB', 'OP', 'MATIC', 'IMX', 'STRK', 'MANTA', 'METIS', 'MODE', 'BLAST', 'LINEA', 'SCROLL', 'ZKJ'];

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
                icon: getIcon(base),
                price: lastPrice,
                change24h: parseFloat(change.toFixed(2)),
                volume24h: parseFloat(ticker.vol_idr || '0'),
                high24h: parseFloat(ticker.high || '0'),
                low24h: parseFloat(ticker.low || '0'),
                category: cat,
              };
            })
            .filter(m => m.volume24h > 0) // Filter out dead markets
            .sort((a, b) => b.volume24h - a.volume24h);

          if (parsedMarkets.length > 0) {
            setMarkets(parsedMarkets);
            setTotalMarkets(parsedMarkets.length);
          }
        }
      } catch (error) {
        console.log('Using fallback market data (CORS blocked Indodax API)');
        setTotalMarkets(FALLBACK_MARKETS.length);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    // Refresh every 30 seconds
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
        {/* Header */}
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

        {/* Search + Categories */}
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

        {/* Stats Bar */}
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

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[40px_1fr_160px_120px_100px] gap-4 px-4 py-3 text-xs text-gray-500 border-b border-gray-800 font-medium">
          <span></span>
          <span>Nama</span>
          <span className="text-right">Harga Terakhir</span>
          <span className="text-right">24H Vol</span>
          <span className="text-right">24H Chg</span>
        </div>

        {/* Market Rows */}
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
                  {/* Favorite */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(market.symbol); }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {isFav ? '⭐' : '☆'}
                  </button>

                  {/* Name + Icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-base">
                      {market.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{market.symbol}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{market.name}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right font-medium text-white text-sm">
                    {formatPrice(market.price)}
                  </div>

                  {/* Volume */}
                  <div className="text-right text-gray-400 text-sm">
                    {formatVolume(market.volume24h)}
                  </div>

                  {/* Change */}
                  <div className={`text-right font-semibold text-sm ${changeColor}`}>
                    {changePrefix}{market.change24h.toFixed(2)}%
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
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
              // Show first 5 pages, last 5 pages, or pages around current
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

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Data live dari Indodax API • {totalMarkets} pair IDR tersedia • Auto-refresh setiap 30 detik</p>
          <p className="mt-1">Paper Trading Mode • Bukan saran investasi</p>
        </div>
      </div>
    </div>
  );
}

// Icon mapping for common coins
function getIcon(base: string): string {
  const icons: Record<string, string> = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', DOGE: '🐕', ADA: '₳',
    DOT: '●', AVAX: '🔺', LINK: '⬡', MATIC: '⬢', UNI: '🦄', AAVE: '👻',
    ATOM: '⚛', LTC: 'Ł', SHIB: '🐕', TRX: '⬡', FIL: '⨍', ALGO: 'Å',
    NEAR: 'Ⓝ', SUI: '💧', HBAR: 'ℏ', VET: '✓', ICP: '∞', USDT: '💲',
    USDC: '$', BNB: '⬡', PEPE: '🐸', BONK: '🐕', FLOKI: '🐕',
    HYPE: '🔥', FARTCOIN: '💨', BR: '🪨', ONDO: '🌊', HONEY: '🍯',
    MCT: '⛏', VANRY: '🎮', OGN: '🔶', QNT: 'Ⓠ', MET: '☄', ENA: '🔷',
    UAI: '🤖', NOVA: '🌟', XLM: '✦', RLC: '⬡', MUBARAK: '🎉',
    MARSCOIN: '🔴', PIPPIN: '🐧', PM: '💊', USELESS: '🗑', AURA: '✨',
    PENGU: '🐧', W3S: '📸', STIK: '📚', WLD: '🌍', GTC: '🟢',
    CST: '♻', ANOA: '🐃', YFII: '🏦', SUNDOG: '🌞', BEAT: '🎵',
    PUMP: '⛽', ARB: '🔵', SKYAI: '🤖', SAND: '🏖', MANA: '🌐',
    AXS: '🎮', GALA: '🎲', ENJ: '⚡', CHZ: '🌶', XTZ: 'ꜩ',
    NEO: 'Ⓝ', ZIL: 'Ⓩ', ONT: 'Ⓞ', IOST: 'ⓘ', COMP: 'Ⓒ',
    SNX: 'Ⓢ', YFI: '🔷', CRV: '⬡', SUSHI: '🍣', BAL: '⚖',
    ASTER: '✳', TROLLSOL: '🧌', WIF: '🎩', IMX: '⬢',
  };
  return icons[base] || base.charAt(0);
}
