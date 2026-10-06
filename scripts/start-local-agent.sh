#!/bin/bash
# Local Agent Startup Script
# Run this in WSL/Linux terminal to start @Herme_ChinQue_bot

set -e

echo "=========================================="
echo "Starting @Herme_ChinQue_bot (Local Agent)"
echo "=========================================="
echo ""

# Check if running in WSL
if ! grep -q "Microsoft\|WSL" /proc/version 2>/dev/null; then
    echo "⚠️  Warning: Not running in WSL environment"
    echo "   This should be run in your WSL terminal"
    echo ""
fi

# Source environment
export HERMES_PROFILE=herme-chinque-local
export TELEGRAM_BOT_TOKEN="8790650185:AAGD4Jt__L3s1vjava8tNr61F6Uw3VzjXNQ"
export TELEGRAM_CHAT_ID="7281341176"

# Change to project directory
cd /home/chinque/0-TRADER-COMPANEY 2>/dev/null || cd ~/0-TRADER-COMPANEY 2>/dev/null || {
    echo "❌ Error: Project directory not found"
    echo "   Expected: /home/chinque/0-TRADER-COMPANEY or ~/0-TRADER-COMPANEY"
    exit 1
}

echo "✅ Project directory: $(pwd)"
echo ""

# Check if Hermes is installed
if ! command -v hermes &> /dev/null; then
    echo "❌ Hermes CLI not found"
    echo "   Install: npm install -g @nousresearch/hermes-agent"
    exit 1
fi

echo "✅ Hermes CLI: $(hermes --version 2>&1)"
echo ""

# Start gateway
echo "🚀 Starting Hermes Gateway..."
echo ""
echo "Profile: $HERMES_PROFILE"
echo "Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "Chat ID: $TELEGRAM_CHAT_ID"
echo ""
echo "Press Ctrl+C to stop"
echo ""

hermes gateway run --profile herme-chinque-local
