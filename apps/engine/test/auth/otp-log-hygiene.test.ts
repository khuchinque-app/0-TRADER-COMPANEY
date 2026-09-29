import { describe, it, expect, vi, afterEach } from 'vitest';
import { consoleOtpProvider } from '../../src/auth/service';

// Ticket 04: console-dev OTP seam must never leak the full phone number or
// the live code into logs (server.log is shipped/tailed/pasted around).
describe('consoleOtpProvider log hygiene (ticket 04)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('masks the phone and never logs the raw code', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const phone = '+6281234567890';
    const code = '263751';
    await consoleOtpProvider.send(phone, code);
    const out = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).not.toContain(phone);            // full number absent
    expect(out).not.toContain('3456789');        // no long digit run of the MSISDN
    expect(out).not.toContain(code);             // live code absent
    expect(out).toMatch(/\+62\w{3}\*\*\*\w{4}/); // masked shape present
    expect(out).toContain('fp');                 // fingerprint for correlation
  });

  it('reveals the code ONLY when OTP_LOG_CODE=1 (local demo opt-in)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.OTP_LOG_CODE = '1';
    try {
      await consoleOtpProvider.send('+6281234567890', '263751');
      const out = spy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('code=263751');
      expect(out).not.toContain('+6281234567890'); // phone stays masked even in reveal mode
    } finally {
      delete process.env.OTP_LOG_CODE;
    }
  });
});
