# Payment Gateway Research — Final Report
**Generated:** 2026-10-06 23:13 UTC  
**By:** Scout Agent + VPS Agent

---

## 🏆 FINAL RECOMMENDATION

### **Primary: Duitku**
### **Backup: Midtrans**
### **Future Expansion: Xendit**

---

## Decision Rationale

| Factor | Winner | Reason |
|--------|--------|--------|
| **Ease of Integration** | Duitku/Midtrans | Both have Node.js SDKs, good docs |
| **Local Support** | Duitku | Indonesian company, local phone support |
| **Cost** | Duitku | VA fees as low as Rp 1,500 (Artha Graha) |
| **Developer Experience** | Xendit | Cleanest API, but not priority #1 |
| **GoPay Integration** | Midtrans | Native GoPay (GoTo ecosystem) |
| **Regional Expansion** | Xendit | Already in 7 SEA countries |

---

## Comparison Matrix

| Feature | Duitku | Midtrans | Xendit | iPaymu |
|---------|--------|----------|--------|--------|
| **Setup Fee** | Free | Free | Free | Free |
| **Monthly Fee** | Free | Free | Free (min $50) | Free |
| **VA Fee (BCA)** | Rp 5,000 | Rp 4,000 | Rp 4,000 | Rp 2,500 |
| **VA Fee (Mandiri)** | Rp 4,000 | Rp 4,000 | Rp 4,000 | Rp 3,000 |
| **Card Fee** | 2.9% + Rp 2,500 | 2.9% + Rp 2,000 | 2.9% + Rp 2,000 | 2.5% + Rp 1,500 |
| **QRIS Fee** | 0.7% | 0.7% | 0.7% + Rp 700 | 0.7% |
| **E-Wallet Fee** | 1.67% | 1.5-2% | ~2-2.5% | 1.5% |
| **SDK Available** | ✅ Node.js | ✅ Node.js | ✅ Node.js | ✅ Node.js |
| **Refund Support** | ❌ Manual only | ✅ API | ✅ API | ✅ API |
| **Disbursement** | Limited | Basic | ✅ Excellent | ✅ Good |
| **Multi-currency** | ❌ IDR only | ❌ IDR only | ✅ SGD, PHP+ | ❌ IDR only |
| **Settlement** | <24h / Real-time | T+1 | T+1 | T+1 |

---

## Implementation Roadmap

### Phase 1: MVP (2 weeks)
```
✅ Duitku integration
   - Virtual Account deposits
   - Webhook handling
   - Test in sandbox
```

### Phase 2: Enhancement (1 week)
```
✅ Add Midtrans as backup
   - Same deposit flow
   - Auto-failover on error
```

### Phase 3: Scaling (1 month)
```
⏳ Xendit for SEA expansion
   - Multi-currency support
   - Better disbursement
```

---

## BCA Netter Assessment

**Verdict:** ❌ NOT RECOMMENDED for MVP

**Reasons:**
1. Not a payment gateway — it's a banking API
2. Requires enterprise account with BCA
3. Complex OAuth 2.0 setup
4. Limited to BCA customers only
5. Longer onboarding (weeks)

**Use Case:** Only if you have existing BCA enterprise relationship and need direct bank APIs for cash management/disbursements.

---

## Next Steps

1. **Sign up for Duitku merchant account**
   - Website: https://merchant.duitku.com
   - Required: Business license, NPWP, bank account
   
2. **Get API credentials**
   - API Key
   - Merchant Code
   - Sandbox access

3. **Implement integration**
   - Follow docs: https://docs.duitku.com
   - Use Node.js SDK: `npm install duitku`

---

**Files:**
- `/home/khuchinque/payment-gateway-research.md` (detailed report)
- `/home/khuchinque/payment_gateway_comparison.json` (structured data)
