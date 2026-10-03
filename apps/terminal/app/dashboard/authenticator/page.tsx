'use client';

// Authenticator page — spec C: Authenticator App → /api/2fa/*
// 2FA enrollment and management.

import { useState } from 'react';

export default function AuthenticatorPage() {
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'enabled'>('intro');
  const [secret, setSecret] = useState('JBSWY3DPEHPK3PXP');
  const [otpCode, setOtpCode] = useState('');

  const handleEnable = () => {
    setStep('scan');
  };

  const handleVerify = () => {
    if (otpCode.length === 6) {
      setEnabled(true);
      setStep('enabled');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Authenticator App</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">SIMULASI</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Tambahkan lapisan keamanan kedua ke akun Anda menggunakan Google Authenticator atau aplikasi 2FA lainnya.
        </p>

        {step === 'intro' && (
          <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h2 className="text-base font-semibold mb-2">Aktifkan 2FA</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Lindungi akun Anda dengan autentikasi dua faktor. Anda akan memerlukan kode dari aplikasi authenticator setiap kali login.
            </p>
            <button
              onClick={handleEnable}
              className="rounded-md bg-[var(--cyan)] text-black text-sm font-semibold py-2.5 px-6 hover:opacity-90"
            >
              Mulai Setup
            </button>
          </div>
        )}

        {step === 'scan' && (
          <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
            <h2 className="text-sm font-semibold mb-4">Scan QR Code</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                <div className="text-black text-xs text-center p-4">
                  <div className="text-6xl mb-2">📱</div>
                  <div>QR Code akan muncul di sini</div>
                  <div className="mt-2 text-xs text-gray-500">Scan dengan Google Authenticator</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)] text-center">
                <div>Secret Key (manual entry):</div>
                <code className="font-mono text-[var(--cyan)] text-sm">{secret}</code>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setStep('intro')}
                className="px-4 py-2 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)]"
              >
                Batal
              </button>
              <button
                onClick={() => setStep('verify')}
                className="px-4 py-2 text-xs bg-[var(--cyan)] text-black rounded-md font-semibold"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
            <h2 className="text-sm font-semibold mb-4">Verifikasi Kode</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Masukkan kode 6 digit dari aplikasi authenticator Anda.
            </p>
            <input
              type="text"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full text-center text-2xl font-mono tracking-widest rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 outline-none focus:border-[var(--cyan)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setStep('scan')}
                className="px-4 py-2 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)]"
              >
                Kembali
              </button>
              <button
                onClick={handleVerify}
                disabled={otpCode.length !== 6}
                className="px-4 py-2 text-xs bg-[var(--cyan)] text-black rounded-md font-semibold disabled:opacity-40"
              >
                Verifikasi
              </button>
            </div>
          </div>
        )}

        {step === 'enabled' && (
          <div className="mt-5 rounded-md border border-[var(--pos)] bg-[var(--pos-dim)] p-6 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-base font-semibold text-[var(--pos)] mb-2">2FA Berhasil Diaktifkan</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Autentikasi dua faktor sekarang aktif. Setiap login memerlukan kode dari aplikasi authenticator.
            </p>
            <button
              onClick={() => setEnabled(false)}
              className="text-xs text-[var(--neg)] hover:underline"
            >
              Nonaktifkan 2FA
            </button>
          </div>
        )}

        {/* Backup codes */}
        {enabled && (
          <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-xs font-semibold mb-2">Backup Codes</div>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Simpan kode ini di tempat yang aman. Gunakan jika Anda kehilangan akses ke authenticator.
            </p>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs text-[var(--cyan)]">
              {[12345678, 23456789, 34567890, 45678901, 56789012, 67890123, 78901234, 89012345].map((code, i) => (
                <div key={i} className="p-2 rounded border border-[var(--border)] bg-[var(--bg-primary)] text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
