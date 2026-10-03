'use client';

// Help/Support page — spec C: Help / Support → /api/support/*

import { useState } from 'react';

const FAQS = [
  { q: 'Apa itu platform simulasi?', a: 'Ini adalah platform trading kripto simulasi (paper trading). Anda menggunakan dana virtual untuk berlatih trading tanpa risiko kehilangan uang nyata.' },
  { q: 'Bagaimana cara deposit dana?', a: 'Pergi ke halaman Dompet (Wallet), pilih metode pembayaran (Bank Transfer, DANA, OVO, GoPay, dll), masukkan jumlah, dan klik Deposit.' },
  { q: 'Apakah ada fee untuk deposit/withdraw?', a: 'Fee bervariasi tergantung metode pembayaran. Transfer Bank dan QRIS gratis, e-wallet memiliki fee kecil, dan penarikan memiliki fee standar.' },
  { q: 'Bagaimana cara trading?', a: 'Gunakan halaman Pasar (Marketplace) untuk melihat order book dan chart, atau halaman Quick Buy/Sell untuk eksekusi cepat.' },
  { q: 'Apa itu Invest in AI?', a: 'Fitur ini mengalokasikan dana simulasi ke strategi trading AI otomatis. Mulai dari Rp10.000 saja.' },
  { q: 'Apakah data saya aman?', a: 'Platform ini menggunakan double-entry ledger, audit log, dan rate limiting untuk keamanan. Semua transaksi tercatat dengan ray_id yang unik.' },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketSubject.trim() && ticketMsg.trim()) {
      setSubmitted(true);
      setTicketSubject('');
      setTicketMsg('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Bantuan & Dukungan</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Pusat bantuan dan FAQ untuk platform simulasi trading.
        </p>

        {/* FAQ Section */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-4">Pertanyaan Umum (FAQ)</div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-[var(--border)] rounded-md overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--bg-hover)]"
                >
                  <span className="text-xs font-medium pr-4">{faq.q}</span>
                  <span className="text-[var(--text-muted)] shrink-0">{openFaq === i ? '▲' : '▼'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-3 pb-3 text-xs text-[var(--text-muted)] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-4">Hubungi Support</div>
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-medium text-[var(--pos)]">Tiket Berhasil Dikirim</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Kami akan merespon dalam 1x24 jam</div>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-xs text-[var(--cyan)] hover:underline"
              >
                Kirim tiket lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Subjek</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="Masukkan subjek tiket..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Pesan</label>
                <textarea
                  value={ticketMsg}
                  onChange={e => setTicketMsg(e.target.value)}
                  placeholder="Jelaskan masalah Anda..."
                  rows={4}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--cyan)] resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!ticketSubject.trim() || !ticketMsg.trim()}
                className="rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2 px-6 hover:opacity-90 disabled:opacity-40"
              >
                Kirim Tiket
              </button>
            </form>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { icon: '📚', title: 'Panduan Trading', href: '/dashboard/learn' },
            { icon: '🎓', title: 'Edukasi', href: '/dashboard/education' },
            { icon: '📱', title: 'Aplikasi Seluler', href: '/dashboard/mobile-app' },
            { icon: '🔒', title: 'Keamanan', href: '/dashboard/security' },
          ].map((link, i) => (
            <a
              key={i}
              href={link.href}
              className="flex items-center gap-3 p-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-sm font-medium">{link.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
