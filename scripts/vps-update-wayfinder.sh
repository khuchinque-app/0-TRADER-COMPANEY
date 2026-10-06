#!/bin/bash
# VPS Update Script for 0-TRADER-COMPANEY
# Installs Wayfinder skills and configures Hermes Agent

set -e

PROJECT_DIR="/home/khuchinque/0-TRADER-COMPANEY"
HERMES_SKILLS_DIR="$HOME/.hermes/profiles/herme-khuchinque/skills/engineering"

echo "=== VPS Update Script ==="
echo ""

# Step 1: Git Pull
echo "Step 1: Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin master 2>/dev/null || echo "No changes to pull or not on master branch"
echo "✅ Git pull complete"

# Step 2: Install Wayfinder Skills
echo ""
echo "Step 2: Installing Wayfinder skills..."

# Copy wayfinder skill from PLANNING to hermes skills
if [ -d "$PROJECT_DIR/PLANNING/.agents/skills/wayfinder" ]; then
    cp -r "$PROJECT_DIR/PLANNING/.agents/skills/wayfinder" "$HERMES_SKILLS_DIR/"
    echo "✅ Wayfinder skill installed to $HERMES_SKILLS_DIR/wayfinder"
else
    echo "⚠️ Wayfinder source not found in PLANNING/.agents/skills/"
fi

# Copy other engineering skills
for skill_dir in ask-matt code-review codebase-design diagnosing-bugs domain-modeling grill-me grill-with-docs grilling implement implement-spec improve-codebase-architecture loop-me pr retro setup-matt-pocock-skills tdd teach to-questionnaire to-spec to-tickets triage wait-what writing-beats writing-for-agents writing-fragments writing-shape wizard; do
    if [ -d "$PROJECT_DIR/PLANNING/.agents/skills/$skill_dir" ]; then
        cp -r "$PROJECT_DIR/PLANNING/.agents/skills/$skill_dir" "$HERMES_SKILLS_DIR/" 2>/dev/null || true
    fi
done

echo "✅ Engineering skills installed"

# Step 3: Configure Hermes MCP
echo ""
echo "Step 3: Configuring Hermes MCP..."

# Create voice MCP server config
cat > "$PROJECT_DIR/voice_mcp_server.py" << 'EOF'
"""Trading Voice MCP Server - FastMCP version"""
import asyncio
import os
import logging
import time
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
import httpx
from elevenlabs import ElevenLabs
from pydub import AudioSegment

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
CHAT_API_URL = "http://localhost:11110/api/chat"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-mcp")

elevenlabs_client = None
if ELEVENLABS_API_KEY:
    elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

mcp = FastMCP("trading-voice")

@mcp.tool()
async def speak(text: str, lang: str = "id") -> str:
    """Generate Indonesian voice note from text."""
    if not ELEVENLABS_API_KEY:
        return "ELEVENLABS_API_KEY not configured"
    
    output_path = f"/tmp/voice_{int(time.time())}.ogg"
    try:
        audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            model_id="eleven_multilingual_v2",
            text=text,
            output_format="mp3_44100_128"
        )
        mp3_path = output_path.replace(".ogg", ".mp3")
        with open(mp3_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)
        
        if not os.path.exists(mp3_path) or os.path.getsize(mp3_path) == 0:
            raise Exception("Generated audio is empty")
        
        sound = AudioSegment.from_mp3(mp3_path)
        sound.export(output_path, format="ogg", codec="libopus")
        os.remove(mp3_path)
        
        logger.info(f"Voice generated: {output_path}")
        return f"Voice generated successfully: {output_path}"
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return f"Error generating voice: {e}"

@mcp.tool()
async def chat(message: str) -> str:
    """Get AI response about Trading Company from backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(CHAT_API_URL, json={"message": message}, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            return data.get("reply", data.get("response", data.get("text", "")))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return f"Error: {e}"

@mcp.tool()
async def trade_info(query: str) -> str:
    """Get trading-related information."""
    return await chat(f"Trading question: {query}")

if __name__ == "__main__":
    mcp.run()
EOF

echo "✅ Voice MCP server configured"

# Step 4: Verify Services
echo ""
echo "Step 4: Verifying services..."

pm2 list | grep -E "backend|terminal|engine" || echo "⚠️ PM2 services not running"

echo ""
echo "=== Update Complete ==="
echo "Project: $PROJECT_DIR"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
