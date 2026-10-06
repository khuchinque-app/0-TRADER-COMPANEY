# A2A Queue Setup Guide

**Date:** 2026-10-07  
**Status:** Partial - Needs Configuration

---

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| VPS Agent | ✅ Active | @Herme_KhuChinQue_bot |
| Local Agent | ✅ Active | @Herme_ChinQue_bot |
| A2A Gateway | ❌ Not Running | Port 29900 closed |
| Queue System | ⚠️ Limited | No dedicated queue |

---

## A2A Setup Requirements

### Option 1: Direct Telegram Coordination (Current)
Agents communicate via Telegram group mentions:
```
@Herme_KhuChinQue_bot handle production task
@Herme_ChinQue_bot review code changes
```

### Option 2: A2A Gateway (Advanced)
Requires:
1. Hermes Gateway on port 29900
2. A2A protocol configuration
3. Agent discovery service

---

## Quick A2A Test via Telegram

### Test 1: VPS → Local
```
@Herme_ChinQue_bot @Herme_KhuChinQue_bot review commit fcdfa80
```

### Test 2: Local → VPS
```
@Herme_KhuChinQue_bot @Herme_ChinQue_bot deploy to staging
```

---

## Next Steps

1. **For simple coordination:** Use Telegram mentions (working now)
2. **For complex workflows:** Set up A2A gateway on port 29900
3. **For queuing:** Use task files in `ops/` directory

---

**Recommendation:** Start with Telegram mentions for now. Set up A2A gateway when needed for automated agent-to-agent communication.
