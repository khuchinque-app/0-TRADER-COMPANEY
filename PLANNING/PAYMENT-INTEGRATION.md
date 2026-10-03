# Payment Integration Plan — ChinQue-Cripto PRO

## Overview
Real payment integration for Indonesian market using Duitku as primary gateway (supports QRIS, e-wallets DANA/OVO/GoPay/ShopeePay, bank virtual accounts). Midtrans as fallback/backup.

## Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Terminal      │────▶│    Engine       │────▶│  Duitku API     │
│  (Next.js)      │     │  (Express)      │     │  (Payment GW)   │
│  :8000 → :80    │     │  :22220         │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Static Server  │     │   SQLite DB     │
│  (chinque-cripto│     │  (ledger.db)    │
│   :2217)        │     │                 │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Wallet Page   │
│  /dashboard/wallet │
└─────────────────┘
```

## Payment Methods
| Method | Type | Code | Fee |
|--------|------|------|-----|
| BCA Virtual Account | Bank Transfer | BC | Rp 2,500 |
| BNI Virtual Account | Bank Transfer | I1 | Rp 2,500 |
| BRI Virtual Account | Bank Transfer | BR | Rp 2,500 |
| Mandiri Virtual Account | Bank Transfer | M2 | Rp 2,500 |
| CIMB Niaga Virtual Account | Bank Transfer | B1 | Rp 2,500 |
| Permata Virtual Account | Bank Transfer | BT | Rp 2,500 |
| DANA | E-Wallet | DN | Rp 1,000 |
| OVO | E-Wallet | OV | Rp 1,000 |
| GoPay | E-Wallet | GP | Rp 1,000 |
| ShopeePay | E-Wallet | SP | Rp 1,000 |
| QRIS | QR Payment | QR | Rp 700 |

## API Endpoints to Implement

### 1. Payment Gateway Routes (`apps/engine/src/server/payment.ts`)
```
POST /api/payment/create-invoice     - Create payment invoice via Duitku
POST /api/payment/notification       - Handle Duitku webhook/callback
GET  /api/payment/status/:invoiceId  - Check payment status
GET  /api/payment/methods            - List available payment methods
```

### 2. Wallet Enhancement (`apps/engine/src/server/wallet.ts`)
- Add `paymentGateway` field to deposit flow
- Support real payment creation via Duitku
- Auto-credit on successful notification
- Support QRIS display

### 3. Database Schema Extensions
```sql
-- Payment invoices
CREATE TABLE payment_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  duitku_reference TEXT UNIQUE,
  amount REAL NOT NULL,
  asset TEXT NOT NULL DEFAULT 'USDT',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK(status IN ('pending', 'paid', 'expired', 'cancelled')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  paid_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_invoices_user ON payment_invoices(user_id);
CREATE INDEX idx_invoices_ref ON payment_invoices(duitku_reference);

-- Payment notifications log
CREATE TABLE payment_notifications (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES payment_invoices(id)
);
```

## Frontend Changes

### Wallet Page (`apps/terminal/app/dashboard/wallet/page.tsx`)
- Add payment method selection grid
- Show VA number after creation
- Display QRIS code (image)
- Auto-refresh payment status
- Show payment expiry countdown

### New Section: "Akun & Pembayaran"
Create `/dashboard/account` with:
- Deposit history with payment status
- Withdrawal history
- Payment method management
- Invoice download

## Security Considerations
1. **Webhook Verification**: Verify Duitku signature on all notifications
2. **Idempotency**: Prevent duplicate credits using invoice reference
3. **Rate Limiting**: Limit payment creation to 5 per minute per user
4. **Audit Trail**: Log all payment attempts

## Configuration (.env)
```bash
# Duitku API
DUITKU_MERCHANT_CODE=D0000
DUITKU_MERCHANT_KEY=your_key_here
DUITKU_SANDBOX=1  # Set to 0 for production

# Midtrans (fallback)
MIDTRANS_SERVER_KEY=your_key_here
MIDTRANS_FRAMEWORK=midtrans

# Payment Settings
PAYMENT_FEE_PERCENT=0.5  # Platform fee %
MIN_DEPOSIT_USD=1        # Minimum deposit
MAX_DEPOSIT_USD=10000    # Maximum deposit per transaction
```

## Implementation Phases

### Phase 1: Backend Foundation
- [ ] Create `payment.ts` server module
- [ ] Add database schema
- [ ] Implement Duitku API client
- [ ] Add webhook handler

### Phase 2: Integration
- [ ] Update wallet.ts to use payment gateway
- [ ] Add payment creation endpoint
- [ ] Implement status checking

### Phase 3: Frontend
- [ ] Enhance wallet page UI
- [ ] Add payment method selector
- [ ] Show VA/QRIS display
- [ ] Add account/payment history page

### Phase 4: Testing & Security
- [ ] Test webhook verification
- [ ] Add rate limiting
- [ ] Audit trail implementation
- [ ] Error handling improvements

## File Locations
- Backend: `apps/engine/src/server/payment.ts`
- Frontend: `apps/terminal/app/dashboard/wallet/page.tsx`
- New: `apps/terminal/app/dashboard/account/page.tsx`
- Schema: `apps/engine/src/ledger/schema.sql`

Last Updated: 2026-10-02
Status: Ready for Implementation
