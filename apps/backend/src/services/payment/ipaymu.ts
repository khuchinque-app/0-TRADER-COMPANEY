/**
 * iPaymu Payment Gateway Service
 * 
 * Features:
 * - Virtual Account deposits
 * - Built-in escrow protection
 * - Insurance coverage
 * - Multiple payment channels (95%+)
 * 
 * Docs: https://ipaymu.com/docs
 */

import crypto from 'crypto';

export interface iPaymuConfig {
  apiKey: string;
  merchantCode: string;
  sandbox: boolean;
}

export interface CreateInvoiceParams {
  externalId: string;
  amount: number;
  customerName: string;
  email: string;
  callbackUrl: string;
  expiryDate?: string;
}

export interface InvoiceResponse {
  invoice_id: string;
  external_id: string;
  amount: string;
  status: string;
  va_number?: string;
  expire_at?: string;
  deep_link?: string;
}

export class iPaymuService {
  private apiKey: string;
  private merchantCode: string;
  private baseUrl: string;
  private readonly API_VERSION = 'v2';

  constructor(config: iPaymuConfig) {
    this.apiKey = config.apiKey;
    this.merchantCode = config.merchantCode;
    this.baseUrl = config.sandbox 
      ? 'https://sandbox.ipaymu.com/api'
      : 'https://api.ipaymu.com/api';
  }

  /**
   * Generate HMAC signature for API authentication
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha512', this.apiKey)
      .update(payload)
      .digest('hex');
  }

  /**
   * Create invoice for deposit
   */
  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}${params.externalId}${params.amount}${this.merchantCode}`;
    const signature = this.generateSignature(payload);

    const body = {
      apiKey: this.apiKey,
      merchantCode: this.merchantCode,
      invoiceId: params.externalId,
      amount: params.amount,
      customerName: params.customerName,
      email: params.email,
      callback: params.callbackUrl,
      expire: params.expiryDate || this.getDefaultExpiry(),
      sign: signature,
      timestamp: timestamp,
    };

    const response = await fetch(`${this.baseUrl}/${this.API_VERSION}/invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;
    
    if (!data.success) {
      throw new Error(`iPaymu API Error: ${data.message || 'Unknown error'}`);
    }

    return data.data as InvoiceResponse;
  }

  /**
   * Check invoice status
   */
  async checkStatus(invoiceId: string): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}${invoiceId}${this.merchantCode}`;
    const signature = this.generateSignature(payload);

    const body = {
      apiKey: this.apiKey,
      merchantCode: this.merchantCode,
      invoiceId: invoiceId,
      sign: signature,
      timestamp: timestamp,
    };

    const response = await fetch(`${this.baseUrl}/${this.API_VERSION}/invoice/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * Get default expiry (7 days from now)
   */
  private getDefaultExpiry(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, payload: string): boolean {
    const expected = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  }
}

// Export singleton instance
let instance: iPaymuService | null = null;

export function getIPaymuService(): iPaymuService {
  if (!instance) {
    instance = new iPaymuService({
      apiKey: process.env.IPAYMU_API_KEY || '',
      merchantCode: process.env.IPAYMU_MERCHANT_CODE || '',
      sandbox: process.env.NODE_ENV !== 'production',
    });
  }
  return instance;
}
