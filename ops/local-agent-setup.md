# Local Agent Setup Guide

## Quick Start

### Step 1: Copy Files to WSL
```bash
# From VPS, send these files to your WSL environment:
- ~/.hermes/profiles/herme-chinque-local/.env
- /home/khuchinque/0-TRADER-COMPANEY/scripts/start-local-agent.sh
```

### Step 2: In WSL Terminal
```bash
# Navigate to project
cd ~/0-TRADER-COMPANEY

# Make script executable
chmod +x scripts/start-local-agent.sh

# Run the agent
bash scripts/start-local-agent.sh
```

### Step 3: Verify Bot is Running
```bash
# Test token
curl -s "https://api.telegram.org/bot8790650185:AAGD4Jt__L3s1vjava8tNr61F6Uw3VzjXNQ/getMe"
```

## Manual Setup (Alternative)

If the script doesn't work, run manually:

```bash
# Set environment variables
export HERMES_PROFILE=herme-chinque-local
export TELEGRAM_BOT_TOKEN="8790650185:AAGD4Jt__L3s1vjava8tNr61F6Uw3VzjXNQ"
export TELEGRAM_CHAT_ID="7281341176"

# Start gateway
hermes gateway run --profile herme-chinque-local
```

## Troubleshooting

### Error: "No such profile"
```bash
# Create profile directory
mkdir -p ~/.hermes/profiles/herme-chinque-local
cat > ~/.hermes/profiles/herme-chinque-local/.env << 'EOF'
TELEGRAM_BOT_TOKEN=8790650185:AAGD4Jt__L3s1vjava8tNr61F6Uw3VzjXNQ
TELEGRAM_CHAT_ID=7281341176
HERMES_PROFILE=herme-chinque-local
