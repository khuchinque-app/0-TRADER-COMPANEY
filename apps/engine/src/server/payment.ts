// Payment gateway routes — /api/payment/*
// Uses Duitku sandbox for real payment processing
// POST /api/payment/create-invoice  - create payment invoice
// POST /api/payment/webhook         - handle payment callback
// GET  /api/payment/status/:ref     - check payment status

import express, { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import https from 'https';

interface PaymentDeps {
  db: any;
  audit?: (userId: string, event: string, detail: string) => void;
  ledger?: any;
}

// Duitku config
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const DUITKU_MERCHANT_KEY = process.env.DUITKU_MERCHANT_KEY || '';
const DUITKU_SANDBOX = process.env.DUITKU_SANDBOX !== '0';
const DUITKU_BASE = DUITKU_SANDBOX ? 'https://api-sandbox.duitku.com' : 'https://api.duitku.com';

function generateSignature(merchantCode: string, amount: number, datetime: string, apiKey: string): string {
  const strToSign = `${merchantCode}${amount}${datetime}`;
  return createHash('sha256').update(strToSign).digest('hex');
}

export function createPaymentRouter(deps: PaymentDeps): Router {
  const router = Router();
  router.use(express.json());

  // POST /api/payment/create-invoice
  router.post('/api/payment/create-invoice', async (req: Request, res: Response) => {
    try {
      const uid = (req as any).userId || req.body.userId;
      const { amount, asset, paymentMethod, customerName, email, phone } = req.body ?? {};
      
      if (!amount || !paymentMethod) {
        return res.status(400).json({ error: 'amount and paymentMethod required' });
      }

      // If no API keys configured, return simulated invoice
      if (!DUITKU_MERCHANT_CODE || !DUITKU_MERCHANT_KEY) {
        const invoiceId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const idrAmount = Math.round(amount * 15500);
        
        // Store invoice in DB (simulated)
        const existing = deps.db.prepare('SELECT id FROM payment_invoices WHERE id = ?').get(invoiceId);
        if (!existing) {
          deps.db.prepare(`
            INSERT INTO payment_invoices (id, user_id, gateway_ref, amount, asset, payment_method, status, payment_url, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
          `).run(invoiceId, uid, `SIM_${invoiceId}`, amount, asset || 'USDT', paymentMethod, `/simulate/pay/${invoiceId}`, Date.now(), Date.now() + 86400000);
        }

        deps.audit?.(uid, 'payment_create', `Created simulated invoice ${invoiceId} for ${amount} ${asset} via ${paymentMethod}`);
        
        return res.json({
          ok: true,
          invoiceId,
          paymentUrl: `/simulate/pay/${invoiceId}`,
          vaNumber: null,
          qrCode: null,
          expiryTime: null,
          simulasi: true,
          amountIdr: idrAmount,
          message: 'Simulasi mode - payment gateway belum dikonfigurasi.',
        });
      }

      // Real Duitku integration
      const amountIdr = Math.round(amount * 15500);
      const merchantOrderId = `CQ${Date.now()}${randomBytes(4).toString('hex').slice(0, 4)}`;
      const datetime = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const signature = generateSignature(DUITKU_MERCHANT_CODE, amountIdr, datetime, DUITKU_MERCHANT_KEY);

      const postData = JSON.stringify({
        merchantCode: DUITKU_MERCHANT_CODE,
        merchantOrderId,
        paymentAmount: amountIdr,
        paymentMethod,
        productDetails: 'ChinQue Crypto Deposit',
        customerVaName: customerName || 'Customer',
        email,
        phoneNumber: phone,
        signature,
        datetime,
        callbackUrl: `${process.env.BASE_URL || 'http://localhost:22220'}/api/payment/webhook`,
        returnUrl: `${process.env.BASE_URL || 'http://localhost:22220'}/dashboard/wallet`,
        expiryPeriod: 1440,
      });

      const options = {
        hostname: DUITKU_SANDBOX ? 'api-sandbox.duitku.com' : 'api.duitku.com',
        port: 443,
        path: '/api/merchant/createInvoice',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-duitku-merchantcode': DUITKU_MERCHANT_CODE,
          'x-duitku-signature': signature,
          'x-duitku-timestamp': Date.now().toString(),
        },
      };

      const invoiceResult = await new Promise<any>((resolve, reject) => {
        const req2 = https.request(options, (result) => {
          let data = '';
          result.on('data', chunk => data += chunk);
          result.on('end', () => {
            // Handle non-JSON responses (e.g., 401 Unauthorized)
            if (result.statusCode === 401 || result.statusCode === 403) {
              return reject(new Error(data || 'API authentication failed'));
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
            }
          });
        });
        req2.on('error', reject);
        req2.write(postData);
        req2.end();
      });

      if (invoiceResult.statusCode !== '200' || invoiceResult.success !== true) {
        return res.status(200).json({
          statusCode: '200',
          success: false,
          message: invoiceResult?.message || 'Payment creation failed'
        });
        res.status(500).json({ error: invoiceResult?.message || 'Payment creation failed' });
      }

      const invoiceId = createHash('sha256').update(`${merchantOrderId}-${Date.now()}`).digest('hex').slice(0, 16);
      deps.db.prepare(`
        INSERT INTO payment_invoices (id, user_id, gateway_ref, amount, asset, payment_method, status, payment_url, va_number, qr_code, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(invoiceId, uid, merchantOrderId, amount, asset || 'USDT', paymentMethod, invoiceResult.paymentUrl || '', invoiceResult.vaNumber || null, invoiceResult.qrString || null, Date.now(), Date.now() + 86400000);

      deps.audit?.(uid, 'payment_create', `Created invoice ${invoiceId} for ${amount} ${asset}`);
      
      res.json({
        ok: true,
        invoiceId,
        paymentUrl: invoiceResult.paymentUrl,
        vaNumber: invoiceResult.vaNumber,
        qrCode: invoiceResult.qrString,
        expiryTime: invoiceResult.expiryTime,
      });
    } catch (e) {
      console.error('[PAYMENT] Error:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /api/payment/webhook — Duitku callback
  router.post('/api/payment/webhook', (req: Request, res: Response) => {
    try {
      const { merchantCode, merchantOrderId, amount, statusCode, signature } = req.body ?? {};
      
      const datetime = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const expectedSig = generateSignature(merchantCode!, amount!, datetime, DUITKU_MERCHANT_KEY);
      if (signature !== expectedSig) {
        console.warn('[PAYMENT] Invalid signature from webhook');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const invoice = deps.db.prepare(`SELECT * FROM payment_invoices WHERE gateway_ref = ?`).get(merchantOrderId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (statusCode === '200') {
        deps.db.prepare(`
          UPDATE payment_invoices SET status = 'paid', paid_at = ? WHERE id = ?
        `).run(Date.now(), invoice.id);
        
        // Credit user balance
        if (deps.ledger) {
          deps.ledger.postExternal(invoice.user_id, invoice.amount, invoice.asset, `payment_${invoice.gateway_ref}`);
        }
        
        deps.audit?.(invoice.user_id, 'payment_success', `Payment ${invoice.gateway_ref} completed, crediting ${invoice.amount} ${invoice.asset}`);
      } else if (statusCode === '201' || statusCode === '202') {
        deps.db.prepare(`UPDATE payment_invoices SET status = 'pending' WHERE id = ?`).run(invoice.id);
      }

      res.json({ statusCode: '200', message: 'SUCCESS' });
    } catch (e) {
      console.error('[PAYMENT] Webhook error:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/payment/status/:ref
  router.get('/api/payment/status/:ref', (req: Request, res: Response) => {
    try {
      const invoice = deps.db.prepare(`
        SELECT * FROM payment_invoices WHERE gateway_ref = ? OR id = ?
      `).get(req.params.ref, req.params.ref);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      res.json({ invoice });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/payment/methods/:userId - list available payment methods
  router.get('/api/payment/methods/:userId', (req: Request, res: Response) => {
    try {
      const methods = [
        { id: 'VA_BNI', name: 'Virtual Account BNI', type: 'bank_transfer', enabled: true },
        { id: 'VA_BCA', name: 'Virtual Account BCA', type: 'bank_transfer', enabled: true },
        { id: 'VA_MANDIRI', name: 'Virtual Account Mandiri', type: 'bank_transfer', enabled: true },
        { id: 'DANA', name: 'DANA', type: 'e_wallet', enabled: true },
        { id: 'OVO', name: 'OVO', type: 'e_wallet', enabled: true },
        { id: 'GO_PAY', name: 'GoPay', type: 'e_wallet', enabled: true },
        { id: 'SHOPEEPAY', name: 'ShopeePay', type: 'e_wallet', enabled: true },
        { id: 'QRIS', name: 'QRIS', type: 'qris', enabled: true },
      ];
      res.json({ ok: true, methods, userId: req.params.userId });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });


  // POST /api/payment/simulate/pay/:invoiceId - simulate payment completion
  router.post('/api/payment/simulate/pay/:invoiceId', async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const invoice = deps.db.prepare('SELECT * FROM payment_invoices WHERE id = ?').get(invoiceId);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      if (invoice.status === 'paid') return res.json({ ok: true, status: 'already_paid' });

      deps.db.prepare(`UPDATE payment_invoices SET status = 'paid', paid_at = ? WHERE id = ?`).run(Date.now(), invoiceId);
      
      // Credit balance via ledger
      if (deps.ledger) {
        const acctId = await deps.ledger.getAccountId(invoice.user_id);
        deps.ledger.post({ id: require('crypto').randomBytes(16).toString('hex'), timestamp: Date.now(), description: `Simulated payment: ${invoice.payment_method}`, debits: [{ accountId: acctId, asset: invoice.asset, amount: invoice.amount }], credits: [] });
      }
      
      deps.audit?.(invoice.user_id, 'payment_success', `Simulated payment completed: ${invoice.amount} ${invoice.asset}`);

      res.json({ ok: true, invoiceId, status: 'paid' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });
  return router;
}
