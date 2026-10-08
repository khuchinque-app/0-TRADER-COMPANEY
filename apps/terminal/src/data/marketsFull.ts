export interface Market {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  icon: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  category: 'all' | 'favorite' | 'new' | 'defi' | 'meme';
}

export const MARKETS: Market[] = [
  { symbol: 'USDT/IDR', base: 'USDT', quote: 'IDR', name: 'Tether USDt', icon: '💲', price: 15945, change24h: 0.31, volume24h: 139400000000, high24h: 15980, low24h: 15900, category: 'all' },
  { symbol: 'BTC/IDR', base: 'BTC', quote: 'IDR', name: 'Bitcoin', icon: '₿', price: 1462499000, change24h: -1.8, volume24h: 39600000000, high24h: 1495000000, low24h: 1448000000, category: 'all' },
  { symbol: 'SOL/IDR', base: 'SOL', quote: 'IDR', name: 'Solana', icon: '◎', price: 1958001, change24h: -5.78, volume24h: 12600000000, high24h: 2085000, low24h: 1920000, category: 'all' },
  { symbol: 'XRP/IDR', base: 'XRP', quote: 'IDR', name: 'XRP', icon: '✕', price: 24400, change24h: -4.44, volume24h: 9000000000, high24h: 25600, low24h: 24100, category: 'all' },
  { symbol: 'ETH/IDR', base: 'ETH', quote: 'IDR', name: 'Ethereum', icon: 'Ξ', price: 44303000, change24h: -3.38, volume24h: 8900000000, high24h: 46100000, low24h: 43800000, category: 'all' },
  { symbol: 'HYPE/IDR', base: 'HYPE', quote: 'IDR', name: 'Hyperliquid', icon: '🔥', price: 1513229, change24h: -4.4, volume24h: 6500000000, high24h: 1598000, low24h: 1495000, category: 'all' },
  { symbol: 'DOGE/IDR', base: 'DOGE', quote: 'IDR', name: 'Dogecoin', icon: '🐕', price: 1506, change24h: -4.74, volume24h: 4000000000, high24h: 1590, low24h: 1485, category: 'meme' },
  { symbol: 'BR/IDR', base: 'BR', quote: 'IDR', name: 'Bedrock', icon: '🪨', price: 8824, change24h: -13.08, volume24h: 3500000000, high24h: 10200, low24h: 8700, category: 'all' },
  { symbol: 'NEAR/IDR', base: 'NEAR', quote: 'IDR', name: 'NEAR Protocol', icon: 'Ⓝ', price: 86000, change24h: -3.97, volume24h: 3100000000, high24h: 90500, low24h: 85200, category: 'all' },
  { symbol: 'PEPE/IDR', base: 'PEPE', quote: 'IDR', name: 'Pepe', icon: '🐸', price: 68, change24h: -5.81, volume24h: 3000000000, high24h: 73, low24h: 67, category: 'meme' },
  { symbol: 'USDC/IDR', base: 'USDC', quote: 'IDR', name: 'USDC', icon: '$', price: 15919, change24h: -0.18, volume24h: 2700000000, high24h: 15950, low24h: 15880, category: 'all' },
  { symbol: 'ASTER/IDR', base: 'ASTER', quote: 'IDR', name: 'Aster', icon: '✳', price: 12255, change24h: -3.16, volume24h: 2300000000, high24h: 12700, low24h: 12100, category: 'all' },
  { symbol: 'ADA/IDR', base: 'ADA', quote: 'IDR', name: 'Cardano', icon: '₳', price: 4202, change24h: -7.16, volume24h: 2200000000, high24h: 4550, low24h: 4150, category: 'all' },
  { symbol: 'SUI/IDR', base: 'SUI', quote: 'IDR', name: 'Sui', icon: '💧', price: 18641, change24h: -6.63, volume24h: 2200000000, high24h: 20100, low24h: 18400, category: 'all' },
  { symbol: 'HONEY/IDR', base: 'HONEY', quote: 'IDR', name: 'Hivemapper', icon: '🍯', price: 62, change24h: 26.53, volume24h: 1800000000, high24h: 65, low24h: 48, category: 'all' },
  { symbol: 'VANRY/IDR', base: 'VANRY', quote: 'IDR', name: 'Vanar Chain', icon: '🎮', price: 11, change24h: -15.38, volume24h: 1700000000, high24h: 13, low24h: 10.5, category: 'all' },
  { symbol: 'MCT/IDR', base: 'MCT', quote: 'IDR', name: 'Metacraft', icon: '⛏', price: 41, change24h: 86.36, volume24h: 1600000000, high24h: 45, low24h: 21, category: 'all' },
  { symbol: 'ONDO/IDR', base: 'ONDO', quote: 'IDR', name: 'Ondo', icon: '🌊', price: 8360, change24h: 1.09, volume24h: 1400000000, high24h: 8500, low24h: 8200, category: 'defi' },
  { symbol: 'MET/IDR', base: 'MET', quote: 'IDR', name: 'Meteora', icon: '☄', price: 8000, change24h: 39.4, volume24h: 1300000000, high24h: 8500, low24h: 5600, category: 'defi' },
  { symbol: 'OGN/IDR', base: 'OGN', quote: 'IDR', name: 'Origin Protocol', icon: '🔶', price: 758, change24h: 114.73, volume24h: 1300000000, high24h: 800, low24h: 350, category: 'defi' },
  { symbol: 'QNT/IDR', base: 'QNT', quote: 'IDR', name: 'Quant', icon: 'Ⓠ', price: 4179284, change24h: -3.24, volume24h: 1300000000, high24h: 4350000, low24h: 4120000, category: 'all' },
  { symbol: 'NOVA/IDR', base: 'NOVA', quote: 'IDR', name: 'NOVA', icon: '🌟', price: 11215, change24h: -13.73, volume24h: 1200000000, high24h: 13100, low24h: 11000, category: 'all' },
  { symbol: 'ENA/IDR', base: 'ENA', quote: 'IDR', name: 'Ethena', icon: '🔷', price: 3715, change24h: -8.83, volume24h: 1200000000, high24h: 4100, low24h: 3650, category: 'defi' },
  { symbol: 'UAI/IDR', base: 'UAI', quote: 'IDR', name: 'UnifAI Network', icon: '🤖', price: 5575, change24h: 12.08, volume24h: 1200000000, high24h: 5800, low24h: 4900, category: 'all' },
  { symbol: 'XLM/IDR', base: 'XLM', quote: 'IDR', name: 'Stellar', icon: '✦', price: 3457, change24h: -3.97, volume24h: 1200000000, high24h: 3620, low24h: 3410, category: 'all' },
  { symbol: 'RLC/IDR', base: 'RLC', quote: 'IDR', name: 'iExec RLC', icon: '⬡', price: 12795, change24h: 1.03, volume24h: 1200000000, high24h: 13000, low24h: 12500, category: 'defi' },
  { symbol: 'AVAX/IDR', base: 'AVAX', quote: 'IDR', name: 'Avalanche', icon: '🔺', price: 179700, change24h: -10.19, volume24h: 797700000, high24h: 201000, low24h: 177500, category: 'all' },
  { symbol: 'ANOA/IDR', base: 'ANOA', quote: 'IDR', name: 'ANOA', icon: '🐃', price: 183412, change24h: -9.52, volume24h: 728700000, high24h: 203000, low24h: 180000, category: 'all' },
  { symbol: 'BNB/IDR', base: 'BNB', quote: 'IDR', name: 'BNB', icon: '⬡', price: 13229358, change24h: -3.65, volume24h: 665600000, high24h: 13750000, low24h: 13100000, category: 'all' },
  { symbol: 'LINK/IDR', base: 'LINK', quote: 'IDR', name: 'Chainlink', icon: '⬡', price: 230800, change24h: 3.21, volume24h: 567890000, high24h: 237800, low24h: 221900, category: 'defi' },
  { symbol: 'AAVE/IDR', base: 'AAVE', quote: 'IDR', name: 'Aave', icon: '👻', price: 1565000, change24h: -2.10, volume24h: 456700000, high24h: 1617000, low24h: 1529000, category: 'defi' },
  { symbol: 'DOT/IDR', base: 'DOT', quote: 'IDR', name: 'Polkadot', icon: '●', price: 65400, change24h: -4.56, volume24h: 389000000, high24h: 68900, low24h: 64800, category: 'all' },
  { symbol: 'MATIC/IDR', base: 'MATIC', quote: 'IDR', name: 'Polygon', icon: '⬢', price: 4120, change24h: -6.23, volume24h: 345600000, high24h: 4420, low24h: 4050, category: 'all' },
  { symbol: 'UNI/IDR', base: 'UNI', quote: 'IDR', name: 'Uniswap', icon: '🦄', price: 89500, change24h: 2.45, volume24h: 298700000, high24h: 91200, low24h: 87300, category: 'defi' },
  { symbol: 'ATOM/IDR', base: 'ATOM', quote: 'IDR', name: 'Cosmos', icon: '⚛', price: 456000, change24h: -1.89, volume24h: 267800000, high24h: 468000, low24h: 451000, category: 'all' },
  { symbol: 'LTC/IDR', base: 'LTC', quote: 'IDR', name: 'Litecoin', icon: 'Ł', price: 1125000, change24h: -2.67, volume24h: 234500000, high24h: 1165000, low24h: 1110000, category: 'all' },
  { symbol: 'SHIB/IDR', base: 'SHIB', quote: 'IDR', name: 'Shiba Inu', icon: '🐕', price: 0.189, change24h: -8.45, volume24h: 198700000, high24h: 0.208, low24h: 0.185, category: 'meme' },
  { symbol: 'TRX/IDR', base: 'TRX', quote: 'IDR', name: 'TRON', icon: '⬡', price: 1456, change24h: 1.23, volume24h: 178900000, high24h: 1478, low24h: 1432, category: 'all' },
  { symbol: 'FIL/IDR', base: 'FIL', quote: 'IDR', name: 'Filecoin', icon: '⨍', price: 389000, change24h: -5.67, volume24h: 156700000, high24h: 413000, low24h: 384000, category: 'all' },
  { symbol: 'ARB/IDR', base: 'ARB', quote: 'IDR', name: 'Arbitrum', icon: '🔵', price: 6230, change24h: -3.45, volume24h: 145600000, high24h: 6480, low24h: 6150, category: 'all' },
];
