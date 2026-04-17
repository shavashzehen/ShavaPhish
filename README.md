# Zoya AI Assistant (Voice-to-Voice)

A mobile-first React + TypeScript + Tailwind + Vite web app for a real-time Gemini Live voice assistant.

## Features

- Audio-to-audio streaming using `@google/genai` and `gemini-3.1-flash-live-preview`
- No text chat UI (voice interaction only)
- Continuous live session with explicit states:
  - `disconnected`
  - `connecting`
  - `listening`
  - `speaking`
- Function calling support (`openWebsite`) with instant `sendToolResponse`
- Futuristic dark full-screen UI with animated state orb, pulse effects, and live waveform bars
- Persona rule: if user asks who created the assistant, it responds with: `Mujhe Shawez Hacker ne banaya hai.`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
VITE_GEMINI_API_KEY=your_key_here
```

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Architecture

- `src/lib/audio/AudioStreamer.ts`
  - Captures mic stream with Web Audio API
  - Sends PCM16 chunks to Live session
  - Plays output PCM16 @ 24kHz
  - Supports interruption by resetting playback queue
- `src/lib/live/LiveSession.ts`
  - Handles Gemini Live connect / callbacks
  - Applies Zoya persona system instruction
  - Receives audio chunks + interruption events
  - Handles tool calls and sends tool responses
- `src/App.tsx`
  - Session orchestration and UI state management
  - Composes visual states + animated visualizer

## Notes

- Browser-side API key usage is appropriate for quick prototypes only.
- For production, use ephemeral token flow and a secured backend relay.
