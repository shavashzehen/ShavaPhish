import { useCallback, useEffect, useRef, useState } from 'react';
import { StateOrb } from './components/StateOrb';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { AudioStreamer } from './lib/audio/AudioStreamer';
import { LiveSession } from './lib/live/LiveSession';
import type { AssistantState } from './types/live';

function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [error, setError] = useState<string>('');

  const audioRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);

  const stopSession = useCallback(() => {
    sessionRef.current?.close();
    audioRef.current?.stopInput();
    setState('disconnected');
  }, []);

  const startSession = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      setError('Missing VITE_GEMINI_API_KEY in environment.');
      return;
    }

    setError('');

    const audio = new AudioStreamer();
    audioRef.current = audio;
    await audio.resumeContexts();

    const live = new LiveSession(apiKey, {
      onStateChange: setState,
      onAudioChunk: (chunk) => audio.playOutput(chunk),
      onInterruption: () => audio.interruptOutput(),
      onError: (message) => setError(message),
    });

    sessionRef.current = live;

    await live.connect();
    await audio.startInput((chunk) => {
      live.sendAudio(chunk);
    });
  }, []);

  const toggleSession = useCallback(async () => {
    if (state === 'disconnected') {
      await startSession();
      return;
    }

    stopSession();
  }, [startSession, state, stopSession]);

  useEffect(() => {
    return () => {
      stopSession();
      audioRef.current?.close();
    };
  }, [stopSession]);

  return (
    <main className="screen">
      <section className="glass-panel">
        <p className="eyebrow">Zoya Live Mode</p>
        <h1 className="title">Voice to Voice</h1>
        <p className="subtitle">No typing. Just talk.</p>

        <StateOrb state={state} />
        <VoiceVisualizer state={state} />

        <button
          type="button"
          className={`mic-button ${state === 'disconnected' ? 'off' : 'on'}`}
          onClick={() => {
            void toggleSession();
          }}
        >
          {state === 'disconnected' ? 'Start Zoya' : 'End Session'}
        </button>

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

export default App;
