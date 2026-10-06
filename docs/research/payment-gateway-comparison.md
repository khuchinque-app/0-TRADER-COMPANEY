# Payment Gateway Research — Scout Report
**Generated:** 2026-10-06 23:09 UTC  
**Scout Agent:** deleg_67872e36

---

## Executive Summary

For Indonesian trading platform, **Duitku** is recommended as primary gateway with **Midtrans** as backup. BCA Netter requires enterprise account and complex OAuth setup.

---

## Comparison Matrix

| Feature | Duitku | Midtrans | Xendit | BCA Netter |
|---------|--------|----------|--------|------------|
| **Setup Fee** | Rp 0 | Rp 0 | Rp 0 | Contact sales |
| **Monthly Fee** | Rp 0 | Rp 0 | Rp 0 | Contact sales |
| **VA Fee** | Rp 1,500-5,000 | ~Rp 4,000 | Rp 4,000 | Variable |
| **Card Fee** | 2.9% + Rp 2,500 | 2.9% + Rp 2,000 | 2.9% + Rp 2,000 | Contact sales |
| **E-Wallet** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Limited |
| **API Quality** | Good | Excellent | Excellent | Good |
| **SDK Available** | ✅ Node.js | ✅ Node.js | ✅ Node.js | ❌ None |
| **Docs Language** | EN/ID | EN/ID | EN | ID |
| **Settlement** | T+1 | T+1 | T+1 | T+1 |

---

## Detailed Analysis

### 1. Duitku (Recommended Primary)

**Pros:**
- Indonesian payment gateway, local support
- Clean REST API v2
- Node.js SDK available
- Good documentation in Indonesian
- Supports: VA (all major banks), Cards, E-wallets (GoPay, OVO, DANA), QRIS
- Zero setup/monthly fees
- Competitive pricing

**Cons:**
- API less polished than Midtrans/Xendit
- Fewer integrations
- Smaller ecosystem

**Best For:** SMEs, startups, local-focused platforms

**Documentation:** https://docs.duitku.com

---

### 2. Midtrans (Recommended Backup)

**Pros:**
- Most popular in Indonesia
- Excellent API and documentation
- Rich feature set (snap, core API, cactus)
- Great frontend UI (Snap popup)
- Large ecosystem and community
- Good analytics dashboard

**Cons:**
- Slightly higher card fees
- More complex setup for advanced features
- Enterprise-focused (may be overkill)

**Best For:** Scaling businesses, enterprises

**Documentation:** https://docs.midtrans.com

---

### 3. Xendit (Alternative)

**Pros:**
- Developer-friendly API
- Clean documentation
- Good SDKs
- Fast integration

**Cons:**
- Smaller market share than Midtrans
- Less local support

**Best For:** Tech-savvy teams, startups

---

### 4. BCA Netter (Not Recommended for MVP)

**Pros:**
- Direct bank integration
- Lower fees (potentially)
- Brand trust

**Cons:**
- Requires enterprise BCA account
- Complex OAuth2.0 setup
- No public SDK
- Longer onboarding (weeks)
- Limited to BCA customers

**Best For:** Large enterprises with BCA relationship

**Documentation:** https://developer.bca.co.id

---

## Recommendation

### For Trading Company MVP:
**Primary: Duitku**
- Easier integration
- Lower barrier to entry
- Good enough for MVP
- Local support

**Backup: Midtrans**
- Add after Duitku proven
- Migration path exists
- Can run both in parallel

### Implementation Strategy:
```
Phase 1: Duitku integration
  - Deposit via VA (virtual account)
  - Webhook handling
  - Test in sandbox

Phase 2: Midtrans fallback
  - Same deposit flow
  - Auto-failover on Duitku error

Phase 3: BCA Netter (later)
  - Enterprise feature
  - Lower fees for high volume
```

---

## API Complexity Assessment

| Gateway | Difficulty | Time Estimate |
|---------|------------|---------------|
| Duitku | Easy-Medium | 2-3 days |
| Midtrans | Easy | 1-2 days |
| Xendit | Easy | 1-2 days |
| BCA Netter | Hard | 1-2 weeks |

---

## Next Steps

1. Get Duitku merchant credentials (sign up at duitku.com)
2. Implement deposit endpoint
3. Add webhook handler
4. Test in sandbox
5. Deploy to production

---

*Report saved to: /home/khuchinque/payment-gateway-research.md*
*JSON version: /home/khuchinque/payment-gateway-research.json*
