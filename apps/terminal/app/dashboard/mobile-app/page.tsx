'use client';

// Mobile App page — spec C: Mobile App → /api/app/*, /download

export default function MobileAppPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Aplikasi Seluler</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Download aplikasi mobile kami untuk trading di mana saja.
        </p>

        {/* App showcase */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-xl font-bold mb-2">ChinQue-Cripto PRO</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Trading kripto dengan kemudahan di genggaman tangan Anda.
          </p>

          {/* Store buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#"
              className="flex items-center gap-3 px-6 py-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <div className="text-[9px] text-[var(--text-muted)] uppercase">Download on the</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-6 py-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="text-2xl">▶️</span>
              <div className="text-left">
                <div className="text-[9px] text-[var(--text-muted)] uppercase">Get it on</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { icon: '📈', label: 'Real-time Chart' },
              { icon: '🔔', label: 'Price Alerts' },
              { icon: '💳', label: 'Quick Trade' },
              { icon: '🔒', label: '2FA Security' },
            ].map((feature, i) => (
              <div key={i} className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                <div className="text-2xl mb-1">{feature.icon}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{feature.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App info */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Info Aplikasi</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Versi</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Ukuran</span>
              <span className="font-medium">45 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Kompatibilitas</span>
              <span className="font-medium">iOS 14+, Android 8+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Update Terakhir</span>
              <span className="font-medium">Oktober 2026</span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
          <div className="text-xs font-semibold mb-3">Scan untuk Download</div>
          <div className="inline-block p-4 rounded-md border border-[var(--border)] bg-white">
            <div className="text-4xl">📱</div>
            <div className="text-[9px] text-gray-500 mt-1">QR Code</div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-3">
            Scan QR code di atas dengan kamera HP Anda untuk langsung download aplikasi.
          </p>
        </div>
      </div>
    </div>
  );
}
