import { WebSocket } from 'ws';
import { IAgentProvider } from '../providers/types';
import { GeminiLiveProvider } from '../providers/GeminiLiveProvider';
import { Conversation, Message, Contact } from '../models';
import { executeToolCall } from './tools';
import { IParsedToken } from '../lib/jwt';

export interface WSSession {
  ws: WebSocket;
  userId: string;
  workspaceId: string;
  conversationId: string;
  provider: IAgentProvider;
  startTime: number;
}

const sessions = new Map<string, WSSession>();

export async function handleWSConnection(
  ws: WebSocket,
  token: IParsedToken | null,
  workspaceSlug?: string
) {
  if (!token && !workspaceSlug) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create AI provider instance
  const provider = new GeminiLiveProvider();
  await provider.initialize({});

  const session: WSSession = {
    ws,
    userId: token?.userId || 'anonymous',
    workspaceId: token?.workspaceId || workspaceSlug || 'demo',
    conversationId: '',
    provider,
    startTime: Date.now(),
  };

  sessions.set(sessionId, session);

  console.log(`[WS] Client connected: ${sessionId}`);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleWSMessage(sessionId, message);
    } catch (error) {
      console.error('[WS] Error handling message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format',
        })
      );
    }
  });

  ws.on('close', async () => {
    console.log(`[WS] Client disconnected: ${sessionId}`);
    const session = sessions.get(sessionId);
    if (session) {
      await session.provider.disconnect();
      sessions.delete(sessionId);
    }
  });

  ws.on('error', (error) => {
    console.error('[WS] Error:', error);
  });
}

async function handleWSMessage(sessionId: string, message: any) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const { type } = message;

  try {
    switch (type) {
      case 'call.start': {
        // Start a new conversation
        const conversationId = `conv_${Date.now()}`;
        session.conversationId = conversationId;

        // Initialize provider for this conversation
        await session.provider.startConversation(conversationId);

        // Create conversation in MongoDB
        try {
          const conversation = await Conversation.create({
            _id: conversationId,
            workspaceId: session.workspaceId,
            channel: 'web',
            status: 'ongoing',
            startedAt: new Date(),
            durationSec: 0,
          });
          console.log(`📞 Conversation created: ${conversationId}`);
        } catch (error) {
          console.error('Failed to create conversation:', error);
        }

        // Send call.started event
        session.ws.send(
          JSON.stringify({
            type: 'call.started',
            conversationId,
          })
        );

        // Setup provider event listeners
        setupProviderListeners(session);

        break;
      }

      case 'audio.chunk': {
        const { pcm16ChunkBase64, sampleRate, seq } = message;

        if (!session.conversationId) {
          session.ws.send(
            JSON.stringify({
              type: 'error',
              code: 'NO_ACTIVE_CALL',
              message: 'No active call',
            })
          );
          break;
        }

        // Send audio to AI provider
        await session.provider.sendAudioChunk(pcm16ChunkBase64, sampleRate, seq);

        break;
      }

      case 'call.stop': {
        if (!session.conversationId) {
          session.ws.send(
            JSON.stringify({
              type: 'error',
              code: 'NO_ACTIVE_CALL',
              message: 'No active call',
            })
          );
          break;
        }

        // End conversation with provider
        const { summary, intent } = await session.provider.endConversation();
        const durationSec = Math.floor((Date.now() - session.startTime) / 1000);

        // Save conversation to MongoDB
        try {
          await Conversation.findByIdAndUpdate(
            session.conversationId,
            {
              status: 'completed',
              endedAt: new Date(),
              durationSec,
              summary,
              intent,
            }
          );
          console.log(`✓ Conversation saved: ${session.conversationId}`);
        } catch (error) {
          console.error('Failed to save conversation:', error);
        }

        // Send call.ended event
        session.ws.send(
          JSON.stringify({
            type: 'call.ended',
            conversationId: session.conversationId,
            summary,
            intent,
            durationSec,
          })
        );

        session.conversationId = '';
        break;
      }

      default: {
        console.log('[WS] Unknown message type:', type);
      }
    }
  } catch (error) {
    console.error('[WS] Error handling message:', error);
    session.ws.send(
      JSON.stringify({
        type: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      })
    );
  }
}

function setupProviderListeners(session: WSSession) {
  // Listen for STT updates
  session.provider.on('stt.delta', (event) => {
    session.ws.send(JSON.stringify({ type: 'stt.delta', textDelta: event.textDelta }));
  });

  // Listen for agent text
  session.provider.on('agent.delta', (event) => {
    session.ws.send(JSON.stringify({ type: 'agent.delta', textDelta: event.textDelta }));
  });

  // Listen for audio output
  session.provider.on('tts.audio', (event) => {
    session.ws.send(
      JSON.stringify({
        type: 'tts.audio',
        pcm16ChunkBase64: event.pcm16ChunkBase64,
      })
    );
  });

  // Listen for tool calls
  session.provider.on('tool.call', async (event) => {
    // Send tool call to client first
    session.ws.send(
      JSON.stringify({
        type: 'tool.call',
        toolCallId: event.toolCallId,
        name: event.toolName,
        args: event.toolArgs,
      })
    );

    // Execute tool on server
    const toolResult = await executeToolCall(
      event.toolName!,
      event.toolArgs!,
      session.workspaceId,
      session.conversationId
    );

    // Send result back to provider
    await session.provider.sendToolResult(toolResult);
  });

  // Listen for errors
  session.provider.on('error', (event) => {
    session.ws.send(
      JSON.stringify({
        type: 'error',
        code: event.code,
        message: event.message,
      })
    );
  });
}
