# Local Agent Setup Guide — @Herme_ChinQue_bot

**Date:** 2026-10-07  
**Status:** Ready for WSL Deployment  
**Token:** Verified ✅

---

## 🎯 Quick Start (3 Steps)

### Step 1: Copy Files to WSL

From your VPS, download these files and copy to your WSL environment:

```bash
# On your local machine (WSL terminal):
scp khuchinque@187.127.178.20:/tmp/local-agent-setup/.env ~/0-TRADER-COMPANEY/
scp khuchinque@187.127.178.20:/tmp/local-agent-setup/start-local-agent.sh ~/0-TRADER-COMPANEY/scripts/
```

**OR** manually copy:
- `.env` → `~/0-TRADER-COMPANEY/.env`
- `start-local-agent.sh` → `~/0-TRADER-COMPANEY/scripts/`

### Step 2: Install Hermes CLI (if not installed)

```bash
# In WSL terminal
npm install -g @nousresearch/hermes-agent
hermes --version  # Verify installation
```

### Step 3: Start the Agent

```bash
cd ~/0-TRADER-COMPANEY
chmod +x scripts/start-local-agent.sh
bash scripts/start-local-agent.sh
```

---

## ✅ Prerequisites Checklist

- [ ] WSL2 installed on Windows
- [ ] Node.js 18+ installed
- [ ] npm global packages accessible
- [ ] Telegram bot token valid (verified)
- [ ] Chat ID: `7281341176` (your personal chat)

---

## 🔧 Manual Setup (Alternative)

If the script doesn't work, run manually:

```bash
# Set environment variables
export HERMES_PROFILE=herme-chinque-local
export TELEGRAM_BOT_TOKEN="8790650185:AAEXDj-jDaA3QVZwejFJO41hu8MZ-oMiwWv4IZI"
export TELEGRAM_CHAT_ID="7281341176"

# Create profile directory
mkdir -p ~/.hermes/profiles/herme-chinque-local

# Copy .env to profile
cp .env ~/.hermes/profiles/herme-chinque-local/

# Start gateway
hermes gateway run --profile herme-chinque-local
```

---

## 🧪 Verification

After starting, verify the bot is online:

```bash
# Test token
curl -s "https://api.telegram.org/bot8790650185:AAEXDj-jDaA3QVZwejFJO41hu8MZ-oMiwWv4IZI/getMe"

# Expected response:
# {"ok":true,"result":{"id":8790650185,"is_bot":true,"first_name":"Herme ChinQue","username":"Herme_ChinQue_bot"}}
```

Send a test message to `@Herme_ChinQue_bot` on Telegram. You should get a reply.

---

## 📋 Role Definition

**Local Agent (@Herme_ChinQue_bot) Responsibilities:**
- Code review of changes
- Quality assurance checks
- Testing and validation
- Second opinion on decisions
- Assists VPS agent with parallel tasks

**Communication Protocol:**
- Mentions `@Herme_ChinQue_bot` in group chat for local agent tasks
- VPS agent (`@Herme_KhuChinQue_bot`) handles production deployment
- Local agent reviews before merge to master

---

## 🚨 Troubleshooting

### Error: "Token invalid"
→ Token is valid (verified). Check if you're running in WSL environment.

### Error: "Hermes CLI not found"
```bash
npm install -g @nousresearch/hermes-agent
```

### Error: "Profile not found"
→ Ensure `.env` file is in correct location:
```
~/.hermes/profiles/herme-chinque-local/.env
```

### Bot not responding
→ Check if gateway is running:
```bash
ps aux | grep hermes
```
→ Restart if needed:
```bash
hermes gateway stop --profile herme-chinque-local
hermes gateway run --profile herme-chinque-local
```

---

## 📁 File Locations

| File | VPS Location | WSL Location |
|------|-------------|--------------|
| Profile .env | `~/.hermes/profiles/herme-chinque-local/.env` | `~/.hermes/profiles/herme-chinque-local/.env` |
| Startup script | `/home/khuchinque/0-TRADER-COMPANEY/scripts/start-local-agent.sh` | `~/0-TRADER-COMPANEY/scripts/start-local-agent.sh` |
| Project root | `/home/khuchinque/0-TRADER-COMPANEY` | `~/0-TRADER-COMPANEY` |

---

## 📞 Support

If issues persist:
1. Check Hermes logs: `~/.hermes/profiles/herme-chinque-local/logs/`
2. Verify network connectivity to Telegram API
3. Ensure no other processes are using port 29900 (A2A gateway)

---

**Setup Status:** ✅ READY TO DEPLOY
