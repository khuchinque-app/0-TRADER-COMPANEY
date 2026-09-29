'use client';

// Market-monitor layout (rung-0 gate, ref: kimi Market Monitor Dashboard):
//   tape → symbol strip → [chart+book | order form + AI | watchlist + account] → bottom dock → status bar

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getOrCreateUserId } from '../../../lib/ids';
import { useTickers } from '../../../lib/use-tickers';
import { SymbolStrip } from '../../../components/account/AccountRail';

const PriceChart = dynamic(() => import('../../../components/chart/PriceChart'), { ssr: false });
const OrderBook = dynamic(() => import('../../../components/book/OrderBook'), { ssr: false });
const OrderForm = dynamic(() => import('../../../components/orderform/OrderForm'), { ssr: false });
const ConnectionStatus = dynamic(() => import('../../../components/common/ConnectionStatus'), { ssr: false });
const DisclaimerBar = dynamic(() => import('../../../components/common/DisclaimerBar'), { ssr: false });
const TickerTape = dynamic(() => import('../../../components/topbar/TickerTape'), { ssr: false });
const Watchlist = dynamic(() => import('../../../components/book/Watchlist'), { ssr: false });
const AccountRail = dynamic(() => import('../../../components/account/AccountRail').then(m => m.AccountRail), { ssr: false });
const BottomDock = dynamic(() => import('../../../components/tabs/BottomDock'), { ssr: false });
const AiPanel = dynamic(() => import('../../../components/tabs/AiPanel'), { ssr: false });

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:3001';

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [book, setBook] = useState<{ bids: any[]; asks: any[] } | null>(null);
  const [klines, setKlines] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // Bumped (throttled) on each inbound engine 'ticker' frame to trigger an
  // immediate /api/tickers refresh ahead of the 5s poll cadence.
  const [wsTick, setWsTick] = useState(0);
  const userIdRef = useRef<string>('');
  const lastTickAtRef = useRef(0);
  const { tickers, ok: tickersOk } = useTickers(5000, wsTick);

  useEffect(() => {
    userIdRef.current = getOrCreateUserId();
  }, []);

  // WebSocket with self-contained reconnect
  useEffect(() => {
    const wsUrl = `${ENGINE_URL.replace('http', 'ws')}/ws`;
    let wsClient: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      wsClient = new WebSocket(wsUrl);
      wsClient.onopen = () => setIsConnected(true);
      wsClient.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'order' || msg.type === 'cancel_ack' || msg.type === 'fill') {
            fetchAccount();
            setRefreshKey(k => k + 1);
          } else if (msg.type === 'ticker') {
            // Engine pushes ~1 ticker/sec per pair across many pairs — throttle
            // the re-render trigger to at most one bump per 900ms.
            const now = Date.now();
            if (now - lastTickAtRef.current >= 900) {
              lastTickAtRef.current = now;
              setWsTick(t => t + 1);
            }
          }
        } catch { /* ignore */ }
      };
      wsClient.onclose = () => {
        setIsConnected(false);
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };
      wsClient.onerror = () => setIsConnected(false);
      setWs(wsClient);
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsClient?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ENGINE_URL]);

  const fetchAccount = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const res = await fetch(`${ENGINE_URL}/api/ledger/${userIdRef.current}`);
      if (res.ok) setAccount(await res.json());
    } catch { /* engine offline */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchAccount, 300);
    const i = setInterval(fetchAccount, 15000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [fetchAccount, refreshKey]);

  // Book snapshot for AI panel depth-pressure
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/market/${selectedPair}`);
        const d = await res.json();
        if (!cancelled) {
          setBook(d.book || null);
          // Klines feed the indicator read (RSI/MACD/BB) in AiPanel
          setKlines(Array.isArray(d.klines) ? d.klines : []);
        }
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 6000);
    return () => { cancelled = true; clearInterval(t); };
  }, [selectedPair]);

  const placeOrder = async (side: 'buy' | 'sell', type: 'limit' | 'market', price: number, quantity: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Connection lost, please wait for reconnect');
      return;
    }
    ws.send(JSON.stringify({
      type: 'order',
      payload: { userId: userIdRef.current, pair: selectedPair, side, type, price, quantity },
    }));
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* 1. Ticker tape */}
      <TickerTape tickers={tickers} ok={isConnected && tickersOk} onSelectPair={setSelectedPair} />

      {/* 2. Selected-symbol strip */}
      <SymbolStrip pair={selectedPair} ticker={tickers[selectedPair] || null} />

      {/* 3. Main 4-column workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chart + book */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
          <div className="h-[52%] min-h-0">
            <PriceChart pair={selectedPair} userId={userIdRef.current} />
          </div>
          <div className="h-[48%] min-h-0 border-t border-[var(--border)]">
            <OrderBook pair={selectedPair} />
          </div>
        </div>

        {/* Order form + AI panel */}
        <div className="w-[290px] shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] min-h-0">
          <OrderForm pair={selectedPair} onOrder={placeOrder} isConnected={isConnected} />
          <div className="flex-1 min-h-0 overflow-auto border-t border-[var(--border)]">
            <AiPanel pair={selectedPair} ticker={tickers[selectedPair] || null} book={book} klines={klines} />
          </div>
        </div>

        {/* Watchlist + account rail */}
        <div className="w-[260px] shrink-0 flex flex-col bg-[var(--bg-secondary)] min-h-0">
          <div className="h-[55%] min-h-0 border-b border-[var(--border)]">
            <Watchlist tickers={tickers} selectedPair={selectedPair} onSelectPair={setSelectedPair} />
          </div>
          <div className="h-[45%] min-h-0 overflow-auto">
            <AccountRail account={account} refreshKey={refreshKey} />
          </div>
        </div>
      </main>

      {/* 4. Bottom dock: movers / open orders / fills */}
      <div className="h-44 shrink-0 border-t border-[var(--border)]">
        <BottomDock tickers={tickers} userId={userIdRef.current} refreshKey={refreshKey} onSelectPair={setSelectedPair} />
      </div>

      {/* 5. Status bar */}
      <footer className="h-6 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-between px-3 text-[10px] shrink-0">
        <ConnectionStatus isConnected={isConnected} />
        <DisclaimerBar />
      </footer>
    </div>
  );
}
