# Telegram Voice Agent Setup

## Dependencies
All dependencies already installed:
- python-telegram-bot 22.8
- openai 3.13.0
- elevenlabs 2.70.0
- pydub 0.25.1
- ffmpeg 6.1.1

## Configuration
Add your API keys to `.env`:

```env
TELEGRAM_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel (Indonesian capable)
```

## Running the Bot
```bash
cd /home/khuchinque/0-TRADER-COMPANEY
python3 telegram_voice_agent.py
```

## Features
- Listens to voice notes in Indonesian
- Transcribes using OpenAI Whisper
- Generates response using GPT-4o-mini
- Replies with HD voice using ElevenLabs
- Converts to OGG/Opus for native Telegram voice notes

## Voice Options
Popular Indonesian voices from ElevenLabs:
- `21m00Tcm4TlvDq8ikWAM` - Rachel (default)
- `EXAVITQu4vr4xnSDxMaL` - Bella
- `ErXwobaYiN019PkySvjV` - Arnold

Get more voices at: https://elevenlabs.io/voice-library
