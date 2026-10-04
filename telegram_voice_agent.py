"""
Telegram Voice Agent — listens to voice notes, transcribes, 
generates AI response, replies with HD Indonesian voice note.
"""
import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from openai import OpenAI
from elevenlabs import ElevenLabs, save
from pydub import AudioSegment
import io

# Load environment variables
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default: Rachel

# Initialize Clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', 
    level=logging.INFO
)

# --- 1. SPEECH TO TEXT (Listening) ---
async def transcribe_voice(file_path: str) -> str:
    """Sends the .ogg voice file to OpenAI Whisper to get text."""
    with open(file_path, "rb") as audio_file:
        transcription = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="id"  # Force Indonesian for better accuracy
        )
    return transcription.text

# --- 2. LLM THINKING (Your Agent Logic) ---
async def get_agent_response(user_text: str) -> str:
    """Sends text to AI and returns response."""
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful trading assistant. Respond in Indonesian."},
            {"role": "user", "content": user_text}
        ]
    )
    return response.choices[0].message.content

# --- 3. TEXT TO SPEECH (Speaking in HD Indonesian) ---
async def generate_voice(text: str, output_path: str):
    """Generates HD Indonesian audio using ElevenLabs and converts to .ogg for Telegram."""
    # 1. Generate MP3 from ElevenLabs
    audio = elevenlabs_client.generate(
        text=text,
        voice_id=ELEVENLABS_VOICE_ID,
        model="eleven_multilingual_v2"
    )
    
    # Save as temporary MP3
    mp3_path = output_path.replace(".ogg", ".mp3")
    save(audio, mp3_path)
    
    # 2. Convert MP3 to OGG (Opus) so Telegram shows it as a native voice note
    sound = AudioSegment.from_mp3(mp3_path)
    sound.export(output_path, format="ogg", codec="libopus")
    
    # Clean up MP3
    os.remove(mp3_path)

# --- 4. TELEGRAM HANDLERS ---
async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles incoming voice messages from Telegram."""
    await update.message.reply_text("🎧 Mendengarkan...")
    
    # 1. Download voice file
    voice_file = await update.message.voice.get_file()
    file_path = f"voice_{update.message.message_id}.ogg"
    await voice_file.download_to_drive(file_path)
    
    # 2. Transcribe (Speech to Text)
    user_text = await transcribe_voice(file_path)
    await update.message.reply_text(f"📝 Anda berkata: \"{user_text}\"\n\n🧠 Berpikir...")
    
    # 3. Get AI Response
    ai_response = await get_agent_response(user_text)
    
    # 4. Generate HD Voice (Text to Speech)
    await update.message.reply_text("🗣 Memproses suara HD...")
    voice_output_path = f"reply_{update.message.message_id}.ogg"
    await generate_voice(ai_response, voice_output_path)
    
    # 5. Send Voice Note back to Telegram
    with open(voice_output_path, 'rb') as voice:
        await update.message.reply_voice(voice=voice)
        
    # Clean up files
    os.remove(file_path)
    os.remove(voice_output_path)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles normal text messages (optional, replies with text)."""
    user_text = update.message.text
    ai_response = await get_agent_response(user_text)
    await update.message.reply_text(ai_response)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command."""
    await update.message.reply_text(
        "🤖 Bot suara siap!\n\n"
        "Kirim pesan suara atau teks untuk berinteraksi.\n\n"
        "• Kirim voice note → akan ditranskripsi dan direspon dengan voice\n"
        "• Kirim teks → akan direspon dengan teks"
    )

def main():
    """Start the bot."""
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # Command handlers
    app.add_handler(CommandHandler("start", start))
    
    # Handle voice notes
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    # Handle text messages
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("🤖 Bot is running. Press Ctrl+C to stop.")
    app.run_polling()

if __name__ == '__main__':
    main()
