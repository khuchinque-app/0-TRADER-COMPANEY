# Phase 3 Plan — Fix Telegram + Start Payment Integration
**Date:** 2026-10-06 23:25 UTC  
**Priority:** D > B > A > C

---

## Phase 3A: Fix Telegram (CRITICAL)

### Issue
Telegram bot token `8871079691:[REDACTED_BOT_TOKEN]` returns 401 Unauthorized.

### Fix Steps
```bash
# 1. Get NEW token from @BotFather
# Command: /newbot → Name: Herme_KhuChinQue_bot → Save token

# 2. Update .env
echo "TELEGRAM_BOT_TOKEN=NEW_TOKEN_HERE" >> .env

# 3. Restart gateway
pm2 restart backend
hermes gateway restart
```

### Verification
```bash
curl -s "https://api.telegram.org/botNEW_TOKEN/getMe" | jq '.result.username'
```

---

## Phase 3B: Payment Gateway Integration

### Duitku Implementation Plan

#### Step 1: Install Duitku SDK
```bash
cd apps/backend
npm install duitku
```

#### Step 2: Create Payment Service
```typescript
// apps/backend/src/services/payment/duitku.ts
import Duitku from 'duitku';

export class DuitkuService {
  private client: Duitku;

  constructor() {
    this.client = new Duitku({
      merchantCode: process.env.DUITKU_MERCHANT_CODE,
      key: process.env.DUITKU_API_KEY,
    });
  }

  async createInvoice(orderId: string, amount: number) {
    return await this.client.invoice.create({
      externalId: orderId,
      amount: amount.toString(),
      callbackUrl: `${process.env.API_URL}/api/payment/callback`,
    });
  }

  async checkStatus(invoiceId: string) {
    return await this.client.invoice.status(invoiceId);
  }
}
```

#### Step 3: Add API Routes
```typescript
// apps/backend/src/routes/payment.ts
router.post('/api/payment/create', createInvoice);
router.get('/api/payment/status/:invoiceId', getInvoiceStatus);
router.post('/api/payment/callback', handleCallback);
```

#### Step 4: Webhook Handler
```typescript
async function handleCallback(req, res) {
  const { invoiceId, statusCode, grossAmount } = req.body;
  
  // Verify signature
  if (!verifyDuitkuSignature(req)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Update ledger
  await updateOrderStatus(invoiceId, statusCode);
  
  res.status(200).send('OK');
}
```

---

## Phase 3C: Database Migration (SQLite → PostgreSQL)

### Migration Plan
```bash
# 1. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. Create database
createdb trading_company

# 3. Add pg dependency
npm install pg

# 4. Update connection string
DATABASE_URL=postgres://user:pass@localhost:5432/trading_company
```

### Schema Migration
```sql
-- New PostgreSQL schema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- ... rest of fields
);

-- Same for other tables
```

---

## Action Items

### Immediate (User Must Do):
- [ ] Get new Telegram bot token from @BotFather
- [ ] Kill stray billbot processes: `sudo kill -9 343658 343702`
- [ ] Stop conflicting service: `sudo systemctl stop telegram-gateway.service`
- [ ] Sign up for Duitku merchant account: https://merchant.duitku.com

### VPS Agent Will Do:
- [ ] Implement Duitku service layer
- [ ] Add payment routes to backend
- [ ] Create webhook handler
- [ ] Add test coverage
- [ ] Deploy to staging

### Local Agent Will Do:
- [ ] Review code changes
- [ ] Test in WSL environment
- [ ] Report issues

---

**Next Update:** After Telegram token is fixed
