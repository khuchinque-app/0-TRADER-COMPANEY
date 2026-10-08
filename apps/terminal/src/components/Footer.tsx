import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1e2329] border-t border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-black font-bold text-sm">C</span>
              </div>
              <span className="text-white font-bold text-xl">ChinQue<span className="text-yellow-400">Trade</span></span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Platform trading crypto Indonesia terlengkap dengan 1000+ pair trading.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-[#0b0e11] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-[#0b0e11] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.041c-5.517 0-10 4.484-10 10.012 0 4.415 2.862 8.166 6.836 9.505.499.09.679-.217.679-.481 0-.238-.01-1.026-.014-1.863-2.775.604-3.36-1.183-3.36-1.183-.452-1.151-1.105-1.458-1.105-1.458-.902-.618.069-.605.069-.605 1.002.07 1.527 1.03 1.527 1.03.89 1.524 2.336 1.084 2.906.829.091-.645.349-1.085.635-1.335-2.214-.252-4.542-1.107-4.542-4.93 0-1.087.389-1.979 1.024-2.675-.101-.252-.443-1.268.098-2.64 0 0 .837-.269 2.74 1.021a9.564 9.564 0 012.496-.336c.84.004 1.681.114 2.48.336 1.902-1.29 2.738-1.021 2.738-1.021.542 1.372.201 2.387.099 2.64.636.696 1.022 1.587 1.022 2.675 0 3.833-2.33 4.673-4.552 4.922.355.307.672.916.672 1.846 0 1.334-.012 2.41-.012 2.737 0 .267.178.577.687.479C19.143 20.213 22 16.466 22 12.053c0-5.528-4.477-10.012-10-10.012z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-[#0b0e11] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produk</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/market" className="text-gray-400 hover:text-white transition-colors">Market</Link></li>
              <li><Link to="/trade/BTCIDR" className="text-gray-400 hover:text-white transition-colors">Trading</Link></li>
              <li><Link to="/portfolio" className="text-gray-400 hover:text-white transition-colors">Portfolio</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Wallet</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Trading</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Perusahaan</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Karir</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Affiliate</a></li>
              <li><Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Bantuan</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pusat Bantuan</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Hubungi Kami</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Status Sistem</a></li>
              <li><Link to="/trade_api" className="text-gray-400 hover:text-white transition-colors">Trade API</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} ChinQueTrade. All rights reserved. Paper Trading Demo.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>🇮🇩 Indonesia</span>
            <span>•</span>
            <span>1000+ Markets</span>
            <span>•</span>
            <span>✅ Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
