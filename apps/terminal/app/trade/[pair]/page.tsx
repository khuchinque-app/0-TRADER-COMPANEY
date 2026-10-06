import fs from "fs";
import Link from "next/link";
import TradeClient from "./TradeClient";

const CATALOG_PATH =
  "/home/khuchinque/0-TRADER-COMPANEY/docs/research/indodax-pairs.json";

interface Pair {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface PageProps {
  params: Promise<{ pair: string }>;
}

export default async function TradePage({ params }: PageProps) {
  const { pair: pairParam } = await params;
  const pair = pairParam.toUpperCase();

  let pairData: Pair | null = null;
  try {
    const data = fs.readFileSync(CATALOG_PATH, "utf-8");
    const catalog: Pair[] = JSON.parse(data);
    pairData = catalog.find((p) => p.symbol === pair) || null;
  } catch {
    pairData = null;
  }

  if (!pairData) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Pair Not Found</h1>
          <p className="text-gray-400 mb-6">{pair} is not in the Indodax catalog</p>
          <Link
            href="/market"
            className="px-6 py-3 bg-[#f7931a] text-black rounded font-medium hover:bg-[#ff9a2e] inline-block"
          >
            ← Back to Market
          </Link>
        </div>
      </div>
    );
  }

  return <TradeClient pairData={{...pairData, flags: []}} />;
}
