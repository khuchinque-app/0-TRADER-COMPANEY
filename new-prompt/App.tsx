--- src/App.tsx (原始)
export default function App() {
  return (
    <div/>
  );
}


+++ src/App.tsx (修改后)
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-all"
    >
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-gray-700">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 bg-gray-900 overflow-x-auto text-sm text-green-400 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-gray-700 flex items-center gap-2">
        <span className="text-blue-400">§</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-900/50 text-blue-300 border-blue-700',
    green: 'bg-green-900/50 text-green-300 border-green-700',
    red: 'bg-red-900/50 text-red-300 border-red-700',
    yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    purple: 'bg-purple-900/50 text-purple-300 border-purple-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const fullPrompt = `# COMPREHENSIVE PROJECT PROMPT: Indodax Clone (0-TRADER-COMPANEY)

## PROJECT OVERVIEW
Build a complete cryptocurrency exchange platform that is a full clone of indodax.com (Indonesian Digital Asset Exchange). The project is hosted on a VPS named 0-TRADER-COMPANEY and serves at: http://187.127.178.20:22221

## SERVER CONFIG
- VPS Name: 0-TRADER-COMPANEY
- Server IP: 187.127.178.20
- Port: 22221
- Full Address: http://187.127.178.20:22221

## API: MEXC SDK
SDK: https://github.com/mexcdevelop/mexc-api-sdk
import * as Mexc from 'mexc-sdk';
const client = new Mexc.Spot(apiKey, apiSecret);

## ROUTES (mirror indodax.com exactly)
/ → Homepage
/market → Market overview
/market/:pair → Market detail (e.g., /market/BTCIDR)
/market/depth_chart/:pair → Depth chart
/chart/:pair → Candlestick chart
/privacy-policy → Privacy Policy
/trade_api → Trade API docs
/affiliate → Affiliate program

## TRADING PAIRS (~393 pairs)
IDR: BTCIDR, ETHIDR, DOGEIDR, XRPIDR, ADAIDR, SOLIDR, DOTIDR, LTCIDR, BCHIDR, AVAXIDR, ATOMIDR, LINKIDR, UNIIDR, NEARIDR, SHIBIDR, MATICIDR, TRXIDR, FILIDR, ETCIDR, XLMIDR, AAVEIDR, ALGOIDR, MANAIDR, SANDIDR, AXSIDR, GALAIDR, ENJIDR, COMPIDR, SNXIDR, YFIIDR...
USDT: BTCUSDT, ETHUSDT, BONKUSDT, BTTUSDT, FLOKIUSDT, IDRXUSDT, LUNCUSDT, PEPEUSDT, PUNDIXUSDT, SHIBUSDT, XECUSDT, VCGUSDT

## DATA MAPPING
- Market list → client.exchangeInfo()
- Current prices → client.ticker24hr(symbol)
- Order book → client.depth(symbol, {limit: 100})
- Recent trades → client.trades(symbol, {limit: 500})
- Candlestick → client.klines(symbol, interval, options)
- Place order → client.newOrder(symbol, side, orderType, options)
- Cancel order → client.cancelOrder(symbol, options)

## TECH STACK
Frontend: React/Next.js + Tailwind CSS + TradingView Charts
Backend: Node.js + Express + mexc-sdk + Socket.io + Redis
Deploy: PM2 on VPS at port 22221

## REQUIREMENTS
- All routes mirror indodax.com exactly
- Real-time data from MEXC API
- Indonesian language UI
- Dark theme matching indodax.com
- Responsive design
- WebSocket for real-time updates
- JWT authentication`;

  const tabs = [
    { id: 'overview', label: '📋 Overview' },
    { id: 'routes', label: '🔗 Routes' },
    { id: 'api', label: '⚡ API' },
    { id: 'pairs', label: '💰 Pairs' },
    { id: 'code', label: '💻 Code' },
    { id: 'full', label: '📄 Full Prompt' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                Indodax Clone — Project Prompt
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                VPS: <span className="text-blue-400 font-mono">0-TRADER-COMPANEY</span> |
                Server: <span className="text-green-400 font-mono">187.127.178.20:22221</span>
              </p>
            </div>
            <CopyButton text={fullPrompt} />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-[80px] z-40 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <Section id="overview-project" title="Project Overview">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <p className="text-lg text-gray-300 leading-relaxed">
                  Build a complete cryptocurrency exchange platform that is a <strong className="text-white">full clone of indodax.com</strong> (Indonesian Digital Asset Exchange).
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-500 uppercase">VPS Name</div>
                    <div className="text-white font-mono mt-1">0-TRADER-COMPANEY</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-500 uppercase">Server IP</div>
                    <div className="text-white font-mono mt-1">187.127.178.20</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-500 uppercase">Port</div>
                    <div className="text-white font-mono mt-1">22221</div>
                  </div>
                </div>
              </div>
            </Section>

            <Section id="overview-mapping" title="URL Mapping">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Indodax URL</th>
                      <th className="text-left py-3 px-4 text-gray-400">Your Server URL</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {[
                      ['https://indodax.com', 'http://187.127.178.20:22221'],
                      ['https://indodax.com/market', 'http://187.127.178.20:22221/market'],
                      ['https://indodax.com/market/BTCIDR', 'http://187.127.178.20:22221/market/BTCIDR'],
                      ['https://indodax.com/market/depth_chart/BTCIDR', 'http://187.127.178.20:22221/market/depth_chart/BTCIDR'],
                      ['https://indodax.com/chart/BTCIDR', 'http://187.127.178.20:22221/chart/BTCIDR'],
                      ['https://indodax.com/privacy-policy', 'http://187.127.178.20:22221/privacy-policy'],
                      ['https://indodax.com/trade_api', 'http://187.127.178.20:22221/trade_api'],
                      ['https://indodax.com/affiliate', 'http://187.127.178.20:22221/affiliate'],
                    ].map(([from, to], i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-4 text-red-400">{from}</td>
                        <td className="py-2 px-4 text-green-400">{to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="overview-stats" title="Page Count Summary">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Homepage + Static', count: 6, color: 'blue' },
                  { label: 'Market (IDR)', count: '~380', color: 'green' },
                  { label: 'Market (USDT)', count: '~13', color: 'yellow' },
                  { label: 'Depth Charts', count: '~393', color: 'purple' },
                  { label: 'Charts', count: '~393', color: 'red' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-800 text-center">
                    <div className={`text-2xl font-bold text-${item.color}-400`}>{item.count}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-gray-400 mt-4">
                Total: <strong className="text-white">~1,185 pages</strong>
              </p>
            </Section>

            <Section id="overview-tech" title="Tech Stack">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                  <h3 className="text-blue-400 font-semibold mb-3">Frontend</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Badge>React</Badge> Next.js</li>
                    <li className="flex items-center gap-2"><Badge color="green">CSS</Badge> Tailwind CSS</li>
                    <li className="flex items-center gap-2"><Badge color="yellow">Chart</Badge> TradingView Lightweight Charts</li>
                    <li className="flex items-center gap-2"><Badge color="purple">State</Badge> Redux / Zustand</li>
                    <li className="flex items-center gap-2"><Badge color="red">Realtime</Badge> Socket.io-client</li>
                  </ul>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                  <h3 className="text-green-400 font-semibold mb-3">Backend</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Badge color="green">Runtime</Badge> Node.js</li>
                    <li className="flex items-center gap-2"><Badge color="blue">Framework</Badge> Express.js</li>
                    <li className="flex items-center gap-2"><Badge color="yellow">API</Badge> mexc-sdk</li>
                    <li className="flex items-center gap-2"><Badge color="purple">WS</Badge> Socket.io</li>
                    <li className="flex items-center gap-2"><Badge color="red">Cache</Badge> Redis</li>
                  </ul>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div>
            <Section id="routes-static" title="Static Pages">
              <div className="space-y-2">
                {[
                  { path: '/', desc: 'Homepage - landing page with hero, ticker, featured pairs' },
                  { path: '/market', desc: 'Market overview - all trading pairs list' },
                  { path: '/privacy-policy', desc: 'Privacy Policy page' },
                  { path: '/trade_api', desc: 'Trade API documentation' },
                  { path: '/affiliate', desc: 'Affiliate program page' },
                ].map((route, i) => (
                  <div key={i} className="flex items-start gap-4 bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <code className="text-blue-400 font-mono text-sm whitespace-nowrap">{route.path}</code>
                    <span className="text-gray-400 text-sm">→ {route.desc}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="routes-dynamic" title="Dynamic Routes (Per Trading Pair)">
              <div className="space-y-3">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <code className="text-green-400 font-mono">/market/:pair</code>
                  <p className="text-gray-400 text-sm mt-2">Market detail page - live price, order form, order book, recent trades</p>
                  <p className="text-gray-500 text-xs mt-1">Example: /market/BTCIDR, /market/ETHIDR, /market/DOGEUSDT</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <code className="text-green-400 font-mono">/market/depth_chart/:pair</code>
                  <p className="text-gray-400 text-sm mt-2">Depth chart visualization - bid/ask walls, cumulative volume</p>
                  <p className="text-gray-500 text-xs mt-1">Example: /market/depth_chart/BTCIDR</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <code className="text-green-400 font-mono">/chart/:pair</code>
                  <p className="text-gray-400 text-sm mt-2">Full candlestick chart - TradingView style with indicators</p>
                  <p className="text-gray-500 text-xs mt-1">Example: /chart/BTCIDR</p>
                </div>
              </div>
            </Section>

            <Section id="routes-api" title="API Routes">
              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/ticker/:pair', desc: 'Get 24hr ticker data' },
                  { method: 'GET', path: '/api/depth/:pair', desc: 'Get order book' },
                  { method: 'GET', path: '/api/klines/:pair/:interval', desc: 'Get candlestick data' },
                  { method: 'GET', path: '/api/trades/:pair', desc: 'Get recent trades' },
                  { method: 'POST', path: '/api/order', desc: 'Place new order (auth required)' },
                  { method: 'DELETE', path: '/api/order/:id', desc: 'Cancel order (auth required)' },
                  { method: 'GET', path: '/api/orders/open', desc: 'Get open orders (auth required)' },
                  { method: 'GET', path: '/api/account', desc: 'Get account info (auth required)' },
                ].map((route, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-900 rounded-lg p-3 border border-gray-800">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      route.method === 'GET' ? 'bg-green-900 text-green-300' :
                      route.method === 'POST' ? 'bg-blue-900 text-blue-300' :
                      'bg-red-900 text-red-300'
                    }`}>{route.method}</span>
                    <code className="text-yellow-400 font-mono text-sm">{route.path}</code>
                    <span className="text-gray-500 text-xs ml-auto">{route.desc}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div>
            <Section id="api-setup" title="MEXC SDK Setup">
              <p className="text-gray-400 mb-4">
                Source: <a href="https://github.com/mexcdevelop/mexc-api-sdk" className="text-blue-400 hover:underline" target="_blank">github.com/mexcdevelop/mexc-api-sdk</a>
              </p>
              <CodeBlock
                title="Installation & Init"
                code={`// Install
npm install mexc-sdk

// Initialize
import * as Mexc from 'mexc-sdk';
const apiKey = 'YOUR_API_KEY';
const apiSecret = 'YOUR_API_SECRET';
const client = new Mexc.Spot(apiKey, apiSecret);`}
              />
            </Section>

            <Section id="api-market" title="Market API Methods">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400">Method</th>
                      <th className="text-left py-2 px-3 text-gray-400">Call</th>
                      <th className="text-left py-2 px-3 text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {[
                      ['Ping', 'client.ping()', 'Test connectivity'],
                      ['Server Time', 'client.time()', 'Check server time'],
                      ['Exchange Info', 'client.exchangeInfo(options)', 'Get exchange information'],
                      ['Recent Trades', 'client.trades(symbol, options)', 'Recent trades list'],
                      ['Order Book', 'client.depth(symbol, options)', 'Order book depth'],
                      ['Historical Trades', 'client.historicalTrades(symbol, options)', 'Old trade lookup'],
                      ['Aggregate Trades', 'client.aggTrades(symbol, options)', 'Aggregate trades list'],
                      ['Klines', 'client.klines(symbol, interval, options)', 'Candlestick data'],
                      ['Avg Price', 'client.avgPrice(symbol)', 'Current average price'],
                      ['24hr Ticker', 'client.ticker24hr(symbol)', '24hr price change stats'],
                      ['Price Ticker', 'client.tickerPrice(symbol)', 'Symbol price'],
                      ['Book Ticker', 'client.bookTicker(symbol)', 'Order book ticker'],
                    ].map(([name, call, desc], i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-3 text-white">{name}</td>
                        <td className="py-2 px-3 text-green-400">{call}</td>
                        <td className="py-2 px-3 text-gray-400 font-sans">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="api-trade" title="Trade API Methods">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400">Method</th>
                      <th className="text-left py-2 px-3 text-gray-400">Call</th>
                      <th className="text-left py-2 px-3 text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {[
                      ['New Order', 'client.newOrder(symbol, side, orderType, options)', 'Place new order'],
                      ['Test Order', 'client.newOrderTest(symbol, side, orderType, options)', 'Test new order'],
                      ['Cancel Order', 'client.cancelOrder(symbol, options)', 'Cancel an order'],
                      ['Cancel All', 'client.cancelOpenOrders(symbol)', 'Cancel all open orders'],
                      ['Query Order', 'client.queryOrder(symbol, options)', 'Query specific order'],
                      ['Open Orders', 'client.openOrders(symbol)', 'Current open orders'],
                      ['All Orders', 'client.allOrders(symbol, options)', 'All orders'],
                      ['Account Info', 'client.accountInfo()', 'Account information'],
                      ['Trade List', 'client.accountTradeList(symbol, options)', 'Account trade history'],
                    ].map(([name, call, desc], i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-3 text-white">{name}</td>
                        <td className="py-2 px-3 text-green-400">{call}</td>
                        <td className="py-2 px-3 text-gray-400 font-sans">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="api-mapping" title="Indodax → MEXC Data Mapping">
              <div className="space-y-2">
                {[
                  ['Market list', 'client.exchangeInfo()'],
                  ['Current prices', 'client.ticker24hr(symbol)'],
                  ['Order book', 'client.depth(symbol, {limit: 100})'],
                  ['Recent trades', 'client.trades(symbol, {limit: 500})'],
                  ['Candlestick data', 'client.klines(symbol, interval, options)'],
                  ['Average price', 'client.avgPrice(symbol)'],
                  ['Place order', 'client.newOrder(symbol, side, orderType, options)'],
                  ['Cancel order', 'client.cancelOrder(symbol, options)'],
                  ['Open orders', 'client.openOrders(symbol)'],
                  ['Account info', 'client.accountInfo()'],
                ].map(([feature, api], i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-900 rounded-lg p-3 border border-gray-800">
                    <span className="text-white text-sm w-40">{feature}</span>
                    <span className="text-gray-500">→</span>
                    <code className="text-green-400 text-sm">{api}</code>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Pairs Tab */}
        {activeTab === 'pairs' && (
          <div>
            <Section id="pairs-idr" title="IDR Trading Pairs (Indonesian Rupiah)">
              <p className="text-gray-400 text-sm mb-4">
                ~380 trading pairs quoted in Indonesian Rupiah (IDR). Each pair has 3 pages: Market, Depth Chart, and Chart.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {['BTC', 'ETH', 'DOGE', 'XRP', 'ADA', 'SOL', 'DOT', 'LTC', 'BCH', 'AVAX',
                    'ATOM', 'LINK', 'UNI', 'NEAR', 'SHIB', 'TRX', 'FIL', 'ETC', 'XLM', 'AAVE',
                    'ALGO', 'MANA', 'SAND', 'AXS', 'GALA', 'ENJ', 'COMP', 'SNX', 'YFI', 'BNB',
                    'PEPE', 'ARB', 'OP', 'MATIC', 'APT', 'SUI', 'SEI', 'TIA', 'INJ', 'FET',
                    'RENDER', 'FLOKI', 'BONK', 'WIF', 'JUP', 'PYTH', 'JTO', 'WLD', 'STRK', 'ORDI',
                    'TRUMP', 'MELANIA', 'GOAT', 'PNUT', 'ACT', 'MOODENG', 'POPCAT', 'MEW', 'DOGS', 'HMSTR'
                  ].map(pair => (
                    <span key={pair} className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-green-400 border border-gray-700">
                      {pair}IDR
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-blue-900/30 rounded text-xs text-blue-400 border border-blue-800">
                    +320 more...
                  </span>
                </div>
              </div>
            </Section>

            <Section id="pairs-usdt" title="USDT Trading Pairs">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {['BTCUSDT', 'ETHUSDT', 'BONKUSDT', 'BTTUSDT', 'FLOKIUSDT', 'IDRXUSDT',
                    'LUNCUSDT', 'PEPEUSDT', 'PUNDIXUSDT', 'SHIBUSDT', 'XECUSDT', 'VCGUSDT'
                  ].map(pair => (
                    <span key={pair} className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-yellow-400 border border-gray-700">
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            <Section id="pairs-special" title="Special Pairs (Stock Tokens & Others)">
              <p className="text-gray-400 text-sm mb-4">
                Indodax also offers tokenized stocks and unique assets:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {['AAPLXIDR', 'AMZNXIDR', 'COINXIDR', 'GOOGLXIDR', 'NVDAXIDR', 'TSLAXIDR', 'CRCLXIDR',
                    'BANANAS31IDR', 'ASETQUIDR', 'USDTOTCIDR', 'USDTOTCRCIDR', 'IDRXIDR', 'IDRTIDR'
                  ].map(pair => (
                    <span key={pair} className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-purple-400 border border-gray-700">
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <div>
            <Section id="code-server" title="Express.js Server Setup">
              <CodeBlock
                title="server.js"
                code={`const express = require('express');
const app = express();
const PORT = 22221;
const Mexc = require('mexc-sdk');

const client = new Mexc.Spot(process.env.API_KEY, process.env.API_SECRET);

// Serve static frontend
app.use(express.static('public'));

// ============ PAGE ROUTES ============

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Market overview
app.get('/market', (req, res) => {
  res.sendFile(__dirname + '/public/market.html');
});

// Market detail for specific pair
app.get('/market/depth_chart/:pair', (req, res) => {
  res.sendFile(__dirname + '/public/depth_chart.html');
});

app.get('/market/:pair', (req, res) => {
  res.sendFile(__dirname + '/public/trade.html');
});

// Chart page
app.get('/chart/:pair', (req, res) => {
  res.sendFile(__dirname + '/public/chart.html');
});

// Static pages
app.get('/privacy-policy', (req, res) => {
  res.sendFile(__dirname + '/public/privacy.html');
});

app.get('/trade_api', (req, res) => {
  res.sendFile(__dirname + '/public/api_docs.html');
});

app.get('/affiliate', (req, res) => {
  res.sendFile(__dirname + '/public/affiliate.html');
});

// ============ API ROUTES ============

// Get ticker data
app.get('/api/ticker/:pair', async (req, res) => {
  try {
    const data = await client.ticker24hr(req.params.pair);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get order book
app.get('/api/depth/:pair', async (req, res) => {
  try {
    const data = await client.depth(req.params.pair, { limit: 100 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get candlestick/kline data
app.get('/api/klines/:pair/:interval', async (req, res) => {
  try {
    const data = await client.klines(req.params.pair, req.params.interval, { limit: 500 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent trades
app.get('/api/trades/:pair', async (req, res) => {
  try {
    const data = await client.trades(req.params.pair, { limit: 500 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all exchange info
app.get('/api/exchange-info', async (req, res) => {
  try {
    const data = await client.exchangeInfo();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running at http://187.127.178.20:\${PORT}\`);
});`}
              />
            </Section>

            <Section id="code-deploy" title="Deployment Commands">
              <CodeBlock
                title="Deploy on VPS (0-TRADER-COMPANEY)"
                code={`# 1. SSH into VPS
ssh root@187.127.178.20

# 2. Clone project
cd /home/projects
git clone <your-repo> 0-TRADER-COMPANEY
cd 0-TRADER-COMPANEY

# 3. Install dependencies
npm install

# 4. Set environment variables
export API_KEY="your_mexc_api_key"
export API_SECRET="your_mexc_api_secret"

# 5. Install PM2 for process management
npm install -g pm2

# 6. Start with PM2
pm2 start server.js --name "indodax-clone"
pm2 save

# 7. Setup PM2 to start on boot
pm2 startup

# Server is now live at http://187.127.178.20:22221`}
              />
            </Section>

            <Section id="code-frontend" title="Frontend React Component Example">
              <CodeBlock
                title="MarketPage.jsx"
                code={`import { useState, useEffect } from 'react';

export default function MarketPage({ pair }) {
  const [ticker, setTicker] = useState(null);
  const [depth, setDepth] = useState(null);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // Fetch ticker data
    fetch(\`/api/ticker/\${pair}\`)
      .then(r => r.json())
      .then(setTicker);

    // Fetch order book
    fetch(\`/api/depth/\${pair}\`)
      .then(r => r.json())
      .then(setDepth);

    // Fetch recent trades
    fetch(\`/api/trades/\${pair}\`)
      .then(r => r.json())
      .then(setTrades);

    // WebSocket for real-time updates
    const ws = new WebSocket(\`ws://187.127.178.20:22221/ws/\${pair}\`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticker') setTicker(data.payload);
      if (data.type === 'depth') setDepth(data.payload);
      if (data.type === 'trade') setTrades(prev => [data.payload, ...prev.slice(0, 49)]);
    };

    return () => ws.close();
  }, [pair]);

  return (
    <div className="market-page">
      <div className="price-display">
        <h1>{pair}</h1>
        <span className={ticker?.priceChange >= 0 ? 'text-green' : 'text-red'}>
          Rp {ticker?.lastPrice?.toLocaleString()}
        </span>
      </div>
      <div className="order-book">
        {/* Render bids and asks */}
      </div>
      <div className="trade-form">
        {/* Buy/Sell form */}
      </div>
    </div>
  );
}`}
              />
            </Section>
          </div>
        )}

        {/* Full Prompt Tab */}
        {activeTab === 'full' && (
          <div>
            <Section id="full-prompt" title="Complete Prompt (Copy & Paste)">
              <p className="text-gray-400 mb-4">
                Copy the entire prompt below and paste it into your AI assistant to build the project:
              </p>
              <div className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={fullPrompt} />
                </div>
                <pre className="bg-gray-900 border border-gray-700 rounded-xl p-6 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[600px] overflow-y-auto">
                  {fullPrompt}
                </pre>
              </div>
            </Section>

            <Section id="full-readme" title="README.md for the Project">
              <CodeBlock
                title="README.md"
                code={`# 0-TRADER-COMPANEY

## Indodax Clone - Cryptocurrency Exchange Platform

A full clone of indodax.com built with Node.js, Express, and MEXC API SDK.

### Server Info
- **VPS:** 0-TRADER-COMPANEY
- **IP:** 187.127.178.20
- **Port:** 22221
- **URL:** http://187.127.178.20:22221

### Quick Start
\`\`\`bash
npm install
npm start
# or with PM2:
pm2 start server.js --name "indodax-clone"
\`\`\`

### Environment Variables
\`\`\`
API_KEY=your_mexc_api_key
API_SECRET=your_mexc_api_secret
PORT=22221
\`\`\`

### Routes
- \`/\` - Homepage
- \`/market\` - Market overview
- \`/market/:pair\` - Trading page
- \`/market/depth_chart/:pair\` - Depth chart
- \`/chart/:pair\` - Candlestick chart
- \`/privacy-policy\` - Privacy policy
- \`/trade_api\` - API documentation
- \`/affiliate\` - Affiliate program

### API Integration
Uses MEXC SDK: https://github.com/mexcdevelop/mexc-api-sdk

### Tech Stack
- Node.js + Express.js
- mexc-sdk (MEXC API)
- Socket.io (WebSocket)
- React (Frontend)
- Tailwind CSS
- Redis (Cache)
- PM2 (Process Manager)`}
              />
            </Section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Generated from indodax.com sitemap.xml analysis</p>
          <p className="mt-1">
            API: <a href="https://github.com/mexcdevelop/mexc-api-sdk" className="text-blue-400 hover:underline" target="_blank">MEXC SDK</a> |
            Target: <span className="font-mono text-green-400">http://187.127.178.20:22221</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
