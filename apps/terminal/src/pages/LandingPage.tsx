import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const [markets, setMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load market data
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const response = await fetch('http://localhost:11110/api/markets')
        const data = await response.json()
        
        // Get top pairs by volume
        const sorted = data.markets
          .sort((a: any, b: any) => (b.volume24h || 0) - (a.volume24h || 0))
          .slice(0, 8)
        
        setMarkets(sorted)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load markets:', error)
        setLoading(false)
      }
    }
    loadMarkets()
  }, [])

  const formatPrice = (price: number, quote: string): string => {
    if (quote === 'IDR') {
      return `Rp ${price.toLocaleString('id-ID')}`
    }
    return price < 1 
      ? `$${price.toFixed(6)}`
      : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getChangeColor = (change: number): string => {
    return change >= 0 ? 'text-green-500' : 'text-red-500'
  }

  const getChangeIcon = (change: number): string => {
    return change >= 0 ? '↑' : '↓'
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      {/* Header - Indodax Style */}
      <header className="bg-[#1e2329] border-b border-[#2b3139] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                <span className="text-[#0b0e11] font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-xl text-yellow-400">ChinQueTrade</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/market" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Market
              </Link>
              <Link to="/trade/BTCIDR" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Trade
              </Link>
              <Link to="/portfolio" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Portfolio
              </Link>
              <Link to="/learn" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Learn
              </Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Login
              </button>
              <button className="px-4 py-2 bg-yellow-400 text-[#0b0e11] text-sm font-bold rounded hover:bg-yellow-300 transition-colors">
                Daftar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Indodax Style */}
      <section className="bg-gradient-to-br from-[#1e2329] via-[#0b0e11] to-[#1e2329] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-block px-3 py-1 bg-yellow-400/20 text-yellow-400 text-sm font-medium rounded-full mb-6">
                🇮🇩 Platform Kripto Indonesia Terpercaya
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Jual Beli{' '}
                <span className="text-yellow-400">Bitcoin</span> dan{' '}
                <span className="text-yellow-400">Trading Kripto</span>{' '}
                Indonesia
              </h1>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Investasi kripto mudah dan aman untuk tabungan #AsetMasaDepan. 
                Bergabung dengan jutaan member Indonesia dan mulai trading hari ini.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-yellow-400 text-[#0b0e11] font-bold rounded-lg hover:bg-yellow-300 transition-all transform hover:scale-105">
                  Mulai Trading
                </button>
                <button className="px-8 py-4 bg-[#2b3139] text-white font-bold rounded-lg hover:bg-[#3d444d] transition-all">
                  Download App
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-12">
                <div>
                  <div className="text-3xl font-bold text-yellow-400">500+</div>
                  <div className="text-gray-500 text-sm">Koin Tersedia</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400">6.6M+</div>
                  <div className="text-gray-500 text-sm">Member Terdaftar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400">2014</div>
                  <div className="text-gray-500 text-sm">Sejak Pertama</div>
                </div>
              </div>
            </div>

            {/* Right Content - Featured Pairs */}
            <div className="bg-[#1e2329] rounded-2xl p-6 border border-[#2b3139]">
              <h2 className="text-xl font-bold mb-4">Market Populer</h2>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-[#2b3139] rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {markets.map((market) => (
                    <Link
                      key={market.symbol}
                      to={`/trade/${market.symbol}`}
                      className="flex items-center justify-between p-3 hover:bg-[#2b3139] rounded-lg transition-colors block"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2b3139] flex items-center justify-center text-sm font-bold">
                          {market.baseAsset.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium">{market.symbol}</div>
                          <div className="text-xs text-gray-500">
                            {market.baseAsset}/{market.quoteAsset}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {formatPrice(parseFloat(market.price) || 0, market.quoteAsset)}
                        </div>
                        <div className={`text-xs ${getChangeColor(market.change24h || 0)}`}>
                          {getChangeIcon(market.change24h || 0)} {Math.abs(market.change24h || 0).toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              <Link
                to="/market"
                className="block text-center mt-4 text-yellow-400 hover:text-yellow-300 text-sm font-medium"
              >
                Lihat Semua Pasar →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-[#1e2329]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Kenapa Memilih ChinQueTrade?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#0b0e11] rounded-xl p-6 border border-[#2b3139] hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Aman & Terpercaya</h3>
              <p className="text-gray-400">
                Berizin dan diawasi oleh OJK serta terdaftar di Bappebti. Keamanan aset adalah prioritas utama kami.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0b0e11] rounded-xl p-6 border border-[#2b3139] hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Transaksi Cepat</h3>
              <p className="text-gray-400">
                Eksekusi order dalam hitungan milidetik dengan liquidity tinggi. Trading tanpa hambatan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0b0e11] rounded-xl p-6 border border-[#2b3139] hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Biaya Rendah</h3>
              <p className="text-gray-400">
                Trading fee mulai dari 0.1%. Transparan tanpa biaya tersembunyi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-[#2b3139]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-500 text-sm mb-8">
            TERDAFTAR & DIAWASI OLEH
          </p>
          <div className="flex flex-wrap justify-center gap-12 items-center opacity-70">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">OJK</div>
              <div className="text-xs text-gray-500">Otoritas Jasa Keuangan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">BAPPEBTI</div>
              <div className="text-xs text-gray-500">Badan Pengawas Perdagangan Berjangka</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">ISO 27001</div>
              <div className="text-xs text-gray-500">Information Security</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">ISO 9001</div>
              <div className="text-xs text-gray-500">Quality Management</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0b0e11] mb-4">
            Mulai Investasi Kripto Hari Ini
          </h2>
          <p className="text-[#0b0e11]/80 text-lg mb-8">
            Daftar sekarang dan dapatkan bonus deposit pertama hingga Rp 100.000
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 bg-[#0b0e11] text-white font-bold rounded-lg hover:bg-[#1e2329] transition-colors">
              Daftar Sekarang
            </button>
            <button className="px-8 py-4 bg-white text-[#0b0e11] font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Pelajari Lebih Lanjut
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e2329] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Column 1 */}
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                  <span className="text-[#0b0e11] font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-xl text-yellow-400">ChinQueTrade</span>
              </Link>
              <p className="text-gray-500 text-sm">
                Platform jual beli Bitcoin dan aset kripto terpercaya di Indonesia sejak 2014.
              </p>
            </div>

            {/* Column 2 */}
            <div>
              <h4 className="font-bold mb-4">Produk</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/market" className="hover:text-white">Market</Link></li>
                <li><Link to="/trade/BTCIDR" className="hover:text-white">Spot Trading</Link></li>
                <li><Link to="/portfolio" className="hover:text-white">Portfolio</Link></li>
                <li><Link to="/learn" className="hover:text-white">Learn & Earn</Link></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h4 className="font-bold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white">Karir</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Kontak</a></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-white">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-white">Risk Disclosure</a></li>
                <li><a href="#" className="hover:text-white">AML Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2b3139] pt-8 text-center text-sm text-gray-500">
            <p className="mb-2">
              © 2024 ChinQueTrade. All rights reserved. Paper Trading Demo - No Real Money
            </p>
            <p className="text-xs">
              Trading aset kripto mengandung risiko tinggi. Pastikan Anda memahami risiko sebelum berinvestasi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
