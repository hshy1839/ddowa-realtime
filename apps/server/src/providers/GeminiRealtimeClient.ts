import { EventEmitter } from 'events';
import WebSocket from 'ws';

export type GeminiRealtimeEvent =
  | { type: 'open' }
  | { type: 'setup.complete' }
  | { type: 'turn.complete' }
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
  private setupComplete = false;
  private pendingMessages: any[] = [];
  private systemInstruction: string;
  private voiceName: string;

  constructor(opts: { apiKey: string; model?: string; systemInstruction?: string; voiceName?: string }) {
    super();
    this.apiKey = opts.apiKey;
    // Commonly used live models. Allow override by env.
    // Use an audio-capable model name that exists in ListModels for most accounts.
    this.model = opts.model || process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';
    this.systemInstruction =
      opts.systemInstruction ||
      '당신은 한국어 고객 상담사입니다. 짧고 자연스럽게 대답하고, 모르면 되묻고, 과장 없이 정확하게 답변하세요. 불필요한 메타 설명 없이 바로 답변만 하세요.';
    this.voiceName = opts.voiceName || 'Aoede';
  }

  async connect() {
    if (this.connected) return;

    const apiVersion = (process.env.GEMINI_LIVE_API_VERSION || 'v1beta').trim();
    const url =
      `wss://generativelanguage.googleapis.com/ws/` +
      `google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.ws = new WebSocket(url);

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WS not created'));

      this.ws.on('open', () => {
        this.connected = true;
        this.setupComplete = false;
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
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceName,
              },
            },
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
            endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
            silenceDurationMs: 600,
            prefixPaddingMs: 120,
          },
          turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
        },
        systemInstruction: {
          parts: [
            {
              text: this.systemInstruction,
            },
          ],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
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
    this.setupComplete = false;
    this.pendingMessages = [];
  }

  sendAudioChunk(pcmBase64: string, sampleRate: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // v1alpha accepts camelCase envelopes.
    const payload = {
      realtimeInput: {
        audio: {
          mimeType: `audio/pcm;rate=${sampleRate}`,
          data: pcmBase64,
        },
      },
    };

    if (!this.setupComplete) {
      this.pendingMessages.push(payload);
      return;
    }

    this.send(payload);
  }

  sendTextTurn(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    if (!this.setupComplete) {
      this.pendingMessages.push(payload);
      return;
    }

    this.send(payload);
  }

  private send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  private extractSampleRate(mimeType?: string): number | undefined {
    if (!mimeType) return undefined;
    const match = mimeType.match(/(?:rate|sample_rate)=(\d+)/i);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private handleMessage(msg: any) {
    if (msg?.setupComplete) {
      this.setupComplete = true;
      this.emit('event', { type: 'setup.complete' } satisfies GeminiRealtimeEvent);

      if (this.pendingMessages.length) {
        for (const payload of this.pendingMessages) {
          this.send(payload);
        }
        this.pendingMessages = [];
      }
      return;
    }

    if (msg?.server_content?.turn_complete || msg?.serverContent?.turnComplete) {
      this.emit('event', { type: 'turn.complete' } satisfies GeminiRealtimeEvent);
    }

    // Tolerant extraction of events
    // 1) Audio chunks
    const snakeAudioPart = msg?.server_content?.model_turn?.parts?.find((p: any) => p?.inline_data?.mime_type?.startsWith('audio/'));
    const camelAudioPart = msg?.serverContent?.modelTurn?.parts?.find((p: any) => p?.inlineData?.mimeType?.startsWith('audio/'));

    const audioData = snakeAudioPart?.inline_data?.data || camelAudioPart?.inlineData?.data;
    const audioMimeType = snakeAudioPart?.inline_data?.mime_type || camelAudioPart?.inlineData?.mimeType;
    const sampleRate = this.extractSampleRate(audioMimeType);

    if (audioData) {
      this.emit('event', { type: 'tts.audio', pcm16ChunkBase64: audioData, sampleRate });
    }

    // 2) Text deltas / model text (ignore "thought" parts)
    const textPart =
      msg?.server_content?.model_turn?.parts?.find((p: any) => typeof p?.text === 'string' && !p?.thought)?.text ||
      msg?.serverContent?.modelTurn?.parts?.find((p: any) => typeof p?.text === 'string' && !p?.thought)?.text ||
      msg?.server_content?.turn_complete?.text;

    // 3) Input transcription deltas (STT)
    const stt = msg?.server_content?.input_transcription?.text || msg?.serverContent?.inputTranscription?.text;
    if (typeof stt === 'string' && stt.length) {
      this.emit('event', { type: 'stt.delta', textDelta: stt });
    }

    // 4) Output audio transcription deltas (assistant caption source)
    const outTx =
      msg?.server_content?.output_transcription?.text ||
      msg?.serverContent?.outputTranscription?.text;

    if (typeof outTx === 'string' && outTx.length) {
      this.emit('event', { type: 'agent.delta', textDelta: outTx });
    } else if (typeof textPart === 'string' && textPart.length) {
      this.emit('event', { type: 'agent.delta', textDelta: textPart });
    }

    // 5) Unknown payload debug
    if (!audioData && !textPart && !stt && !outTx) {
      console.log('🔍 [GeminiRT] Unknown message type:', JSON.stringify(msg).substring(0, 200));
      this.emit('event', { type: 'debug', message: 'Gemini message', data: msg });
    }
  }
}
