// Client-side helpers for the trade page (browser-only).
// These wrap the proxied backend + static catalog endpoints.

export interface Pair {
  symbol: string;
  base: string;
  quote: string;
  flags: string[];
}

export interface Ticker {
  pair: string;
  last: number;
  high: number;
  low: number;
  vol: number;
  buy: number;
  sell: number;
}

export interface FxRate {
  rate: number;
  source: string;
  stale: boolean;
}

export async function fetchPairData(pair: string): Promise<Pair | null> {
  const res = await fetch("/api/markets/all");
  if (!res.ok) return null;
  const catalog: Pair[] = await res.json();
  return catalog.find((p) => p.symbol === pair) || null;
}

export async function fetchTicker(pair: string): Promise<Ticker | null> {
  const res = await fetch(`/api/ticker/${pair}`);
  if (!res.ok) return null;
  const data: Ticker = await res.json();
  return data;
}

export async function fetchFXRate(): Promise<number> {
  const res = await fetch("/api/fx/usdt-idr");
  if (!res.ok) return 15000;
  const data: FxRate = await res.json();
  return data.rate || 15000;
}
