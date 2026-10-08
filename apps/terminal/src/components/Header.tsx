import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <>
      <header className="bg-[#1e2329] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-black font-bold text-sm">C</span>
              </div>
              <span className="text-white font-bold text-xl">ChinQue<span className="text-yellow-400">Trade</span></span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Beranda
              </Link>
              <Link to="/market" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Market
              </Link>
              <Link to="/trade/BTCIDR" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Trading
              </Link>
              <Link to="/portfolio" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Portfolio
              </Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#0b0e11] border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-white text-sm font-medium hidden sm:block">{user.name}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#1e2329] border border-gray-700 rounded-lg shadow-xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-white text-sm font-medium">{user.name}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                      <Link
                        to="/portfolio"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#0b0e11] hover:text-white transition-colors"
                      >
                        Portfolio Saya
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#0b0e11] hover:text-white transition-colors"
                      >
                        Riwayat Transaksi
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#0b0e11] transition-colors"
                      >
                        Keluar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors text-sm"
                >
                  Masuk / Daftar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
