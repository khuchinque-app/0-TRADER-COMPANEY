import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface HeaderProps {
  symbol: string
  price: number
  change24h: number
  showIDR: boolean
  onToggleIDR: () => void
}

const Header: React.FC<HeaderProps> = ({ 
  symbol, 
  price, 
  change24h, 
  showIDR, 
  onToggleIDR 
}) => {
  const [idrate, setIdrate] = useState(15850)
  const location = useLocation()

  useEffect(() => {
    // Fetch ID-rate
    fetch('http://localhost:11110/api/fx/usdt-idr')
      .then(r => r.json())
      .then(data => setIdrate(data.rate || 15850))
      .catch(() => {})
  }, [])

  const formatPrice = (p: number) => {
    if (showIDR) {
      return `Rp ${Math.round(p * idrate).toLocaleString('id-ID')}`
    }
    return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const isTradePage = location.pathname.startsWith('/trade/')

  return (
    <div className="bg-[#1e2329] border-b border-[#2b3139] px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
            <span className="text-[#0b0e11] font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-yellow-400 text-lg">ChinQueTrade</span>
        </Link>

        {/* Market Selector - Show Only on Trade Page */}
        {isTradePage && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#0b0e11] rounded-lg">
              <span className="text-gray-400 text-sm">{symbol}</span>
              <span className="text-white font-bold text-lg">{symbol}/IDR</span>
            </div>
            
            {/* Price Display */}
            <div className="text-right">
              <div className="text-white font-mono font-bold text-lg">
                {formatPrice(price)}
              </div>
              <div className={`text-sm ${change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </div>
            </div>

            {/* IDR Toggle */}
            <button
              onClick={onToggleIDR}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showIDR
                  ? 'bg-yellow-400 text-[#0b0e11]'
                  : 'bg-[#2b3139] text-gray-400 hover:text-white'
              }`}
            >
              {showIDR ? 'IDR' : 'USD'}
            </button>
          </div>
        )}

        {/* Navigation - Show On Landing Page */}
        {!isTradePage && (
          <nav className="flex items-center gap-6">
            <Link to="/market" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Market
            </Link>
            <Link to="/trade/BTCIDR" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Trade
            </Link>
            <Link to="/portfolio" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Portfolio
            </Link>
            <button className="px-4 py-2 bg-yellow-400 text-[#0b0e11] text-sm font-bold rounded hover:bg-yellow-300 transition-colors">
              Daftar
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}

export default Header
