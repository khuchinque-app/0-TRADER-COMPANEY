'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

interface Pair {
  symbol: string;
  base: string;
  quote: string;
  flags: string[];
}

const FLAGS_LABELS: Record<string, string> = {
  otc: "OTC",
  "tokenized-stock": "Tokenized Stock",
  stable: "Stablecoin",
};

export default function MarketPage() {
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "IDR" | "USDT">("all");

  useEffect(() => {
    // Load from research catalog
    fetch("/api/markets/all")
      .then((r) => r.json())
      .then((data: Pair[]) => {
        setPairs(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filtered = pairs.filter((p) => {
    const matchSearch = p.symbol.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" || p.quote === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-vice-dark text-vice-text-primary">
      <Nav />
      {/* Header */}
      <div className="border-b border-vice-border bg-vice-surface px-6 py-4">
        <h1 className="text-2xl font-bold text-vice-cyan glow-cyan">Market</h1>
        <p className="text-vice-text-secondary text-sm mt-1">
          Paper Trading — All {pairs.length} pairs loaded from Indodax catalog
        </p>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-b border-vice-border bg-vice-surface flex gap-4">
        <input
          type="text"
          placeholder="Search pair..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-vice w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="input-vice"
        >
          <option value="all">All Pairs</option>
          <option value="IDR">IDR Only</option>
          <option value="USDT">USDT Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="card-vice">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vice-border text-vice-text-muted text-sm">
                <th className="px-4 py-3 text-left">Pair</th>
                <th className="px-4 py-3 text-left">Base</th>
                <th className="px-4 py-3 text-left">Quote</th>
                <th className="px-4 py-3 text-left">Flags</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-vice-text-muted">
                    Loading pairs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-vice-text-muted">
                    No pairs found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.symbol}
                    onClick={() => router.push(`/trade/${p.symbol}`)}
                    className="border-b border-vice-border-subtle hover:bg-vice-card cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-vice-text-primary">{p.symbol}</td>
                    <td className="px-4 py-3 text-vice-text-secondary">{p.base}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          p.quote === "IDR"
                            ? "badge-vice-success"
                            : "badge-vice-cyan"
                        }`}
                      >
                        {p.quote}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.flags.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-1 bg-vice-surface rounded text-xs text-vice-text-muted"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-vice-cyan hover:text-vice-pink-bright text-sm font-medium transition-colors">
                        Trade →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 text-vice-text-muted text-sm border-t border-vice-border">
            Showing {filtered.length} of {pairs.length} pairs
          </div>
        </div>
      </div>
    </div>
  );
}
