import { EventEmitter } from 'events';
import axios from 'axios';
import { IAgentProvider, AgentEvent, ToolResult } from './types';
import { GeminiRealtimeClient } from './GeminiRealtimeClient';

/**
 * Google Gemini Multimodal Live API Provider
 * Real-time voice interaction with Gemini
 */
export class GeminiLiveProvider extends EventEmitter implements IAgentProvider {
  private conversationId: string = '';
  private config: any = {};
  private apiKey: string = '';
  private sessionId: string = '';
  private messages: { role: 'user' | 'assistant'; content: string }[] = [];
  private tools: any[] = [];
  private rt: GeminiRealtimeClient | null = null;
  private realtimeEnabled: boolean = true;

  async initialize(config: any): Promise<void> {
    this.config = config;
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.realtimeEnabled = (process.env.GEMINI_REALTIME_ENABLED || 'true').toLowerCase() !== 'false';

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    // Setup tools from config
    this.setupTools();

    if (this.realtimeEnabled) {
      this.rt = new GeminiRealtimeClient({ apiKey: this.apiKey });
      this.rt.on('event', (ev) => {
        if (ev.type === 'stt.delta') this.emit('stt.delta', { textDelta: ev.textDelta });
        if (ev.type === 'agent.delta') this.emit('agent.delta', { textDelta: ev.textDelta });
        if (ev.type === 'tts.audio') this.emit('tts.audio', { pcm16ChunkBase64: ev.pcm16ChunkBase64 });
        if (ev.type === 'error') {
          this.emit('error', { code: 'GEMINI_REALTIME_ERROR', message: ev.message });
        }
        if (ev.type === 'debug') {
          // keep console noise low by truncating
          const msg = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data || {}).slice(0, 400);
          console.log('[GeminiRT]', ev.message, msg);
        }
      });

      // Connect once; reconnection can be added later
      await this.rt.connect();
    }

    console.log('Gemini Live Provider initialized');
  }

  private setupTools(): void {
    // Define available tools
    this.tools = [
      {
        name: 'getBusinessInfo',
        description: 'Get business information and contact details',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'listAvailability',
        description: 'List available time slots for booking',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
          required: ['date'],
        },
      },
      {
        name: 'createBooking',
        description: 'Create a booking for the customer',
        parameters: {
          type: 'object',
          properties: {
            startTime: { type: 'string', description: 'Start time in ISO format' },
            endTime: { type: 'string', description: 'End time in ISO format' },
            serviceName: { type: 'string', description: 'Name of service' },
          },
          required: ['startTime', 'endTime', 'serviceName'],
        },
      },
      {
        name: 'getPaymentLink',
        description: 'Get payment link for the service',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Amount in USD' },
          },
          required: ['amount'],
        },
      },
    ];
  }

  async startConversation(conversationId: string): Promise<void> {
    this.conversationId = conversationId;
    this.messages = [];

    // Generate a unique session ID for this conversation
    this.sessionId = `session_${Date.now()}`;

    // Keep text history for summarization / fallback.
    const systemPrompt = this.buildSystemPrompt();
    this.messages.push({ role: 'user', content: systemPrompt });

    console.log(`Started conversation: ${conversationId}`);
  }

  private buildSystemPrompt(): string {
    return `You are a professional AI customer service agent. 
    
Your capabilities:
- Answer customer questions about business information
- Check availability and help with bookings
- Provide payment options
- Be polite, professional, and helpful

Important: Only confirm bookings or provide payment details AFTER successfully calling the appropriate tools.
Do not make promises about availability or bookings until the tool has been executed successfully.

Always maintain a friendly and professional tone.`;
  }

  async sendAudioChunk(
    pcm16ChunkBase64: string,
    sampleRate: number,
    seq: number
  ): Promise<void> {
    try {
      if (this.realtimeEnabled && this.rt) {
        // True realtime: forward audio to Gemini Live.
        console.log('🎙️ [SENDAUDIO] Forwarding to Gemini Live (realtime)');
        this.rt.sendAudioChunk(pcm16ChunkBase64, sampleRate || 16000);
        return;
      }

      // Fallback (non-realtime) path
      console.log('🎙️ [SENDAUDIO] Using fallback (non-realtime) STT path');
      const audioData = Buffer.from(pcm16ChunkBase64, 'base64');
      const userText = this.simulateSTT(audioData);
      this.emit('stt.delta', { textDelta: userText });
      await this.getGeminiResponse(userText);
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      this.emit('error', {
        code: 'AUDIO_PROCESSING_ERROR',
        message: 'Failed to process audio',
      });
    }
  }

  private simulateSTT(audioData: Buffer): string {
    // TODO: Implement real STT using Google Cloud Speech-to-Text API
    // For now, return a placeholder
    return 'I would like to book an appointment';
  }

  private async getGeminiResponse(userMessage: string): Promise<void> {
    try {
      this.messages.push({
        role: 'user',
        content: userMessage,
      });

      // Try to call real Gemini API first, fallback to mock if quota exceeded
      try {
        await this.callRealGeminiAPI(userMessage);
      } catch (error: any) {
        // If quota exceeded or API error, use mock response
        if (error.response?.status === 429) {
          console.warn('⚠️ Gemini API quota exceeded, using mock response');
          const mockResponse = this.generateMockResponse(userMessage);
          this.emit('agent.delta', { textDelta: mockResponse });
          this.messages.push({
            role: 'assistant',
            content: mockResponse,
          });
          await this.synthesizeSpeech(mockResponse);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error getting response:', error);
      this.emit('error', {
        code: 'RESPONSE_ERROR',
        message: 'Failed to get response',
      });
    }
  }

  private async callRealGeminiAPI(userMessage: string): Promise<void> {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          contents: this.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [
              {
                text: m.content,
              },
            ],
          })),
          tools: [
            {
              function_declarations: this.tools,
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: this.buildSystemPrompt(),
              },
            ],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.candidates?.[0]?.content;
      if (!content) {
        console.warn('No response from Gemini:', response.data);
        this.emit('agent.delta', { textDelta: 'I understand. How can I help you further?' });
        return;
      }

      // Process response parts
      let responseText = '';
      for (const part of content.parts || []) {
        if (part.text) {
          responseText = part.text;
          // Emit agent text delta
          this.emit('agent.delta', { textDelta: responseText });
          this.messages.push({
            role: 'assistant',
            content: responseText,
          });
        } else if (part.functionCall) {
          // Handle tool call
          await this.handleToolCall(part.functionCall);
        }
      }

      // Simulate TTS (text-to-speech)
      if (responseText) {
        await this.synthesizeSpeech(responseText);
      }
    } catch (error) {
      console.error('Real Gemini API Error:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  private generateMockResponse(userMessage: string): string {
    // Smart mock responses based on user input
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
      return 'I can help you book an appointment. Could you please let me know your preferred date and time?';
    } else if (lower.includes('available') || lower.includes('time') || lower.includes('when')) {
      return 'We have several time slots available. What day would work best for you?';
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('pay')) {
      return 'Our services are competitively priced. Let me show you our pricing options.';
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('greet')) {
      return 'Hello! Welcome to our customer service. How can I assist you today?';
    } else if (lower.includes('thank') || lower.includes('thanks')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    } else {
      return 'Thank you for your message. I understand you\'re inquiring about our services. How can I best assist you?';
    }
  }

  private async handleToolCall(functionCall: any): Promise<void> {
    const { name, args } = functionCall;

    this.emit('tool.call', {
      toolCallId: `tool_${Date.now()}`,
      toolName: name,
      toolArgs: args,
    });

    // Tool will be executed by the WebSocket handler
    // We'll receive the result via sendToolResult()
  }

  private async synthesizeSpeech(text: string): Promise<void> {
    try {
      // TODO: Use Google Cloud Text-to-Speech API
      // For now, emit a placeholder audio
      const pcm16Base64 = Buffer.from(new ArrayBuffer(1024)).toString('base64');
      this.emit('tts.audio', {
        type: 'tts.audio',
        pcm16ChunkBase64: pcm16Base64,
      });
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    }
  }

  async endConversation(): Promise<{ summary: string; intent: string }> {
    try {
      // Generate summary using Gemini
      const conversationText = this.messages.map((m) => `${m.role}: ${m.content}`).join('\n');

      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Please summarize this conversation and identify the customer's intent in 1-2 sentences each.\n\nConversation:\n${conversationText}`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse summary and intent from response
        const summary = responseText.split('Intent:')[0].replace('Summary:', '').trim() || 'Conversation completed';
        const intent = (responseText.split('Intent:')[1] || 'general_inquiry').trim().toLowerCase().replace(/[^a-z_]/g, '_');

        return { summary, intent };
      } catch (summaryError: any) {
        // Handle rate limiting (429) and other errors gracefully
        if (summaryError.response?.status === 429) {
          console.warn('⚠️ [RATE_LIMITED] Status 429 - skipping summary generation');
        } else {
          console.error('❌ [SUMMARY_ERROR]:', summaryError.message);
        }
        return {
          summary: 'Conversation completed',
          intent: 'general_inquiry',
        };
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
      return {
        summary: 'Conversation completed',
        intent: 'unknown',
      };
    }
  }

  async sendToolResult(result: ToolResult): Promise<void> {
    // In a real Gemini Live implementation, send tool result back
    // This allows the agent to make decisions based on tool outcomes
    const toolResultMessage = `Tool ${result.toolCallId} executed: ${JSON.stringify(result.result)}`;

    this.messages.push({
      role: 'assistant',
      content: toolResultMessage,
    });

    // Continue conversation with tool result
    await this.getGeminiResponse(toolResultMessage);
  }

  on(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this {
    return (super.on(event, callback) as any);
  }

  off(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this {
    return (super.off(event, callback) as any);
  }

  async disconnect(): Promise<void> {
    try {
      this.rt?.disconnect();
    } catch {
      // ignore
    }
    this.rt = null;
    this.removeAllListeners();
  }
}
