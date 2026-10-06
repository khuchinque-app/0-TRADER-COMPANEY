# Local Agent Revival Plan
**Generated:** 2026-10-06 23:15 UTC  
**Status:** IN PROGRESS

---

## 🔴 Critical Issues Found

### 1. Stray Billbot Processes (FIXED)
```
PID 343658: /home/khuchinque/5project-newtele/billbot-tele/server.py (root)
PID 343702: /home/khuchinque/5project-newtele/billbot-tele/bot_bridge.py (root)
```
**Fix Applied:** ✅ Killed both processes

### 2. Telegram Gateway Conflict (FIXED)
```
Service: telegram-gateway.service (system-level)
```
**Fix Applied:** ✅ Service stopped

### 3. Hermes Gateway Memory Leak
```
Current Usage: 2.0GB RAM
Root Cause: Multiple profiles competing for resources
```
**Fix Required:** ⏳ Manual restart from separate shell

---

## 🟡 Pending Actions

### Local Agent (@Herme_ChinQue_bot) Setup
**Status:** Token not found in VPS environment

**Required:**
1. Get new bot token from @BotFather
   - Command: `/newbot`
   - Name: Herme_ChinQue_bot
   - Save token securely

2. Configure in WSL/local environment
   - Location: `/home/chinque/.hermes/profiles/`
   - File: `.env` or `config.json`

3. Start gateway process
   ```bash
   cd /home/chinque/0-TRADER-COMPANEY
   hermes gateway run --profile herme-chinque-local
   ```

---

## 📊 Current Profile Status

| Profile | Telegram Refs | Status |
|---------|---------------|--------|
| herme-khuchinque | 188 | ✅ Active (VPS) |
| memoryenam | 7 | ⚠️ Inactive |
| ai-get-agent | 0 | ❌ No Telegram |
| jarvis-hanehane | 0 | ❌ No Telegram |
| vps | 0 | ❌ No Telegram |

---

## 🔄 Next Steps

### Immediate (VPS Agent)
1. ✅ Kill billbot processes
2. ✅ Stop telegram-gateway.service
3. ⏳ Restart Hermes gateway (requires separate shell)
4. ⏳ Verify no conflicts remain

### Local Agent Setup (User Action Required)
1. Get token from @BotFather
2. Create profile in WSL
3. Start gateway
4. Test connectivity

---

## 📝 Commands for User

### If on WSL/Linux:
```bash
# Get new bot token
# Talk to @BotFather, create /newbot, save token

# Create profile
mkdir -p ~/.hermes/profiles/herme-chinque-local
cat > ~/.hermes/profiles/herme-chinque-local/.env << EOF
TELEGRAM_BOT_TOKEN=YOUR_NEW_TOKEN_HERE
TELEGRAM_CHAT_ID=7281341176
HERMES_PROFILE=herme-chinque-local
EOF

# Start gateway
hermes gateway run --profile herme-chinque-local
```

### Verify Fix:
```bash
# Check no conflicts
ps aux | grep -E "billbot|telegram.*gateway" | grep -v grep

# Check Hermes status
systemctl --user status hermes-gateway.service

# Test bot
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

---

**Report by:** @Herme_KhuChinQue_bot (VPS Agent)  
**Next review:** After local agent starts
