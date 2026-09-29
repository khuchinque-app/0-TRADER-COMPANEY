'use client';

import { useEffect, useState } from 'react';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface OpenOrdersProps {
  userId: string;
  pair: string;
}

export default function OpenOrders({ userId, pair }: OpenOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/orders/${userId}`);
        const data = res.ok ? await res.json() : [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('[OpenOrders] Failed:', e);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [userId, pair]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="font-semibold text-sm text-[var(--text-primary)]">Open Orders</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {orders.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] text-center py-8">
            No open orders
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-2 bg-[var(--bg-panel)] rounded mb-1 text-xs">
              <div className="flex justify-between">
                <span className={order.side === 'buy' ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                  {order.side.toUpperCase()}
                </span>
                <span className="text-[var(--text-secondary)]">${order.price?.toFixed(2)}</span>
              </div>
              <div className="text-[var(--text-muted)] mt-1">
                {order.quantity - order.filledQuantity} / {order.quantity}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
