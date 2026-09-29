'use client';

// Landing / Welcome — spec A.1 (sitemenu-complete), A5 localized (ID):
//   Header, hero (ID copy), "Mulai dari Rp10.000" + "Invest in AI" vault
//   marketing card, market preview, top-right [ Daftar ] [ Masuk ].
// Unauthenticated public page. Daftar / Masuk deep-link to the auth
// journey pages (signup | login), which render staged placeholders until
// their PLAN-TO-DO lines are built. Market preview reads the PUBLIC
// /api/tickers edge (spec D: no auth on /api/market/ticker-class routes).
//
// LOOK rule (founder, 2026-09-27): tokocrypto/indodax-grade professional —
// existing dark tokens only, no neon/glassmorphism. Trading pages keep the
// Bitget terminal look; this page is marketing copy only.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

interface TickerRow {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
}

const PAIR_LABELS: Record<string, string> = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT', XRPUSDT: 'XRP/USDT', LINKUSDT: 'LINK/USDT',
  AAVEUSDT: 'AAVE/USDT',
};

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.00');
  return p.toFixed(6);
}

export default function LandingPage() {
  const [rows, setRows] = useState<TickerRow[]>([]);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/tickers`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setRows(
          Object.values<any>(data)
            .filter((t) => t && typeof t.lastPrice === 'number')
            .map((t) => ({
              symbol: t.symbol,
              lastPrice: t.lastPrice,
              priceChangePercent: Number(t.priceChangePercent) || 0,
            })),
        );
        setOk(true);
      } catch {
        if (!cancelled) setOk(false);
      }
    };
    load();
    const i = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top bar: brand + market links + auth entry (spec: top-right Daftar / Masuk) */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)]" />
          <span className="font-semibold tracking-tight">Simulasi Exchange</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
            SIMULASI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)]">
          <a href="#pasar" className="hover:text-[var(--text-primary)] transition-colors">
            Pasar
          </a>
          <a href="#invest-in-ai" className="hover:text-[var(--text-primary)] transition-colors">
            Invest in AI
          </a>
          <a href="#mulai" className="hover:text-[var(--text-primary)] transition-colors">
            Mulai dari Rp10.000
          </a>
        </nav>

        <nav className="flex items-center gap-3">
          <Link
            href="/signup"
            className="px-4 py-1.5 text-sm rounded-md bg-[var(--cyan)] text-black font-medium hover:opacity-90 transition-opacity"
          >
            Daftar
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Masuk
          </Link>
        </nav>
      </header>

      {/* Hero + value prop + A5 hooks */}
      <section className="flex-1">
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-10 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          {/* Left: localized hero copy */}
          <div id="mulai">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--pos)]" />
              SIMULASI · harga live dari pasar nyata
            </span>

            <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight leading-[1.12]">
              Trading kripto dengan data pasar sungguhan,{' '}
              <span className="text-[var(--cyan)]">tanpa risiko</span>.
            </h1>

            <p className="mt-5 max-w-xl text-[var(--text-muted)] text-base md:text-lg leading-relaxed">
              Harga live, order book lengkap, dan portofolio pribadi — semuanya
              dengan dana simulasi. Daftar gratis dalam hitungan detik, lalu
              lanjutkan ke vault Invest in AI.
            </p>

            {/* A5 hook strip — entry barrier is the headline number */}
            <dl className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <div className="rounded-md border border-[var(--border)] bg-[var(--cyan-dim)] px-4 py-3">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Vault Invest in AI
                </dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--cyan)]">
                  Mulai dari Rp10.000
                </dd>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Harga &amp; order book
                </dt>
                <dd className="mt-1 text-lg font-semibold">Live</dd>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Dana
                </dt>
                <dd className="mt-1 text-lg font-semibold">100% simulasi</dd>
              </div>
            </dl>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 rounded-md bg-[var(--cyan)] text-black font-semibold hover:opacity-90 transition-opacity"
              >
                Daftar gratis
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-md border border-[var(--border)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
              >
                Masuk
              </Link>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Gratis · tanpa kartu kredit · dana simulasi, bukan uang asli.
            </p>
          </div>

          {/* Right: A5 marketing card — Invest in AI vault */}
          <div
            id="invest-in-ai"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[var(--cyan-dim)] text-[var(--cyan)] flex items-center justify-center text-xs">
                  ◆
                </span>
                <span className="text-sm font-semibold">Invest in AI</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--cyan)] uppercase tracking-wider">
                Vault
              </span>
            </div>

            <div className="px-5 py-5">
              <div className="text-2xl font-semibold tracking-tight">
                Mulai dari Rp10.000
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                Alokasikan dana simulasi ke strategi AI otomatis dan pantau
                pertumbuhan portofolio harian dalam satu tempat.
              </p>

              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--cyan)] mt-0.5" aria-hidden="true">✓</span>
                  <span className="text-[var(--text-secondary)]">
                    Strategi AI berjalan otomatis, 24 jam
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--cyan)] mt-0.5" aria-hidden="true">✓</span>
                  <span className="text-[var(--text-secondary)]">
                    Pantau imbal hasil dan risiko harian
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--cyan)] mt-0.5" aria-hidden="true">✓</span>
                  <span className="text-[var(--text-secondary)]">
                    Tarik dana simulasi kapan saja
                  </span>
                </li>
              </ul>

              <Link
                href="/dashboard/ai"
                className="mt-5 flex items-center justify-center w-full px-4 py-2.5 rounded-md bg-[var(--cyan)] text-black text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Buka vault Invest in AI
              </Link>
              <p className="mt-2.5 text-[10px] text-center text-[var(--text-muted)]">
                SIMULASI — tidak ada dana nyata yang diinvestasikan.
              </p>
            </div>
          </div>
        </div>

        {/* Market preview */}
        <div id="pasar" className="mx-auto max-w-6xl px-6 pt-8 pb-16">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Pratinjau pasar
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {ok ? 'live · dana simulasi' : 'mesin offline'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {rows.slice(0, 8).map((r) => {
              const up = r.priceChangePercent >= 0;
              return (
                <div
                  key={r.symbol}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-left"
                >
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {PAIR_LABELS[r.symbol] ?? r.symbol}
                  </div>
                  <div className="font-mono text-sm mt-0.5">
                    Rp≈ {fmtPrice(r.lastPrice)}
                  </div>
                  <div
                    className={`font-mono text-[11px] ${
                      up ? 'text-[var(--pos)]' : 'text-[var(--neg)]'
                    }`}
                  >
                    {up ? '▲' : '▼'} {Math.abs(r.priceChangePercent).toFixed(2)}%
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                Memuat data pasar...
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="min-h-8 border-t border-[var(--border)] flex items-center justify-center px-6 py-2 text-[10px] text-center text-[var(--text-muted)] shrink-0">
        Hanya simulasi — SIMULASI. Tidak ada dana nyata, tidak ada penarikan nyata.
        Harga berasal dari pasar kripto sungguhan.
      </footer>
    </div>
  );
}
