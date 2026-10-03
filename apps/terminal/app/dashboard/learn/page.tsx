'use client';

// Learn/Blog page — spec C: Learn / Blog → /api/content/*

import { useState } from 'react';

const ARTICLES = [
  {
    id: 1,
    title: 'Panduan Lengkap Trading Kripto untuk Pemula',
    excerpt: 'Pelajari dasar-dasar trading kripto, cara membaca chart, dan strategi manajemen risiko.',
    category: 'Trading',
    date: '2026-09-20',
    readTime: '5 menit',
    image: '📈',
  },
  {
    id: 2,
    title: 'Memahami Order Book dan Market Depth',
    excerpt: 'Cara membaca order book, memahami bid-ask spread, dan mengidentifikasi support/resistance.',
    category: 'Analisis Teknikal',
    date: '2026-09-18',
    readTime: '8 menit',
    image: '📊',
  },
  {
    id: 3,
    title: 'Strategi Dollar-Cost Averaging (DCA)',
    excerpt: 'Investasi berkala untuk mengurangi risiko timing pasar dan membangun portofolio jangka panjang.',
    category: 'Investasi',
    date: '2026-09-15',
    readTime: '6 menit',
    image: '💰',
  },
  {
    id: 4,
    title: 'Keamanan Akun: Tips & Best Practices',
    excerpt: 'Cara melindungi akun trading Anda dengan 2FA, password kuat, dan waspada phishing.',
    category: 'Keamanan',
    date: '2026-09-12',
    readTime: '4 menit',
    image: '🔒',
  },
  {
    id: 5,
    title: 'Memahami Staking Crypto',
    excerpt: 'Cara bekerjanya staking, memilih platform, dan menghitung potensi keuntungan.',
    category: 'Staking',
    date: '2026-09-10',
    readTime: '7 menit',
    image: '❖',
  },
  {
    id: 6,
    title: 'Analisis Sentimen Pasar Kripto',
    excerpt: 'Bagaimana menggunakan berita dan sentiment untuk membuat keputusan trading yang lebih baik.',
    category: 'Analisis',
    date: '2026-09-08',
    readTime: '6 menit',
    image: '🧠',
  },
];

const CATEGORIES = ['Semua', 'Trading', 'Analisis Teknikal', 'Investasi', 'Keamanan', 'Staking'];

export default function LearnPage() {
  const [filter, setFilter] = useState('Semua');

  const filtered = filter === 'Semua' ? ARTICLES : ARTICLES.filter(a => a.category === filter);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Belajar & Blog</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Pelajari dunia trading kripto dari nol hingga mahir.
        </p>

        {/* Category filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-[var(--cyan)] text-black'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles grid */}
        <div className="mt-5 grid md:grid-cols-2 gap-4">
          {filtered.map(article => (
            <article
              key={article.id}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden hover:border-[var(--cyan)] transition-colors cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{article.image}</span>
                  <span className="text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)]">
                    {article.category}
                  </span>
                </div>
                <h2 className="text-sm font-semibold mb-2 line-clamp-2">{article.title}</h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{article.date}</span>
                  <span>⏱ {article.readTime}</span>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-primary)]">
                <span className="text-xs text-[var(--cyan)] font-medium hover:underline">
                  Baca Selengkapnya →
                </span>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-xs text-[var(--text-muted)]">
            Belum ada artikel untuk kategori ini.
          </div>
        )}

        {/* Newsletter signup */}
        <div className="mt-8 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="text-3xl">📧</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Berlangganan Newsletter</div>
              <div className="text-xs text-[var(--text-muted)]">Dapatkan artikel terbaru langsung ke email Anda</div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="email@anda.com"
                className="flex-1 sm:w-48 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs outline-none focus:border-[var(--cyan)]"
              />
              <button className="rounded-md bg-[var(--cyan)] text-black text-xs font-semibold px-4 py-2 hover:opacity-90">
                Langganan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
