/**
 * Payment Routes
 * 
 * Endpoints:
 * - POST /api/payment/create - Create invoice
 * - GET /api/payment/status/:invoiceId - Check status
 * - POST /api/payment/callback - Webhook handler
 */

import { Router, Request, Response } from 'express';
import { getIPaymuService } from '../services/payment/ipaymu';

const router = Router();

/**
 * POST /api/payment/create
 * Create deposit invoice
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, customerName, email } = req.body;

    if (!orderId || !amount || !customerName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, amount, customerName, email'
      });
    }

    const paymentService = getIPaymuService();
    const invoice = await paymentService.createInvoice({
      externalId: orderId,
      amount: Number(amount),
      customerName,
      email,
      callbackUrl: `${process.env.API_URL || 'http://localhost:11110'}/api/payment/callback`,
    });

    res.json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create invoice'
    });
  }
});

/**
 * GET /api/payment/status/:invoiceId
 * Check invoice status
 */
router.get('/status/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const paymentService = getIPaymuService();
    const status = await paymentService.checkStatus(invoiceId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check status'
    });
  }
});

/**
 * POST /api/payment/callback
 * Webhook handler for payment notifications
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { invoiceId, statusCode, grossAmount, sign } = req.body;

    // Verify signature
    const paymentService = getIPaymuService();
    const payload = JSON.stringify(req.body);
    
    if (!paymentService.verifyWebhook(sign, payload)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // Process payment
    console.log(`Payment callback received: ${invoiceId} - ${statusCode}`);
    
    // TODO: Update database with payment status
    // await updateOrderPayment(invoiceId, statusCode, grossAmount);

    res.json({ success: true, message: 'OK' });
  } catch (error: any) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export const paymentRouter = router;
