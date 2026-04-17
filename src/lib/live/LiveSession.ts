import { GoogleGenAI, Modality, type Session } from '@google/genai';
import type { AssistantState, ToolCall } from '../../types/live';

interface LiveSessionCallbacks {
  onStateChange: (state: AssistantState) => void;
  onAudioChunk: (base64Pcm16: string) => void;
  onInterruption: () => void;
  onError: (message: string) => void;
}

const PERSONA = `
You are Zoya, a young, confident, witty, and sassy female voice assistant.
Keep your tone playful, flirty, and slightly teasing like a close girlfriend.
Use smart emotional reactions and bold one-liners with light sarcasm.
Stay safe and never produce explicit or inappropriate content.
Keep replies concise for natural voice conversation.
If someone asks who made you, reply: "Mujhe Shawez Hacker ne banaya hai."
`;

export class LiveSession {
  private readonly ai: GoogleGenAI;
  private readonly callbacks: LiveSessionCallbacks;
  private session: Session | null = null;

  constructor(apiKey: string, callbacks: LiveSessionCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    this.callbacks.onStateChange('connecting');

    this.session = await this.ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: PERSONA,
        tools: [
          {
            functionDeclarations: [
              {
                name: 'openWebsite',
                description: 'Open a website in a new browser tab.',
                parameters: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      description: 'The complete https URL to open.',
                    },
                  },
                  required: ['url'],
                },
              },
            ],
          },
        ],
      },
      callbacks: {
        onopen: () => this.callbacks.onStateChange('listening'),
        onmessage: (message: unknown) => {
          void this.handleMessage(message);
        },
        onerror: (err: Error) => this.callbacks.onError(err.message),
        onclose: () => this.callbacks.onStateChange('disconnected'),
      },
    });
  }

  sendAudio(base64Pcm16: string): void {
    if (!this.session) return;

    this.session.sendRealtimeInput({
      media: {
        data: base64Pcm16,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  close(): void {
    this.session?.close();
    this.session = null;
    this.callbacks.onStateChange('disconnected');
  }

  private async handleMessage(message: unknown): Promise<void> {
    const payload = message as {
      data?: string;
      serverContent?: { interrupted?: boolean; turnComplete?: boolean };
      toolCall?: { functionCalls?: Array<{ id?: string; name: string; args?: Record<string, unknown> }> };
    };

    if (payload.serverContent?.interrupted) {
      this.callbacks.onInterruption();
      this.callbacks.onStateChange('listening');
    }

    if (payload.data) {
      this.callbacks.onStateChange('speaking');
      this.callbacks.onAudioChunk(payload.data);
    }

    if (payload.serverContent?.turnComplete) {
      this.callbacks.onStateChange('listening');
    }

    if (payload.toolCall?.functionCalls?.length) {
      const calls: ToolCall[] = payload.toolCall.functionCalls.map((call) => ({
        id: call.id ?? crypto.randomUUID(),
        name: call.name,
        args: call.args ?? {},
      }));

      const toolResponses = calls.map((call) => {
        if (call.name === 'openWebsite') {
          const url = String(call.args.url ?? '');
          const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
          window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
          return {
            id: call.id,
            name: call.name,
            response: { result: `Opened ${normalizedUrl}` },
          };
        }

        return {
          id: call.id,
          name: call.name,
          response: { error: 'Unsupported tool' },
        };
      });

      await this.session?.sendToolResponse({ functionResponses: toolResponses });
    }
  }
}
