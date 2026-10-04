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
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-[#f7931a]">Market</h1>
        <p className="text-gray-400 text-sm mt-1">
          Paper Trading — All {pairs.length} pairs loaded from Indodax catalog
        </p>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-b border-gray-800 flex gap-4">
        <input
          type="text"
          placeholder="Search pair..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#161b22] border border-gray-700 rounded px-4 py-2 text-white w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-[#161b22] border border-gray-700 rounded px-4 py-2 text-white"
        >
          <option value="all">All Pairs</option>
          <option value="IDR">IDR Only</option>
          <option value="USDT">USDT Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="bg-[#161b22] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left text-sm">
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
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading pairs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No pairs found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.symbol}
                    onClick={() => router.push(`/trade/${p.symbol}`)}
                    className="border-b border-gray-800 hover:bg-[#1c2128] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{p.symbol}</td>
                    <td className="px-4 py-3 text-gray-300">{p.base}</td>
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
                            className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                          >
                            {FLAGS_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-[#f7931a] hover:text-[#ff9a2e] text-sm font-medium">
                        Trade →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 text-gray-500 text-sm border-t border-gray-800">
            Showing {filtered.length} of {pairs.length} pairs
          </div>
        </div>
      </div>
    </div>
  );
}
