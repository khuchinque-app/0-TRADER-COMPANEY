'use client';

// Referral page — spec C: INDODAX Referral → /api/referral/*
// Referral code management and simulated earnings.

import { useEffect, useRef, useState } from 'react';
import { getOrCreateUserId } from '../../../lib/ids';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001';

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState('CHINQUE2026');
  const [stats, setStats] = useState<{ referrals: number; earnings: number; commissions: { user: string; amount: number; date: string; status: string }[] }>({ referrals: 0, earnings: 0, commissions: [] });
  const [copySuccess, setCopySuccess] = useState(false);
  const uidRef = useRef('');

  useEffect(() => {
    uidRef.current = getOrCreateUserId();
    // Load referral data
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    if (!uidRef.current) return;
    try {
      const res = await fetch(`${ENGINE_URL}/api/referral/${uidRef.current}`);
      const data = await res.json();
      if (data.referralCode) setReferralCode(data.referralCode);
      if (data.stats) setStats(data.stats);
    } catch {
      // Demo data fallback
      setStats({
        referrals: 12,
        earnings: 45.50,
        commissions: [
          { user: 'user***123', amount: 5.00, date: '2026-09-30', status: 'paid' },
          { user: 'user***456', amount: 3.50, date: '2026-09-29', status: 'pending' },
          { user: 'user***789', amount: 7.25, date: '2026-09-28', status: 'paid' },
        ],
      });
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Referral INDODAX</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Ajak teman bergabung dan dapatkan komisi dari setiap transaksi mereka.
        </p>

        {/* Referral Code */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="text-xs font-semibold mb-3">Kode Referral Anda</div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`https://exchange.demo/signup?ref=${referralCode}`}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-mono text-[var(--cyan)]"
            />
            <button
              onClick={copyReferralLink}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                copySuccess
                  ? 'bg-[var(--pos)] text-white'
                  : 'bg-[var(--cyan)] text-black hover:opacity-90'
              }`}
            >
              {copySuccess ? '✓ Tersalin' : 'Salin'}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            Bagikan link ini ke teman. Dapatkan komisi 10% dari fee trading mereka.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--cyan)]">{stats.referrals}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Total Referral</div>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--pos)]">{stats.earnings.toFixed(2)}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Total Komisi (USDT)</div>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">10%</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Rate Komisi</div>
          </div>
        </div>

        {/* Commission History */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Riwayat Komisi</div>
          {stats.commissions.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-6">
              Belum ada komisi. Ajak teman pertama Anda!
            </div>
          ) : (
            <div className="space-y-2">
              {stats.commissions.map((comm, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                  <div>
                    <div className="text-xs font-medium">{comm.user}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{comm.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-[var(--pos)]">+{comm.amount.toFixed(2)} USDT</div>
                    <div className={`text-[10px] ${comm.status === 'paid' ? 'text-[var(--pos)]' : 'text-[var(--text-muted)]'}`}>
                      {comm.status === 'paid' ? '✓ Dibayar' : '⏳ Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs font-semibold mb-3">Cara Kerja Referral</div>
          <div className="space-y-3">
            {[
              { step: 1, text: 'Bagikan link referral Anda ke teman' },
              { step: 2, text: 'Teman mendaftar menggunakan link tersebut' },
              { step: 3, text: 'Teman melakukan trading dan membeli aset' },
              { step: 4, text: 'Anda mendapat komisi 10% dari fee trading mereka' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--cyan)] text-black text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-4">
            SIMULASI: Komisi yang ditampilkan adalah simulasi. Tidak ada pembayaran nyata.
          </p>
        </div>
      </div>
    </div>
  );
}
