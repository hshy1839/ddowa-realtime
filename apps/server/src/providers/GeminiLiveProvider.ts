import { EventEmitter } from 'events';
import { IAgentProvider, AgentEvent, ToolResult } from './types';
import { GeminiRealtimeClient, GeminiRealtimeEvent } from './GeminiRealtimeClient';

type LiveAgentConfig = {
  tone?: string;
  rules?: string[];
  forbidden?: string[];
  fallback?: string;
  toolsEnabled?: string[];
  agentGender?: 'female' | 'male' | 'neutral';
  agentPersonality?: string;
  companyName?: string;
  companyDescription?: string;
  companyPhone?: string;
  companyWebsite?: string;
  speechRate?: number;
};

export class GeminiLiveProvider extends EventEmitter implements IAgentProvider {
  private conversationId = '';
  private apiKey = '';
  private sessionId = '';
  private messages: { role: 'user' | 'assistant'; content: string }[] = [];
  private rt: GeminiRealtimeClient | null = null;
  private initialized = false;
  private connected = false;

  private lastSttFull = '';
  private lastAgentFull = '';
  private liveConfig: LiveAgentConfig = {};

  async initialize(config: any): Promise<void> {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    if (config) this.setAgentConfig(config);

    this.rt = this.createRealtimeClient();
    this.initialized = true;
    console.log('✓ Gemini Live Provider initialized');
  }

  setAgentConfig(config: LiveAgentConfig): void {
    this.liveConfig = { ...this.liveConfig, ...(config || {}) };
  }

  private createRealtimeClient(): GeminiRealtimeClient {
    if (this.rt) {
      try {
        this.rt.removeAllListeners();
      } catch {}
      this.rt.disconnect();
    }

    const rt = new GeminiRealtimeClient({
      apiKey: this.apiKey,
      systemInstruction: this.buildSystemInstruction(),
      voiceName: this.pickVoiceName(),
    });

    this.rt = rt;
    this.connected = false;
    this.bindRealtimeEvents(rt);
    return rt;
  }

  private bindRealtimeEvents(rt: GeminiRealtimeClient): void {
    rt.on('event', (event: GeminiRealtimeEvent) => {
      switch (event.type) {
        case 'open':
          this.connected = true;
          console.log('✓ [GeminiLive] connected');
          break;

        case 'setup.complete':
          console.log('✓ [GeminiLive] setup complete');
          break;

        case 'stt.delta': {
          const delta = this.extractDelta(event.textDelta, this.lastSttFull);
          if (!delta) return;
          this.lastSttFull = this.normalizeText(event.textDelta);
          this.emit('stt.delta', { type: 'stt.delta', textDelta: delta } as AgentEvent);
          break;
        }

        case 'agent.delta': {
          const delta = this.extractDelta(event.textDelta, this.lastAgentFull);
          if (!delta) return;
          this.lastAgentFull = this.normalizeText(event.textDelta);
          this.emit('agent.delta', { type: 'agent.delta', textDelta: delta } as AgentEvent);
          break;
        }

        case 'tts.audio':
          this.emit('tts.audio', {
            type: 'tts.audio',
            pcm16ChunkBase64: event.pcm16ChunkBase64,
            sampleRate: event.sampleRate,
          } as AgentEvent);
          break;

        case 'turn.complete':
          if (this.lastSttFull.trim()) {
            this.messages.push({ role: 'user', content: this.lastSttFull.trim() });
          }
          if (this.lastAgentFull.trim()) {
            this.messages.push({ role: 'assistant', content: this.lastAgentFull.trim() });
          }
          this.lastSttFull = '';
          this.lastAgentFull = '';
          this.emit('agent.complete', { type: 'agent.complete' } as AgentEvent);
          break;

        case 'error':
          this.emit('error', {
            type: 'error',
            code: 'GEMINI_LIVE_ERROR',
            message: event.message,
          } as AgentEvent);
          break;

        case 'close':
          this.connected = false;
          console.log(`[GeminiLive] closed code=${event.code} reason=${event.reason}`);
          break;

        case 'debug':
          break;
      }
    });
  }

  async startConversation(conversationId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('GeminiLiveProvider not initialized');
    }

    this.conversationId = conversationId;
    this.sessionId = `session_${Date.now()}`;
    this.messages = [];
    this.lastSttFull = '';
    this.lastAgentFull = '';

    // 설정 변경이 즉시 반영되도록 call 시작 시마다 client 재생성
    const rt = this.createRealtimeClient();
    await rt.connect();

    console.log(`✓ Started Gemini Live conversation: ${conversationId}`);
  }

  async sendAudioChunk(pcm16ChunkBase64: string, sampleRate: number, _seq: number): Promise<void> {
    if (!this.rt || !this.connected) return;
    this.rt.sendAudioChunk(pcm16ChunkBase64, sampleRate);
  }

  async endConversation(): Promise<{ summary: string; intent: string }> {
    const summary = this.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    return {
      summary,
      intent: 'customer_inquiry',
    };
  }

  async sendToolResult(_result: ToolResult): Promise<void> {
    // Reserved for future function/tool round-trips in Live API.
  }

  on(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this {
    return super.on(event, callback) as this;
  }

  off(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this {
    return super.off(event, callback) as this;
  }

  async disconnect(): Promise<void> {
    this.removeAllListeners();
    if (this.rt) {
      this.rt.disconnect();
      try {
        this.rt.removeAllListeners();
      } catch {}
    }
    this.connected = false;
    this.messages = [];
    this.lastSttFull = '';
    this.lastAgentFull = '';
  }

  private normalizeText(text?: string): string {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  private extractDelta(nextRaw: string, prevRaw: string): string {
    const next = this.normalizeText(nextRaw);
    const prev = this.normalizeText(prevRaw);

    if (!next) return '';
    if (!prev) return next;
    if (next === prev) return '';

    if (next.startsWith(prev)) {
      return next.slice(prev.length).trimStart();
    }

    return next;
  }

  private pickVoiceName(): string {
    switch (this.liveConfig.agentGender) {
      case 'female':
        return 'Kore';
      case 'male':
        return 'Puck';
      default:
        return 'Aoede';
    }
  }

  private buildSystemInstruction(): string {
    const tone = this.liveConfig.tone || 'professional';
    const personality = this.liveConfig.agentPersonality || 'professional';

    const companyLines = [
      this.liveConfig.companyName ? `회사명: ${this.liveConfig.companyName}` : '',
      this.liveConfig.companyDescription ? `회사 소개: ${this.liveConfig.companyDescription}` : '',
      this.liveConfig.companyPhone ? `대표전화: ${this.liveConfig.companyPhone}` : '',
      this.liveConfig.companyWebsite ? `웹사이트: ${this.liveConfig.companyWebsite}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const rules = (this.liveConfig.rules || []).filter(Boolean);
    const forbidden = (this.liveConfig.forbidden || []).filter(Boolean);

    const speed = Math.min(1.2, Math.max(0.8, Number(this.liveConfig.speechRate ?? 1.0) || 1.0));
    const speedGuide = speed < 0.95 ? '천천히 또박또박' : speed > 1.05 ? '조금 빠르고 경쾌하게' : '기본 속도로 자연스럽게';

    return [
      '당신은 한국어 전화 상담사입니다.',
      `응답 톤: ${tone}`,
      `상담사 성격: ${personality}`,
      `말하기 스타일: ${speedGuide}`,
      companyLines ? `\n[회사 정보]\n${companyLines}` : '',
      rules.length ? `\n[반드시 지킬 규칙]\n- ${rules.join('\n- ')}` : '',
      forbidden.length ? `\n[금지 주제]\n- ${forbidden.join('\n- ')}` : '',
      this.liveConfig.fallback
        ? `\n질문에 답할 수 없으면 다음 문장 스타일로 안내: "${this.liveConfig.fallback}"`
        : '',
      '\n불필요한 메타설명 없이 자연스럽고 짧게 답하세요.',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
