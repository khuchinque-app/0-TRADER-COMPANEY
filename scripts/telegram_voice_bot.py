# --- Telegram Voice Agent with Control System ---
# Bot hanya membalas ketika kamu kasih perintah/trigger

import os
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from elevenlabs import generate, save
from pydub import AudioSegment
import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === CONFIG ===
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"  # Adam voice
ADMIN_USER_ID = None  # Set your Telegram user ID here

# === CONTROL STATE ===
AGENT_ENABLED = False  # Default: agent mati

# === VOICE FUNCTIONS ===
async def transcribe_voice(file_path: str) -> str:
    """Transcribe voice using Whisper API"""
    # Placeholder - implement your transcription logic
    return "Voice recognized"

async def get_agent_response(text: str) -> str:
    """Get AI response - placeholder for your agent logic"""
    return f"Response: {text}"

async def generate_voice(text: str, output_path: str):
    """Generate HD Indonesian TTS using ElevenLabs"""
    try:
        audio = generate(
            text=text,
            voice_id=ELEVENLABS_VOICE_ID,
            model="eleven_multilingual_v2"
        )
        mp3_path = output_path.replace(".ogg", ".mp3")
        save(audio, mp3_path)
        sound = AudioSegment.from_mp3(mp3_path)
        sound.export(output_path, format="ogg", codec="libopus")
        os.remove(mp3_path)
    except Exception as e:
        logger.error(f"TTS Error: {e}")

# === MAIN HANDLERS ===
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command - shows how to control the agent"""
    global AGENT_ENABLED
    
    user_id = update.effective_user.id
    if ADMIN_USER_ID is None:
        ADMIN_USER_ID = user_id
    
    welcome = """
*🤖 Voice Agent Control Panel*

*Commands (Admin only):*
• `/on` — Hidupin agent
• `/off` — Matikan agent  
• `/status` — Cek status agent
• `/listen` — Dengerin voice memo
• `/help` — Bantuan

*Note:* Agent hanya aktif kalau kamu bilang `/on`.
Kamu admin = ID: *{user_id}*
""".format(user_id=user_id)
    
    await update.message.reply_text(welcome)

async def set_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set yourself as admin"""
    global ADMIN_USER_ID
    ADMIN_USER_ID = update.effective_user.id
    await update.message.reply_text(f"✅ Admin diatur ke ID: *{ADMIN_USER_ID}*")

async def on_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enable agent"""
    global AGENT_ENABLED
    if update.effective_user.id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Hanya admin yang bisa pakai perintah ini")
        return
    AGENT_ENABLED = True
    await update.message.reply_text("✅ Agent *DITENGAHKAN* — sekarang bisa membalas")

async def off_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Disable agent"""
    global AGENT_ENABLED
    if update.effective_user.id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Hanya admin yang bisa pakai perintah ini")
        return
    AGENT_ENABLED = False
    await update.message.reply_text("❌ Agent *DIMATIKAN* — tidak akan membalas lagi")

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check agent status"""
    global AGENT_ENABLED
    status = "✅ AKTIF" if AGENT_ENABLED else "❌ MATI"
    await update.message.reply_text(f"📊 Status Agent: *{status}*")

async def listen_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle voice memo (one-time listening, doesn't require agent on)"""
    if not update.message.voice:
        await update.message.reply_text("❌ Kirim voice note dulu baru perintah /listen")
        return
    
    if update.effective_user.id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Hanya admin yang bisa pakai")
        return
    
    await update.message.reply_text("🎧 Mendengarkan...")
    
    voice_file = await update.message.voice.get_file()
    file_path = f"voice_{update.message.message_id}.ogg"
    await voice_file.download_to_drive(file_path)
    
    user_text = await transcribe_voice(file_path)
    await update.message.reply_text(f"📝 Anda berkata: \"{user_text}\"")
    
    if AGENT_ENABLED:
        ai_response = await get_agent_response(user_text)
        await update.message.reply_text("🗣 Memproses suara...")
        voice_output_path = f"reply_{update.message.message_id}.ogg"
        await generate_voice(ai_response, voice_output_path)
        
        with open(voice_output_path, 'rb') as voice:
            await update.message.reply_voice(voice=voice)
        os.remove(voice_output_path)
    
    os.remove(file_path)

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Auto-reply to voice (ONLY if agent enabled)"""
    global AGENT_ENABLED
    
    if not AGENT_ENABLED:
        return  # Jangan balas kalau agent mati
    
    if update.effective_user.id != ADMIN_USER_ID:
        return  # Hanya dengerin admin
    
    await update.message.reply_text("🎧 Mendengarkan...")
    
    voice_file = await update.message.voice.get_file()
    file_path = f"voice_{update.message.message_id}.ogg"
    await voice_file.download_to_drive(file_path)
    
    user_text = await transcribe_voice(file_path)
    await update.message.reply_text(f"📝 Anda berkata: \"{user_text}\"")
    
    ai_response = await get_agent_response(user_text)
    await update.message.reply_text("🗣 Memproses suara...")
    voice_output_path = f"reply_{update.message.message_id}.ogg"
    await generate_voice(ai_response, voice_output_path)
    
    with open(voice_output_path, 'rb') as voice:
        await update.message.reply_voice(voice=voice)
        
    os.remove(file_path)
    os.remove(voice_output_path)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Auto-reply to text (ONLY if agent enabled)"""
    global AGENT_ENABLED
    
    if not AGENT_ENABLED:
        return  # Jangan balas kalau agent mati
    
    if update.effective_user.id != ADMIN_USER_ID:
        return
    
    user_text = update.message.text
    ai_response = await get_agent_response(user_text)
    await update.message.reply_text(ai_response)

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Control commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("admin", set_admin))
    app.add_handler(CommandHandler("on", on_command))
    app.add_handler(CommandHandler("off", off_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("listen", listen_command))
    app.add_handler(CommandHandler("help", start))
    
    # Voice handler (auto-reply)
    app.add_handler(MessageHandler(filters.VOICE & filters.USER(ADMIN_USER_ID), handle_voice))
    
    # Text handler (auto-reply)
    app.add_handler(MessageHandler(filters.TEXT & filters.USER(ADMIN_USER_ID) & ~filters.COMMAND, handle_text))
    
    print("🤖 Bot ready. Gunakan /on untuk menyalakan agent.")
    app.run_polling()

if __name__ == "__main__":
    main()
