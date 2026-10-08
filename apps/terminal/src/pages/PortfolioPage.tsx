import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Position {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

interface Order {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  amount: number;
  price: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

  useEffect(() => {
    // Mock positions
    const mockPositions: Position[] = [
      {
        id: '1',
        pair: 'BTCIDR',
        side: 'buy',
        amount: 0.05,
        entryPrice: 850000000,
        currentPrice: 862000000,
        pnl: 600000,
        pnlPercent: 1.41,
        openedAt: '2026-10-08 14:30:00'
      },
      {
        id: '2',
        pair: 'ETHIDR',
        side: 'buy',
        amount: 0.5,
        entryPrice: 45000000,
        currentPrice: 44200000,
        pnl: -40000,
        pnlPercent: -1.78,
        openedAt: '2026-10-08 12:15:00'
      },
      {
        id: '3',
        pair: 'SOLIDR',
        side: 'buy',
        amount: 2,
        entryPrice: 1250000,
        currentPrice: 1320000,
        pnl: 140000,
        pnlPercent: 5.6,
        openedAt: '2026-10-07 09:45:00'
      }
    ];

    // Mock orders
    const mockOrders: Order[] = [
      {
        id: '1',
        pair: 'BNBIDR',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 8500000,
        status: 'open',
        createdAt: '2026-10-09 08:00:00'
      },
      {
        id: '2',
        pair: 'XRPIDR',
        side: 'sell',
        type: 'market',
        amount: 100,
        price: 9500,
        status: 'filled',
        createdAt: '2026-10-08 16:30:00'
      }
    ];

    setPositions(mockPositions);
    setOrders(mockOrders);
  }, []);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-400 text-sm">Total Saldo</p>
              <p className="text-xl font-bold text-yellow-400">
                {user ? formatIDR(user.balance_idr) : formatIDR(15850000)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">USDT</p>
              <p className="text-xl font-bold">
                {user ? user.balance_usdt.toLocaleString() : '10,000.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          {[
            { key: 'positions', label: 'Posisi Terbuka' },
            { key: 'orders', label: 'Order Aktif' },
            { key: 'history', label: 'Riwayat' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Positions */}
        {activeTab === 'positions' && (
          <div className="bg-[#1e2329] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_140px_120px_120px_100px] gap-4 px-4 py-3 text-xs text-gray-400 border-b border-gray-800">
              <span>Pair</span>
              <span className="text-right">Harga Entry</span>
              <span className="text-right">Harga Sekarang</span>
              <span className="text-right">PnL</span>
              <span className="text-right">PnL %</span>
              <span>Aksi</span>
            </div>
            {positions.map(pos => (
              <div key={pos.id} className="grid grid-cols-[1fr_120px_140px_120px_120px_100px] gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-[#0b0e11] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-xs">
                    {pos.pair.charAt(0)}
                  </div>
                  <div>
                    <Link to={`/trade/${pos.pair}`} className="font-semibold hover:text-yellow-400">
                      {pos.pair}
                    </Link>
                    <span className={`text-xs ml-2 ${pos.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {pos.side.toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="text-right text-gray-300">{formatIDR(pos.entryPrice)}</span>
                <span className="text-right text-gray-300">{formatIDR(pos.currentPrice)}</span>
                <span className={`text-right font-semibold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatIDR(pos.pnl)}
                </span>
                <span className={`text-right font-semibold ${pos.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                </span>
                <div className="flex gap-2">
                  <Link
                    to={`/trade/${pos.pair}`}
                    className="px-2 py-1 text-xs bg-yellow-400/20 text-yellow-400 rounded hover:bg-yellow-400/30 transition-colors"
                  >
                    Trade
                  </Link>
                  <button className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="bg-[#1e2329] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px_120px_100px_100px] gap-4 px-4 py-3 text-xs text-gray-400 border-b border-gray-800">
              <span>Pair</span>
              <span>Sisi</span>
              <span className="text-right">Harga</span>
              <span className="text-right">Jumlah</span>
              <span className="text-right">Status</span>
              <span>Aksi</span>
            </div>
            {orders.map(order => (
              <div key={order.id} className="grid grid-cols-[1fr_100px_120px_120px_100px_100px] gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-[#0b0e11] transition-colors">
                <span className="font-semibold">{order.pair}</span>
                <span className={order.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                  {order.side.toUpperCase()}
                </span>
                <span className="text-right text-gray-300">{formatIDR(order.price)}</span>
                <span className="text-right text-gray-300">{order.amount}</span>
                <span className={`text-right ${
                  order.status === 'open' ? 'text-yellow-400' :
                  order.status === 'filled' ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {order.status === 'open' ? 'Aktif' :
                   order.status === 'filled' ? 'Terisi' : 'Dibatalkan'}
                </span>
                {order.status === 'open' && (
                  <button className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors self-center">
                    Batalkan
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="bg-[#1e2329] rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-400 mb-2">Riwayat transaksi akan muncul di sini</p>
            <p className="text-sm text-gray-500">Setelah melakukan trading, riwayat akan ditampilkan secara otomatis</p>
          </div>
        )}

        {/* Demo Notice */}
        <div className="mt-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-400">Mode Demo / Paper Trading</p>
              <p className="text-sm text-gray-400 mt-1">
                Ini adalah simulasi trading. Tidak ada uang nyata yang digunakan. Semua saldo dan transaksi bersifat virtual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
