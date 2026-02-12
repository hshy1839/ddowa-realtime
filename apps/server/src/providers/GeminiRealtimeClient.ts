import { EventEmitter } from 'events';
import WebSocket from 'ws';

export type GeminiRealtimeEvent =
  | { type: 'open' }
  | { type: 'close'; code: number; reason: string }
  | { type: 'error'; message: string }
  | { type: 'debug'; message: string; data?: any }
  | { type: 'stt.delta'; textDelta: string }
  | { type: 'agent.delta'; textDelta: string }
  | { type: 'tts.audio'; pcm16ChunkBase64: string; sampleRate?: number };

/**
 * Gemini Multimodal Live (Realtime) WebSocket client.
 *
 * NOTE: Google may evolve the exact JSON envelope. This implementation is intentionally
 * tolerant: it logs unknown payloads and extracts commonly-seen fields.
 */
export class GeminiRealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private model: string;
  private connected = false;

  constructor(opts: { apiKey: string; model?: string }) {
    super();
    this.apiKey = opts.apiKey;
    // Commonly used live models. Allow override by env.
    // Use an audio-capable model name that exists in ListModels for most accounts.
    this.model = opts.model || process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';
  }

  async connect() {
    if (this.connected) return;

    const apiVersion = (process.env.GEMINI_LIVE_API_VERSION || 'v1alpha').trim();
    const url =
      `wss://generativelanguage.googleapis.com/ws/` +
      `google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.ws = new WebSocket(url);

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WS not created'));

      this.ws.on('open', () => {
        this.connected = true;
        this.emit('event', { type: 'open' } satisfies GeminiRealtimeEvent);
        resolve();
      });

      this.ws.on('error', (err) => {
        this.emit('event', { type: 'error', message: (err as any)?.message || String(err) });
        reject(err);
      });
    });

    this.ws.on('message', (data) => {
      const text = data.toString();
      try {
        const msg = JSON.parse(text);
        this.handleMessage(msg);
      } catch {
        this.emit('event', { type: 'debug', message: 'Non-JSON message from Gemini', data: text });
      }
    });

    this.ws.on('close', (code, buf) => {
      this.connected = false;
      this.emit('event', { type: 'close', code, reason: buf.toString() });
    });

    // Send setup message.
    // For v1alpha bidiGenerateContent, camelCase `generationConfig` is accepted.
    // On free-tier keys, requesting AUDIO modality is typically the key requirement.
    this.send({
      setup: {
        model: this.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
      },
    });
  }

  disconnect() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.connected = false;
  }

  sendAudioChunk(pcmBase64: string, sampleRate: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // v1alpha accepts camelCase envelopes.
    this.send({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: `audio/pcm;rate=${sampleRate}`,
            data: pcmBase64,
          },
        ],
      },
    });
  }

  private send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  private handleMessage(msg: any) {
    // Tolerant extraction of events
    // 1) Audio chunks
    const audioData =
      msg?.server_content?.model_turn?.parts?.find((p: any) => p?.inline_data?.mime_type?.startsWith('audio/'))
        ?.inline_data?.data ||
      msg?.serverContent?.modelTurn?.parts?.find((p: any) => p?.inlineData?.mimeType?.startsWith('audio/'))
        ?.inlineData?.data;

    if (audioData) {
      console.log('🔊 [GeminiRT] TTS audio chunk received');
      this.emit('event', { type: 'tts.audio', pcm16ChunkBase64: audioData });
    }

    // 2) Text deltas / model text
    const textPart =
      msg?.server_content?.model_turn?.parts?.find((p: any) => typeof p?.text === 'string')?.text ||
      msg?.serverContent?.modelTurn?.parts?.find((p: any) => typeof p?.text === 'string')?.text ||
      msg?.server_content?.turn_complete?.text;

    if (typeof textPart === 'string' && textPart.length) {
      console.log('💬 [GeminiRT] Agent response:', textPart.substring(0, 100));
      this.emit('event', { type: 'agent.delta', textDelta: textPart });
    }

    // 3) Input transcription deltas (STT)
    const stt = msg?.server_content?.input_transcription?.text || msg?.serverContent?.inputTranscription?.text;
    if (typeof stt === 'string' && stt.length) {
      console.log('📝 [GeminiRT] STT text:', stt.substring(0, 100));
      this.emit('event', { type: 'stt.delta', textDelta: stt });
    }

    // 4) Unknown payload debug
    if (!audioData && !textPart && !stt) {
      console.log('🔍 [GeminiRT] Unknown message type:', JSON.stringify(msg).substring(0, 200));
      this.emit('event', { type: 'debug', message: 'Gemini message', data: msg });
    }
  }
}
