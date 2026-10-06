"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen strata-bg text-strata-text-primary">
      {/* Header */}
      <div className="strata-border-b strata-surface-1 px-6 py-4">
        <h1 className="text-2xl font-bold strata-accent-default">Market</h1>
        <p className="text-strata-text-secondary text-sm mt-1">
          Paper Trading — All {pairs.length} pairs loaded from Indodax catalog
        </p>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 strata-border-b strata-surface-1 flex gap-4">
        <input
          type="text"
          placeholder="Search pair..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="strata-focus bg-strata-surface-2 border strata-border-default rounded px-4 py-2 text-strata-text-primary w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="strata-focus bg-strata-surface-2 border strata-border-default rounded px-4 py-2 text-strata-text-primary"
        >
          <option value="all">All Pairs</option>
          <option value="IDR">IDR Only</option>
          <option value="USDT">USDT Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="strata-surface-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="strata-border-b strata-text-tertiary text-left text-sm">
                <th className="px-4 py-3">Pair</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center strata-text-tertiary">
                    Loading pairs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center strata-text-tertiary">
                    No pairs found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.symbol}
                    onClick={() => router.push(`/trade/${p.symbol}`)}
                    className="strata-border-b hover:strata-surface-1 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium strata-text-primary">{p.symbol}</td>
                    <td className="px-4 py-3 strata-text-secondary">{p.base}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          p.quote === "IDR"
                            ? "bg-green-900 text-green-300"
                            : "bg-blue-900 text-blue-300"
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
                            className="px-2 py-1 bg-strata-surface-2 rounded text-xs strata-text-tertiary"
                          >
                            {FLAGS_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-strata-accent-default hover:text-strata-accent-hover text-sm font-medium">
                        Trade →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 strata-text-tertiary text-sm strata-border-t">
            Showing {filtered.length} of {pairs.length} pairs
          </div>
        </div>
      </div>
    </div>
  );
}
