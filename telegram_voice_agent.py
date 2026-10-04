"""
Telegram Voice Agent — listens to voice notes, transcribes, 
generates AI response, replies with HD Indonesian voice note.
"""
import os
import logging
import requests
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from elevenlabs import ElevenLabs
from pydub import AudioSegment
import io

# Load environment variables
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Optional - for Whisper transcription
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")  # Free voice that works

# Initialize ElevenLabs client
elevenlabs_client = None
if ELEVENLABS_API_KEY:
    elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# --- 1. SPEECH TO TEXT (Listening) ---
async def transcribe_voice(file_path: str) -> str:
    """Transcribe voice to text using Whisper or return placeholder."""
    if not OPENAI_API_KEY:
        return "test"
    try:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        with open(file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="id"
            )
        return transcription.text
    except Exception as e:
        print(f"Transcription error: {e}")
        return "test"

# --- 2. LLM THINKING (Menggunakan Model Default Agen VPS Anda) ---
async def get_agent_response(user_text: str) -> str:
    """
    Mengirim teks ke agen VPS lokal Anda.
    Menggunakan backend API di port 11110
    """
    url = "http://localhost:11110/api/chat"

    try:
        response = requests.post(url, json={"message": user_text}, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Ambil balasan dari JSON respons
        return data.get("reply", data.get("response", data.get("text", "Maaf, terjadi kesalahan.")))

    except requests.exceptions.HTTPError as e:
        print(f"HTTP error contacting local agent: {e}")
        return "Maaf, endpoint /api/chat belum tersedia. Gunakan perintah /help untuk daftar perintah."
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
        return "Maaf, server backend tidak dapat dihubungi."
    except Exception as e:
        print(f"Error contacting local agent: {e}")
        return "Maaf, saya sedang mengalami gangguan koneksi ke server utama."

# --- 3. TEXT TO SPEECH (Speaking in HD Indonesian) ---
async def generate_voice(text: str, output_path: str):
    """Generates HD Indonesian audio using ElevenLabs and converts to .ogg for Telegram."""
    if not elevenlabs_client:
        print("ElevenLabs client not initialized")
        return False
    
    try:
        # Use correct v2 API: text_to_speech.convert()
        audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            model_id="eleven_multilingual_v2",
            text=text,
            output_format="mp3_44100_128"
        )
        
        # Save as temporary MP3
        mp3_path = output_path.replace(".ogg", ".mp3")
        with open(mp3_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)
        
        if not os.path.exists(mp3_path) or os.path.getsize(mp3_path) == 0:
            raise Exception("Generated audio is empty")
        
        # Convert MP3 to OGG (Opus) so Telegram shows it as a native voice note
        sound = AudioSegment.from_mp3(mp3_path)
        sound.export(output_path, format="ogg", codec="libopus")
        
        # Clean up MP3
        os.remove(mp3_path)
        return True
    except Exception as e:
        print(f"Voice generation error: {e}")
        return False

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
    
    success = await generate_voice(ai_response, voice_output_path)
    
    if success and os.path.exists(voice_output_path):
        # 5. Send Voice Note back to Telegram
        with open(voice_output_path, 'rb') as voice:
            await update.message.reply_voice(voice=voice)
    else:
        await update.message.reply_text("❌ Gagal membuat suara. Coba lagi.")
    
    # Clean up files
    if os.path.exists(file_path):
        os.remove(file_path)
    if os.path.exists(voice_output_path):
        os.remove(voice_output_path)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles normal text messages — replies with VOICE note."""
    user_text = update.message.text
    ai_response = await get_agent_response(user_text)
    
    # Always reply with voice note for text too
    voice_output_path = f"reply_{update.message.message_id}.ogg"
    success = await generate_voice(ai_response, voice_output_path)
    
    if success and os.path.exists(voice_output_path):
        with open(voice_output_path, 'rb') as voice:
            await update.message.reply_voice(voice=voice)
        os.remove(voice_output_path)
    else:
        await update.message.reply_text(ai_response)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command."""
    await update.message.reply_text(
        "🤖 Bot suara siap!\n\n"
        "Kirim pesan suara atau teks untuk berinteraksi.\n\n"
        "• Kirim voice note → akan ditranskripsi dan direspon dengan voice\n"
        "• Kirim teks → akan direspon dengan voice juga"
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
