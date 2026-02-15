export interface ToolCall {
  toolCallId: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: string | Record<string, any>;
}

export interface AgentEvent {
  type: 'stt.delta' | 'agent.delta' | 'agent.complete' | 'tts.audio' | 'tool.call' | 'call.ended' | 'error';
  textDelta?: string;
  pcm16ChunkBase64?: string;
  sampleRate?: number;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  summary?: string;
  intent?: string;
  contactId?: string;
  code?: string;
  message?: string;
}

export interface IAgentProvider {
  // Initialize provider with config
  initialize(config: any): Promise<void>;

  // Start a new conversation
  startConversation(conversationId: string): Promise<void>;

  // Send audio chunk to provider
  sendAudioChunk(
    pcm16ChunkBase64: string,
    sampleRate: number,
    seq: number
  ): Promise<void>;

  // End conversation and get summary/intent
  endConversation(): Promise<{ summary: string; intent: string }>;

  // Send tool result back to provider
  sendToolResult(result: ToolResult): Promise<void>;

  // Event listener for provider events
  on(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this;
  off(event: AgentEvent['type'], callback: (event: AgentEvent) => void): this;

  // Cleanup
  disconnect(): Promise<void>;
}
