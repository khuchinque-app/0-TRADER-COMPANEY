import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

interface MarketPair {
  symbol: string
  base: string
  quote: string
  name: string
  price: number
  priceIdr: number
  change24h: number
  volume24h: number
  marketCap: number
  category: 'IDR' | 'USDT' | 'MEME' | 'NEW' | 'DEFI' | 'LAYER1'
  logo?: string
}

const MarketPage: React.FC = () => {
  const [markets, setMarkets] = useState<MarketPair[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [_sortBy, _setSortBy] = useState<'volume' | 'change' | 'name'>('volume')
  const [favorites, setFavorites] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const itemsPerPage = 50
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const response = await fetch('http://localhost:11110/api/markets')
        const data = await response.json()
        
        // Categorize and format markets
        const categorized: MarketPair[] = data.markets.map((m: any) => ({
            symbol: m.symbol,
            base: m.baseAsset,
            quote: m.quoteAsset,
            name: getCoinName(m.baseAsset),
            price: parseFloat(m.price) || generatePrice(m.baseAsset, m.quoteAsset),
            change24h: (Math.random() - 0.5) * 20,
            volume24h: Math.random() * 1000000000,
            category: m.quoteAsset === 'IDR' ? 'IDR' : m.quoteAsset === 'USDT' ? 'USDT' : 'IDR',
            logo: `/assets/logos/${m.baseAsset.toLowerCase()}.svg`,
          }))
        
        // Sort by volume
        categorized.sort((a, b) => b.volume24h - a.volume24h)
        
        setMarkets(categorized)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load markets:', error)
        setLoading(false)
      }
    }

    loadMarkets()
  }, [])

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chinque_favorites')
    if (saved) {
      setFavorites(JSON.parse(saved))
    }
  }, [])

  const toggleFavorite = (symbol: string) => {
    const newFavs = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol]
    
    setFavorites(newFavs)
    localStorage.setItem('chinque_favorites', JSON.stringify(newFavs))
  }

  const getCoinName = (symbol: string): string => {
    const names: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'BNB': 'BNB',
      'XRP': 'XRP',
      'ADA': 'Cardano',
      'DOGE': 'Dogecoin',
      'DOT': 'Polkadot',
      'MATIC': 'Polygon',
      'LINK': 'Chainlink',
      'AVAX': 'Avalanche',
      'UNI': 'Uniswap',
      'ATOM': 'Cosmos',
      'LTC': 'Litecoin',
      'XLM': 'Stellar',
      'ALGO': 'Algorand',
      'VET': 'VeChain',
      'FIL': 'Filecoin',
      'TRX': 'TRON',
      'ETC': 'Ethereum Classic',
      'XMR': 'Monero',
      'AAVE': 'Aave',
      'MKR': 'Maker',
      'COMP': 'Compound',
      'SUSHI': 'SushiSwap',
      'YFI': 'yearn.finance',
      'SNX': 'Synthetix',
      'CRV': 'Curve DAO Token',
      'BAL': 'Balancer',
      'REN': 'Ren',
      'ZRX': '0x',
      'KNC': 'Kyber Network',
      'BNT': 'Bancor',
      'STORJ': 'Storj',
      'GRT': 'The Graph',
      'ENJ': 'Enjin Coin',
      'CHZ': 'Chiliz',
      'BAT': 'Basic Attention Token',
      'ZIL': 'Zilliqa',
      'HOT': 'Holo',
      'IOST': 'IOST',
      'ONE': 'Harmony',
      'FTM': 'Fantom',
      'NEAR': 'NEAR Protocol',
      'APT': 'Aptos',
      'SUI': 'Sui',
      'SEI': 'Sei',
      'TIA': 'Celestia',
      'DYP': 'Dypius',
      'MEME': 'Memecoin',
      'PEPE': 'Pepe',
      'BONK': 'Bonk',
      'WIF': 'dogwifhat',
      'FARTCOIN': 'Fartcoin',
      'USELESS': 'Useless Coin',
      'PM': 'PumpMeme',
      'COL': 'Clash of Lilliput',
      'BR': 'Bedrock',
      'HYPE': 'Hyperliquid',
      'ASTER': 'Aster',
      'NOVA': 'NOVA',
      'UAI': 'UnifAI Network',
      'MCT': 'Metacraft',
      'TROLLSOL': 'TROLL (SOL)',
      'PENGU': 'Pudgy Penguins',
      'MUBARAK': 'Mubarak',
      'STIK': 'Staika',
      'QNT': 'Quant',
      'WLD': 'Worldcoin',
      'SAND': 'The Sandbox',
      'AXS': 'Axie Infinity',      'APE': 'ApeCoin',
      'IMX': 'Immutable X',
      'GALA': 'Gala',
      'ILV': 'Illuvium',
      'PYR': 'Rly Token',
      'SUPER': 'SuperFarm',
      'SLP': 'Smooth Love Potion',
      'STAR': 'StarAtlas',
      'ANC': 'Anchor',
      'LOOKS': 'LooksRare',
      'ENS': 'Ethereum Name Service',
      'RPL': 'Rocket Pool',
      'EUL': 'Euler',
      'PERP': 'Perpetual Protocol',
      'API3': 'API3',
      'BADGER': 'Badger DAO',
      'KEEP': 'Keep Network',
      'NKN': 'NKN',
      'OCEAN': 'Ocean Protocol',
      'BAND': 'Band Protocol',
      'CELR': 'Celer Network',
      'CVC': 'Civic',
      'DATA': 'Streamr DATAcoin',
      'DENT': 'Dent',
      'DOCK': 'Dock',
      'DUSK': 'Dusk',
      'EVX': 'evx.io',
      'FUN': 'FunFair',
      'GSWAP': 'G-Swap',
      'HEX': 'HEX',
      'ICX': 'ICON',
      'KAVA': 'Kava',
      'KMD': 'Komodo',
      'KSM': 'Kusama',
      'LRC': 'Loopring',
      'MANA': 'Decentraland',
      'MINA': 'Mina',
      'MLN': 'Enzyme',
      'MOVER': 'Mover',
      'NMR': 'Numeraire',
      'NU': 'NuCypher',
      'OMG': 'OMG Network',
      'ONT': 'Ontology',
      'ORN': 'Orion Protocol',
      'PHA': 'Phala Network',
      'POLY': 'Polymath',
      'POLS': 'Polkastarter',
      'POND': 'Marlin',
      'QSP': 'Quantstamp',
      'RAD': 'Radicle',
      'RARI': 'Rarible',
      'RENBTC': 'renBTC',
      'ROOK': 'Keeper DAO',
      'RUNE': 'THORChain',
      'SCRT': 'Secret',
      'SFP': 'SafePal',
      'SNT': 'Status',
      'SOC': 'Socios.com',
      'SUSD': 'Synth sUSD',
      'SXP': 'Swipe',
      'SYS': 'Syscoin',
      'T': 'Terrarium',
      'TFUEL': 'Theta Fuel',
      'TOMOE': 'TOMOE',
      'TORN': 'Tornado Cash',
      'TRB': 'Tellor',
      'TROY': 'Troy',
      'TWT': 'Trust Wallet Token',
      'UST': 'TerraUSD',
      'UTK': 'UTRK',
      'VANRY': 'Vanar Chain',
      'VOXEL': 'Voxies',
      'WRX': 'WazirX',
      'XEC': 'eCash',
      'XEM': 'NEM',
      'XTZ': 'Tezos',
      'XVS': 'Venus',
      'ZEC': 'Zcash',
      'ZEN': 'Horizen',
    }
    return names[symbol] || symbol
  }

  const generatePrice = (base: string, quote: string): number => {
    // Generate realistic prices based on coin
    const prices: Record<string, number> = {
      'BTC': quote === 'IDR' ? 1500000000 : 60000,
      'ETH': quote === 'IDR' ? 45000000 : 3500,
      'SOL': quote === 'IDR' ? 2000000 : 150,
      'BNB': quote === 'IDR' ? 13000000 : 580,
      'XRP': quote === 'IDR' ? 25000 : 0.52,
      'ADA': quote === 'IDR' ? 4500 : 0.015,
      'DOGE': quote === 'IDR' ? 1500 : 0.005,
      'DOT': quote === 'IDR' ? 30000 : 10,
      'MATIC': quote === 'IDR' ? 5000 : 0.007,
      'LINK': quote === 'IDR' ? 250000 : 14.5,
      'AVAX': quote === 'IDR' ? 200000 : 55,
      'UNI': quote === 'IDR' ? 200000 : 12,
      'ATOM': quote === 'IDR' ? 300000 : 18,
      'LTC': quote === 'IDR' ? 2500000 : 150,
      'XLM': quote === 'IDR' ? 3500 : 0.005,
      'ALGO': quote === 'IDR' ? 2000 : 0.001,
      'VET': quote === 'IDR' ? 500 : 0.02,
      'FIL': quote === 'IDR' ? 200000 : 12,
      'TRX': quote === 'IDR' ? 500 : 0.005,
      'ETC': quote === 'IDR' ? 1000000 : 45,
      'XMR': quote === 'IDR' ? 3000000 : 175,
      'AAVE': quote === 'IDR' ? 4500000 : 265,
    }
    return prices[base] || (quote === 'IDR' ? Math.random() * 100000 : Math.random() * 100)
  }

  const formatPrice = (price: number, quote: string): string => {
    if (quote === 'IDR') {
      return `Rp ${price.toLocaleString('id-ID')}`
    }
    return price < 1 
      ? `$${price.toFixed(6)}`
      : price < 100 
        ? `$${price.toFixed(4)}`
        : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatVolume = (vol: number): string => {
    if (vol >= 1e12) return `${(vol / 1e12).toFixed(2)}T`
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`
    return vol.toFixed(2)
  }

  // Use _sortBy to avoid unused variable warning, but we need it for useMemo
  const sortBy = _sortBy

  const filteredMarkets = useMemo(() => {
    let result = markets
      .filter(m => 
        (m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === 'all' || m.category === filterCategory)
      )
      .sort((a, b) => {
        // Favorites first
        const aFav = favorites.includes(a.symbol) ? 1 : 0
        const bFav = favorites.includes(b.symbol) ? 1 : 0
        if (aFav !== bFav) return bFav - aFav
        
        // Then by selected sort
        if (sortBy === 'volume') return b.volume24h - a.volume24h
        if (sortBy === 'change') return b.change24h - a.change24h
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return 0
      })

    return result
  }, [markets, searchTerm, filterCategory, sortBy, favorites])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e11]">
        <div className="text-center">
          <div className="text-yellow-400 text-2xl font-bold mb-4">ChinQueTrade</div>
          <div className="text-gray-500 animate-pulse">Loading markets...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      {/* Header - Indodax Style */}
      <div className="bg-[#1e2329] border-b border-[#2b3139] px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                <span className="text-[#0b0e11] font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-yellow-400 text-lg">ChinQueTrade</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link to="/market" className="text-white font-medium border-b-2 border-yellow-400 pb-1">
                Market
              </Link>
              <Link to="/trade/BTCIDR" className="text-gray-400 hover:text-white transition-colors">
                Trade
              </Link>
              <Link to="/portfolio" className="text-gray-400 hover:text-white transition-colors">
                Portfolio
              </Link>
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition-colors">
              Trade Pro
            </button>
            <div className="text-xs text-gray-500">
              <span className="text-yellow-400">DEMO</span> • Paper Trading
            </div>
          </div>
        </div>
      </div>

      {/* Market Header - Indodax Style */}
      <div className="bg-[#1e2329] border-b border-[#2b3139] px-4 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Market Kategori</h1>
              <p className="text-gray-500 text-sm mt-1">
                {filteredMarkets.length} Aset Kripto Tersedia
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-gray-500 text-xs">BTC/IDR</div>
                <div className="font-mono font-semibold">
                  {formatPrice(
                    markets.find(m => m.symbol === 'BTCIDR')?.price || 1500000000,
                    'IDR'
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs">ETH/IDR</div>
                <div className="font-mono font-semibold">
                  {formatPrice(
                    markets.find(m => m.symbol === 'ETHIDR')?.price || 45000000,
                    'IDR'
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs">SOL/IDR</div>
                <div className="font-mono font-semibold">
                  {formatPrice(
                    markets.find(m => m.symbol === 'SOLIDR')?.price || 2000000,
                    'IDR'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Cari koin atau pair..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filters - Indodax Style */}
            <div className="flex items-center gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'IDR', label: 'IDR Market' },
                { key: 'USDT', label: 'USDT Market' },
                { key: 'MEME', label: 'MEME' },
                { key: 'NEW', label: 'New Coin' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key as any)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    filterCategory === cat.key
                      ? 'bg-yellow-400 text-[#0b0e11]'
                      : 'bg-[#2b3139] text-gray-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Market Table - Indodax Style */}
      <div className="px-4 py-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="bg-[#1e2329] rounded-lg border border-[#2b3139] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#0b0e11] border-b border-[#2b3139] text-xs text-gray-500 font-medium">
              <div className="col-span-1"></div>
              <div className="col-span-4">Nama</div>
              <div className="col-span-2 text-right">Harga Terakhir</div>
              <div className="col-span-2 text-right">24H Vol</div>
              <div className="col-span-2 text-right">24H Chg</div>
              <div className="col-span-1 text-center">Aksi</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#2b3139]">
              {filteredMarkets.map((market) => (
                <div
                  key={market.symbol}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[#2b3139]/30 transition-colors items-center"
                >
                  {/* Favorite Star */}
                  <div className="col-span-1">
                    <button
                      onClick={() => toggleFavorite(market.symbol)}
                      className="text-xl hover:scale-110 transition-transform"
                    >
                      {favorites.includes(market.symbol) ? (
                        <span className="text-yellow-400">★</span>
                      ) : (
                        <span className="text-gray-600">☆</span>
                      )}
                    </button>
                  </div>

                  {/* Coin Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2b3139] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {market.base.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{market.symbol}</div>
                      <div className="text-xs text-gray-500">{market.name}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right font-mono text-sm">
                    {formatPrice(market.price, market.quote)}
                  </div>

                  {/* Volume */}
                  <div className="col-span-2 text-right text-gray-400 text-sm font-mono">
                    {formatVolume(market.volume24h)}
                  </div>

                  {/* Change */}
                  <div className="col-span-2 text-right">
                    <span className={`font-mono text-sm ${
                      market.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                    </span>
                  </div>

                  {/* Trade Button */}
                  <div className="col-span-1 text-center">
                    <Link
                      to={`/trade/${market.symbol}`}
                      className="px-3 py-1.5 bg-green-500/20 text-green-500 text-xs font-medium rounded hover:bg-green-500/30 transition-colors"
                    >
                      Trade
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-[#2b3139] flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Menampilkan {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredMarkets.length)} dari {filteredMarkets.length} pasar
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-[#2b3139] text-gray-400 rounded text-sm hover:bg-[#3d444d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">
                  Halaman {page} / {Math.ceil(filteredMarkets.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(filteredMarkets.length / itemsPerPage), p + 1))}
                  disabled={page >= Math.ceil(filteredMarkets.length / itemsPerPage)}
                  className="px-3 py-1 bg-[#2b3139] text-gray-400 rounded text-sm hover:bg-[#3d444d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#2b3139] px-4 py-6 text-center text-xs text-gray-500">
        <p className="mb-2">
          Paper Trading Mode — Simulated Data • {markets.length} Pairs Available
        </p>
        <p>
          Aset kripto bersifat fluktuatif dengan potensi keuntungan dan risiko kerugian yang tinggi.
        </p>
      </div>
    </div>
  )
}

export default MarketPage
