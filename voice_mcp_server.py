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
