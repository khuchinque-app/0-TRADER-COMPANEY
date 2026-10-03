'use client';

// Education page — spec C: Education → /api/education/*
// Educational modules for crypto trading.

import { useState } from 'react';

const MODULES = [
  {
    id: 1,
    title: 'Dasar-Dasar Kripto',
    lessons: 5,
    duration: '30 menit',
    completed: true,
    icon: '🪙',
    description: 'Pahami apa itu cryptocurrency, blockchain, dan bagaimana cara kerjanya.',
  },
  {
    id: 2,
    title: 'Membaca Chart & Candlestick',
    lessons: 8,
    duration: '1 jam',
    completed: false,
    icon: '📈',
    description: 'Pelajari cara membaca chart candlestick dan pola-pola penting.',
  },
  {
    id: 3,
    title: 'Order Types & Execution',
    lessons: 6,
    duration: '45 menit',
    completed: false,
    icon: '📋',
    description: 'Market order, limit order, stop loss, dan strategi eksekusi.',
  },
  {
    id: 4,
    title: 'Manajemen Risiko',
    lessons: 4,
    duration: '30 menit',
    completed: false,
    icon: '🛡️',
    description: 'Risk/reward ratio, position sizing, dan strategi proteksi modal.',
  },
  {
    id: 5,
    title: 'Analisis Teknikal Lanjut',
    lessons: 10,
    duration: '2 jam',
    completed: false,
    icon: '🔬',
    description: 'Indikator teknikal: RSI, MACD, Bollinger Bands, Fibonacci.',
  },
  {
    id: 6,
    title: 'Psikologi Trading',
    lessons: 3,
    duration: '20 menit',
    completed: false,
    icon: '🧠',
    description: 'Kontrol emosi, disiplin, dan membangun mindset trader sukses.',
  },
];

export default function EducationPage() {
  const [activeModule, setActiveModule] = useState<number | null>(null);

  const completedCount = MODULES.filter(m => m.completed).length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Edukasi</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Belajar trading kripto dari nol hingga mahir dengan modul interaktif.
        </p>

        {/* Progress */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Progress Belajar</span>
            <span className="text-xs text-[var(--cyan)]">{completedCount}/{MODULES.length} modul selesai</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--cyan)] transition-all"
              style={{ width: `${(completedCount / MODULES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Modules list */}
        <div className="mt-5 space-y-3">
          {MODULES.map(module => (
            <div
              key={module.id}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <button
                onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="text-3xl">{module.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{module.title}</span>
                    {module.completed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--pos-dim)] text-[var(--pos)]">
                        ✓ Selesai
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{module.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                    <span>📚 {module.lessons} pelajaran</span>
                    <span>⏱ {module.duration}</span>
                  </div>
                </div>
                <span className="text-[var(--text-muted)]">
                  {activeModule === module.id ? '▲' : '▼'}
                </span>
              </button>

              {activeModule === module.id && (
                <div className="px-4 pb-4 border-t border-[var(--border)] bg-[var(--bg-primary)]">
                  <div className="pt-3 space-y-2">
                    {Array.from({ length: module.lessons }, (_, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded-md ${
                          module.completed
                            ? 'text-[var(--pos)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <span className="text-sm">
                          {module.completed ? '✓' : `📖`}
                        </span>
                        <span className="text-xs">Pelajaran {i + 1}: {module.title} - Bagian {i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className={`mt-3 w-full py-2 rounded-md text-sm font-semibold ${
                      module.completed
                        ? 'border border-[var(--border)] text-[var(--text-muted)]'
                        : 'bg-[var(--cyan)] text-black hover:opacity-90'
                    }`}
                  >
                    {module.completed ? 'Ulangi Modul' : 'Mulai Belajar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Certificate */}
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-5 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-sm font-semibold mb-1">Sertifikat Kelulusan</div>
          <div className="text-xs text-[var(--text-muted)] mb-4">
            Selesaikan semua modul untuk mendapatkan sertifikat completion
          </div>
          {completedCount === MODULES.length ? (
            <div className="text-sm text-[var(--pos)] font-semibold">
              ✅ Sertifikat siap diunduh!
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">
              {MODULES.length - completedCount} modul tersisa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
