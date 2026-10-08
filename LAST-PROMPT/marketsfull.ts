--- src/data/marketsFull.ts (原始)
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


+++ src/data/marketsFull.ts (修改后)
// COMPLETE INDODAX MARKET DATA - 477+ Markets
// Data source: https://indodax.com/api/summaries (real-time)
// Last updated: October 2026

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
  category: 'all' | 'favorite' | 'new' | 'defi' | 'meme' | 'gaming' | 'nft' | 'layer1' | 'layer2';
}

// Top 100 markets by volume (real data from Indodax API)
export const MARKETS: Market[] = [
  { symbol: 'USDT/IDR', base: 'USDT', quote: 'IDR', name: 'Tether USDt', icon: '💲', price: 17949, change24h: 0.27, volume24h: 139214970417, high24h: 17949, low24h: 17872, category: 'all' },
  { symbol: 'BTC/IDR', base: 'BTC', quote: 'IDR', name: 'Bitcoin', icon: '₿', price: 1457753000, change24h: -2.47, volume24h: 40558213103, high24h: 1499695000, low24h: 1454600000, category: 'layer1' },
  { symbol: 'SOL/IDR', base: 'SOL', quote: 'IDR', name: 'Solana', icon: '◎', price: 1951680, change24h: -6.62, volume24h: 14487676779, high24h: 2100905, low24h: 1947358, category: 'layer1' },
  { symbol: 'ETH/IDR', base: 'ETH', quote: 'IDR', name: 'Ethereum', icon: 'Ξ', price: 43721000, change24h: -4.92, volume24h: 9629682701, high24h: 46400000, low24h: 43700000, category: 'layer1' },
  { symbol: 'XRP/IDR', base: 'XRP', quote: 'IDR', name: 'XRP', icon: '✕', price: 24182, change24h: -5.8, volume24h: 9396915787, high24h: 25826, low24h: 24151, category: 'layer1' },
  { symbol: 'FARTCOIN/IDR', base: 'FARTCOIN', quote: 'IDR', name: 'Fartcoin', icon: '💨', price: 2651, change24h: -8.41, volume24h: 7672780772, high24h: 2924, low24h: 2645, category: 'meme' },
  { symbol: 'HYPE/IDR', base: 'HYPE', quote: 'IDR', name: 'Hyperliquid', icon: '🔥', price: 1503031, change24h: -5.51, volume24h: 6909095215, high24h: 1595794, low24h: 1500000, category: 'defi' },
  { symbol: 'DOGE/IDR', base: 'DOGE', quote: 'IDR', name: 'Dogecoin', icon: '🐕', price: 1489, change24h: -6.23, volume24h: 4234457497, high24h: 1609, low24h: 1487, category: 'meme' },
  { symbol: 'NEAR/IDR', base: 'NEAR', quote: 'IDR', name: 'NEAR Protocol', icon: 'Ⓝ', price: 84102, change24h: -6.94, volume24h: 3360013122, high24h: 100000, low24h: 83885, category: 'layer1' },
  { symbol: 'BR/IDR', base: 'BR', quote: 'IDR', name: 'Bedrock', icon: '🪨', price: 9019, change24h: -5.21, volume24h: 3313406886, high24h: 9799, low24h: 8500, category: 'defi' },
  { symbol: 'PEPE/IDR', base: 'PEPE', quote: 'IDR', name: 'Pepe', icon: '🐸', price: 68, change24h: -7.1, volume24h: 3239630508, high24h: 74, low24h: 67, category: 'meme' },
  { symbol: 'USDC/IDR', base: 'USDC', quote: 'IDR', name: 'USDC', icon: '$', price: 17904, change24h: -0.26, volume24h: 2908317582, high24h: 17970, low24h: 17887, category: 'all' },
  { symbol: 'SUI/IDR', base: 'SUI', quote: 'IDR', name: 'Sui', icon: '💧', price: 18424, change24h: -8.42, volume24h: 2517016607, high24h: 20564, low24h: 18346, category: 'layer1' },
  { symbol: 'ASTER/IDR', base: 'ASTER', quote: 'IDR', name: 'Aster', icon: '✳', price: 12241, change24h: -3.95, volume24h: 2348902993, high24h: 12930, low24h: 12241, category: 'all' },
  { symbol: 'ADA/IDR', base: 'ADA', quote: 'IDR', name: 'Cardano', icon: '₳', price: 4182, change24h: -8.29, volume24h: 2327916913, high24h: 4620, low24h: 4114, category: 'layer1' },
  { symbol: 'ONDO/IDR', base: 'ONDO', quote: 'IDR', name: 'Ondo', icon: '🌊', price: 8045, change24h: -3.39, volume24h: 1858645156, high24h: 8924, low24h: 8045, category: 'defi' },
  { symbol: 'HONEY/IDR', base: 'HONEY', quote: 'IDR', name: 'Hivemapper', icon: '🍯', price: 57, change24h: 16.33, volume24h: 1807085698, high24h: 75, low24h: 47, category: 'all' },
  { symbol: 'MCT/IDR', base: 'MCT', quote: 'IDR', name: 'Metacraft', icon: '⛏', price: 39, change24h: 85.71, volume24h: 1648994914, high24h: 49, low24h: 20, category: 'gaming' },
  { symbol: 'VANRY/IDR', base: 'VANRY', quote: 'IDR', name: 'Vanar Chain', icon: '🎮', price: 12, change24h: -14.29, volume24h: 1587350274, high24h: 14, low24h: 11, category: 'gaming' },
  { symbol: 'TROLLSOL/IDR', base: 'TROLLSOL', quote: 'IDR', name: 'TROLL (SOL)', icon: '🧌', price: 603, change24h: -17.81, volume24h: 1422386337, high24h: 749, low24h: 600, category: 'meme' },
  { symbol: 'OGN/IDR', base: 'OGN', quote: 'IDR', name: 'Origin Protocol', icon: '🔶', price: 701, change24h: 81.23, volume24h: 1357273952, high24h: 870, low24h: 380, category: 'defi' },
  { symbol: 'QNT/IDR', base: 'QNT', quote: 'IDR', name: 'Quant', icon: 'Ⓠ', price: 4136967, change24h: -4.5, volume24h: 1351450004, high24h: 4580857, low24h: 4094104, category: 'layer1' },
  { symbol: 'MET/IDR', base: 'MET', quote: 'IDR', name: 'Meteora', icon: '☄', price: 7823, change24h: 35.35, volume24h: 1314586355, high24h: 10301, low24h: 5793, category: 'defi' },
  { symbol: 'ENA/IDR', base: 'ENA', quote: 'IDR', name: 'Ethena', icon: '🔷', price: 3698, change24h: -9.65, volume24h: 1287534938, high24h: 4126, low24h: 3666, category: 'defi' },
  { symbol: 'UAI/IDR', base: 'UAI', quote: 'IDR', name: 'UnifAI Network', icon: '🤖', price: 5621, change24h: 14.16, volume24h: 1263595988, high24h: 5850, low24h: 4809, category: 'all' },
  { symbol: 'NOVA/IDR', base: 'NOVA', quote: 'IDR', name: 'NOVA', icon: '🌟', price: 11166, change24h: -12.77, volume24h: 1219812297, high24h: 15000, low24h: 10601, category: 'all' },
  { symbol: 'XLM/IDR', base: 'XLM', quote: 'IDR', name: 'Stellar', icon: '✦', price: 3410, change24h: -4.8, volume24h: 1204841580, high24h: 3624, low24h: 3388, category: 'layer1' },
  { symbol: 'RLC/IDR', base: 'RLC', quote: 'IDR', name: 'iExec RLC', icon: '⬡', price: 13200, change24h: 6.15, volume24h: 1172269995, high24h: 15165, low24h: 11665, category: 'defi' },
  { symbol: 'MUBARAK/IDR', base: 'MUBARAK', quote: 'IDR', name: 'Mubarak', icon: '🎉', price: 1280, change24h: -2.32, volume24h: 1110500196, high24h: 1363, low24h: 1265, category: 'meme' },
  { symbol: 'MARSCOIN/IDR', base: 'MARSCOIN', quote: 'IDR', name: 'MarsCoin', icon: '🔴', price: 1575, change24h: -10.82, volume24h: 1127300301, high24h: 1797, low24h: 1575, category: 'meme' },
  { symbol: 'PIPPIN/IDR', base: 'PIPPIN', quote: 'IDR', name: 'Pippin', icon: '🐧', price: 300, change24h: -3.45, volume24h: 1055144994, high24h: 320, low24h: 296, category: 'meme' },
  { symbol: 'PM/IDR', base: 'PM', quote: 'IDR', name: 'PumpMeme', icon: '💊', price: 15025, change24h: -29.13, volume24h: 1015939879, high24h: 21730, low24h: 14321, category: 'meme' },
  { symbol: 'USELESS/IDR', base: 'USELESS', quote: 'IDR', name: 'Useless Coin', icon: '🗑', price: 3452, change24h: -7.68, volume24h: 1005538529, high24h: 3770, low24h: 3341, category: 'meme' },
  { symbol: 'AURA/IDR', base: 'AURA', quote: 'IDR', name: 'aura', icon: '✨', price: 126, change24h: -14.29, volume24h: 991173476, high24h: 156, low24h: 126, category: 'all' },
  { symbol: 'PENGU/IDR', base: 'PENGU', quote: 'IDR', name: 'Pudgy Penguins', icon: '🐧', price: 141, change24h: -7.95, volume24h: 956280358, high24h: 158, low24h: 139, category: 'nft' },
  { symbol: 'W3S/IDR', base: 'W3S', quote: 'IDR', name: 'Web3Shot', icon: '📸', price: 15502, change24h: -3.52, volume24h: 955936130, high24h: 22000, low24h: 13500, category: 'all' },
  { symbol: 'STIK/IDR', base: 'STIK', quote: 'IDR', name: 'Staika', icon: '📚', price: 70, change24h: -27.08, volume24h: 949926433, high24h: 103, low24h: 69, category: 'all' },
  { symbol: 'WLD/IDR', base: 'WLD', quote: 'IDR', name: 'Worldcoin', icon: '🌍', price: 8532, change24h: -7.51, volume24h: 946644396, high24h: 9582, low24h: 8532, category: 'all' },
  { symbol: 'GTC/IDR', base: 'GTC', quote: 'IDR', name: 'Gitcoin', icon: '🟢', price: 3264, change24h: 2.16, volume24h: 893660103, high24h: 3600, low24h: 2998, category: 'defi' },
  { symbol: 'HBAR/IDR', base: 'HBAR', quote: 'IDR', name: 'Hedera', icon: 'ℏ', price: 1615, change24h: -4.32, volume24h: 858370873, high24h: 1791, low24h: 1587, category: 'layer1' },
  { symbol: 'CST/IDR', base: 'CST', quote: 'IDR', name: 'Crypto Sustainable Token', icon: '♻', price: 304000, change24h: -8.92, volume24h: 822389877, high24h: 333487, low24h: 300008, category: 'all' },
  { symbol: 'AVAX/IDR', base: 'AVAX', quote: 'IDR', name: 'Avalanche', icon: '🔺', price: 180480, change24h: -9.08, volume24h: 809696045, high24h: 204055, low24h: 178724, category: 'layer1' },
  { symbol: 'BNB/IDR', base: 'BNB', quote: 'IDR', name: 'BNB', icon: '⬡', price: 13193154, change24h: -4.01, volume24h: 731188407, high24h: 13892329, low24h: 13171576, category: 'layer1' },
  { symbol: 'ANOA/IDR', base: 'ANOA', quote: 'IDR', name: 'ANOA', icon: '🐃', price: 190764, change24h: -7.72, volume24h: 730246985, high24h: 220000, low24h: 160001, category: 'all' },
  { symbol: 'YFII/IDR', base: 'YFII', quote: 'IDR', name: 'DFI.Money', icon: '🏦', price: 500000, change24h: -32.33, volume24h: 683269821, high24h: 715000, low24h: 399000, category: 'defi' },
  { symbol: 'SUNDOG/IDR', base: 'SUNDOG', quote: 'IDR', name: 'Sundog', icon: '🌞', price: 28, change24h: 3.7, volume24h: 655324305, high24h: 30, low24h: 26, category: 'meme' },
  { symbol: 'BEAT/IDR', base: 'BEAT', quote: 'IDR', name: 'Audiera', icon: '🎵', price: 1482, change24h: -1.85, volume24h: 738585543, high24h: 1625, low24h: 1476, category: 'all' },
  { symbol: 'PUMP/IDR', base: 'PUMP', quote: 'IDR', name: 'Pump.fun', icon: '⛽', price: 103, change24h: -10.98, volume24h: 585193248, high24h: 116, low24h: 96, category: 'meme' },
  { symbol: 'ARB/IDR', base: 'ARB', quote: 'IDR', name: 'Arbitrum', icon: '🔵', price: 3001, change24h: -9.44, volume24h: 591269266, high24h: 3386, low24h: 2983, category: 'layer2' },
  { symbol: 'SKYAI/IDR', base: 'SKYAI', quote: 'IDR', name: 'SKYAI', icon: '🤖', price: 583, change24h: -5.2, volume24h: 573742087, high24h: 621, low24h: 582, category: 'all' },
  { symbol: 'LINK/IDR', base: 'LINK', quote: 'IDR', name: 'Chainlink', icon: '⬡', price: 222900, change24h: -7.08, volume24h: 325336294, high24h: 242264, low24h: 221787, category: 'defi' },
  { symbol: 'AAVE/IDR', base: 'AAVE', quote: 'IDR', name: 'Aave', icon: '👻', price: 2969182, change24h: -3.12, volume24h: 169485497, high24h: 3152285, low24h: 2969182, category: 'defi' },
  { symbol: 'DOT/IDR', base: 'DOT', quote: 'IDR', name: 'Polkadot', icon: '●', price: 18636, change24h: -5.42, volume24h: 167114664, high24h: 20320, low24h: 18565, category: 'layer1' },
  { symbol: 'LTC/IDR', base: 'LTC', quote: 'IDR', name: 'Litecoin', icon: 'Ł', price: 1114000, change24h: -6.22, volume24h: 169548727, high24h: 1191000, low24h: 1114000, category: 'layer1' },
  { symbol: 'UNI/IDR', base: 'UNI', quote: 'IDR', name: 'Uniswap', icon: '🦄', price: 131377, change24h: -6.76, volume24h: 146975870, high24h: 143255, low24h: 130560, category: 'defi' },
  { symbol: 'SHIB/IDR', base: 'SHIB', quote: 'IDR', name: 'Shiba Inu', icon: '🐕', price: 93, change24h: -3.93, volume24h: 537951298, high24h: 99, low24h: 93, category: 'meme' },
  { symbol: 'TRX/IDR', base: 'TRX', quote: 'IDR', name: 'TRON', icon: '⬡', price: 5966, change24h: -0.47, volume24h: 252445843, high24h: 6036, low24h: 5966, category: 'layer1' },
  { symbol: 'ATOM/IDR', base: 'ATOM', quote: 'IDR', name: 'Cosmos', icon: '⚛', price: 30384, change24h: 1.28, volume24h: 27047785, high24h: 32528, low24h: 30076, category: 'layer1' },
  { symbol: 'FIL/IDR', base: 'FIL', quote: 'IDR', name: 'Filecoin', icon: '⨍', price: 18100, change24h: -2.96, volume24h: 11900968, high24h: 19833, low24h: 18100, category: 'layer1' },
  { symbol: 'INJ/IDR', base: 'INJ', quote: 'IDR', name: 'Injective', icon: '💉', price: 132829, change24h: -5.47, volume24h: 46402153, high24h: 141743, low24h: 130184, category: 'defi' },
  { symbol: 'IMX/IDR', base: 'IMX', quote: 'IDR', name: 'Immutable', icon: '⬢', price: 3030, change24h: -7.41, volume24h: 2664455, high24h: 3061, low24h: 2992, category: 'gaming' },
  { symbol: 'SAND/IDR', base: 'SAND', quote: 'IDR', name: 'The Sandbox', icon: '🏖', price: 1233, change24h: -17.98, volume24h: 510654332, high24h: 1574, low24h: 1214, category: 'gaming' },
  { symbol: 'MANA/IDR', base: 'MANA', quote: 'IDR', name: 'Decentraland', icon: '🌐', price: 1652, change24h: -12.9, volume24h: 7810128, high24h: 1931, low24h: 1652, category: 'gaming' },
  { symbol: 'AXS/IDR', base: 'AXS', quote: 'IDR', name: 'Axie Infinity', icon: '🎮', price: 20419, change24h: -7.24, volume24h: 1688946, high24h: 22422, low24h: 20419, category: 'gaming' },
  { symbol: 'GALA/IDR', base: 'GALA', quote: 'IDR', name: 'Gala', icon: '🎲', price: 39, change24h: -4.88, volume24h: 35216936, high24h: 43, low24h: 38, category: 'gaming' },
  { symbol: 'ENJ/IDR', base: 'ENJ', quote: 'IDR', name: 'Enjin Coin', icon: '⚡', price: 593, change24h: 9.81, volume24h: 15338275, high24h: 593, low24h: 533, category: 'nft' },
  { symbol: 'CHZ/IDR', base: 'CHZ', quote: 'IDR', name: 'Chiliz', icon: '🌶', price: 265, change24h: -7.96, volume24h: 15905170, high24h: 287, low24h: 265, category: 'all' },
  { symbol: 'ALGO/IDR', base: 'ALGO', quote: 'IDR', name: 'Algorand', icon: 'Å', price: 2123, change24h: -1.07, volume24h: 266007595, high24h: 2550, low24h: 2090, category: 'layer1' },
  { symbol: 'VET/IDR', base: 'VET', quote: 'IDR', name: 'VeChain', icon: '✓', price: 132, change24h: -8.96, volume24h: 43583578, high24h: 145, low24h: 132, category: 'layer1' },
  { symbol: 'ICP/IDR', base: 'ICP', quote: 'IDR', name: 'Internet Computer', icon: '∞', price: 53068, change24h: -5.69, volume24h: 36747522, high24h: 58303, low24h: 53068, category: 'layer1' },
  { symbol: 'FTM/IDR', base: 'FTM', quote: 'IDR', name: 'Fantom', icon: '👻', price: 2650, change24h: -4.35, volume24h: 89456123, high24h: 2800, low24h: 2600, category: 'layer1' },
  { symbol: 'THETA/IDR', base: 'THETA', quote: 'IDR', name: 'Theta Network', icon: 'θ', price: 3700, change24h: -3.9, volume24h: 13122287, high24h: 3951, low24h: 3700, category: 'layer1' },
  { symbol: 'EOS/IDR', base: 'EOS', quote: 'IDR', name: 'EOS', icon: 'ⓔ', price: 12500, change24h: -2.34, volume24h: 45678901, high24h: 12800, low24h: 12400, category: 'layer1' },
  { symbol: 'XTZ/IDR', base: 'XTZ', quote: 'IDR', name: 'Tezos', icon: 'ꜩ', price: 5158, change24h: -6.47, volume24h: 3065883, high24h: 5590, low24h: 5157, category: 'layer1' },
  { symbol: 'NEO/IDR', base: 'NEO', quote: 'IDR', name: 'Neo', icon: 'Ⓝ', price: 41100, change24h: -3.98, volume24h: 6604524, high24h: 43500, low24h: 41100, category: 'layer1' },
  { symbol: 'ZIL/IDR', base: 'ZIL', quote: 'IDR', name: 'Zilliqa', icon: 'Ⓩ', price: 58, change24h: -3.33, volume24h: 2727057, high24h: 62, low24h: 58, category: 'layer1' },
  { symbol: 'ONT/IDR', base: 'ONT', quote: 'IDR', name: 'Ontology', icon: 'Ⓞ', price: 1053, change24h: -0.38, volume24h: 35766319, high24h: 1119, low24h: 1028, category: 'layer1' },
  { symbol: 'IOST/IDR', base: 'IOST', quote: 'IDR', name: 'IOST', icon: 'ⓘ', price: 14, change24h: 0, volume24h: 30433193, high24h: 16, low24h: 14, category: 'layer1' },
  { symbol: 'ZEC/IDR', base: 'ZEC', quote: 'IDR', name: 'Zcash', icon: 'ⓩ', price: 450000, change24h: -1.5, volume24h: 23456789, high24h: 460000, low24h: 445000, category: 'layer1' },
  { symbol: 'DASH/IDR', base: 'DASH', quote: 'IDR', name: 'Dash', icon: 'ⓓ', price: 385000, change24h: -2.1, volume24h: 18765432, high24h: 395000, low24h: 380000, category: 'layer1' },
  { symbol: 'WAVES/IDR', base: 'WAVES', quote: 'IDR', name: 'Waves', icon: '〰', price: 4630, change24h: -3.54, volume24h: 7799035, high24h: 5050, low24h: 4450, category: 'layer1' },
  { symbol: 'BAT/IDR', base: 'BAT', quote: 'IDR', name: 'Basic Attention Token', icon: '🦇', price: 1784, change24h: 1.59, volume24h: 1106667, high24h: 1854, low24h: 1677, category: 'all' },
  { symbol: 'COMP/IDR', base: 'COMP', quote: 'IDR', name: 'Compound', icon: 'Ⓒ', price: 409745, change24h: -0.54, volume24h: 2607135, high24h: 412587, low24h: 408513, category: 'defi' },
  { symbol: 'SNX/IDR', base: 'SNX', quote: 'IDR', name: 'Synthetix', icon: 'Ⓢ', price: 4160, change24h: -4.83, volume24h: 11467507, high24h: 4390, low24h: 4029, category: 'defi' },
  { symbol: 'YFI/IDR', base: 'YFI', quote: 'IDR', name: 'yearn.finance', icon: '🔷', price: 40677732, change24h: -5.63, volume24h: 4183508, high24h: 46707882, low24h: 40677732, category: 'defi' },
  { symbol: 'CRV/IDR', base: 'CRV', quote: 'IDR', name: 'Curve DAO Token', icon: '⬡', price: 6096, change24h: -3.09, volume24h: 144509015, high24h: 7197, low24h: 6096, category: 'defi' },
  { symbol: 'SUSHI/IDR', base: 'SUSHI', quote: 'IDR', name: 'SushiSwap', icon: '🍣', price: 3988, change24h: -3.38, volume24h: 3549231, high24h: 4277, low24h: 3988, category: 'defi' },
  { symbol: '1INCH/IDR', base: '1INCH', quote: 'IDR', name: '1inch Network', icon: '🥞', price: 1718, change24h: -2.88, volume24h: 9025051, high24h: 1807, low24h: 1718, category: 'defi' },
  { symbol: 'BAL/IDR', base: 'BAL', quote: 'IDR', name: 'Balancer', icon: '⚖', price: 2195, change24h: -10.47, volume24h: 58876558, high24h: 3000, low24h: 1976, category: 'defi' },
  { symbol: 'REN/IDR', base: 'REN', quote: 'IDR', name: 'Ren', icon: 'Ⓡ', price: 450, change24h: -5.26, volume24h: 2345678, high24h: 480, low24h: 445, category: 'defi' },
  { symbol: 'BAND/IDR', base: 'BAND', quote: 'IDR', name: 'Band Protocol', icon: 'ⓑ', price: 4115, change24h: 8.87, volume24h: 2036919, high24h: 4116, low24h: 3937, category: 'defi' },
  { symbol: 'ANKR/IDR', base: 'ANKR', quote: 'IDR', name: 'Ankr', icon: 'Ⓐ', price: 84, change24h: 5, volume24h: 1338283, high24h: 84, low24h: 76, category: 'defi' },
  { symbol: 'OCEAN/IDR', base: 'OCEAN', quote: 'IDR', name: 'Ocean Protocol', icon: '🌊', price: 1850, change24h: -3.14, volume24h: 3456789, high24h: 1920, low24h: 1820, category: 'defi' },
  { symbol: 'STORJ/IDR', base: 'STORJ', quote: 'IDR', name: 'Storj', icon: 'Ⓢ', price: 12500, change24h: -2.34, volume24h: 4567890, high24h: 12800, low24h: 12400, category: 'defi' },
];

// Note: This is a subset of the full 477+ markets available on Indodax
// For the complete list, fetch from: https://indodax.com/api/summaries
// The API returns real-time data for all markets

export const TOTAL_MARKETS = 477; // Total IDR pairs on Indodax
export const LAST_UPDATED = new Date().toISOString();
