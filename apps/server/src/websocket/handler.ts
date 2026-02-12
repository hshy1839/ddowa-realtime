import { WebSocket } from 'ws';
import axios from 'axios';
import { IAgentProvider } from '../providers/types';
import { GeminiLiveProvider } from '../providers/GeminiLiveProvider';
import { Conversation, Message, Workspace } from '../models';
import { executeToolCall } from './tools';
import { IParsedToken } from '../lib/jwt';

export interface WSSession {
  ws: WebSocket;
  userId: string;
  workspaceId: string; // Mongo ObjectId string
  conversationId: string; // Mongo ObjectId string
  provider: IAgentProvider;
  startTime: number;
}

const sessions = new Map<string, WSSession>();

async function ensureWorkspaceId(token: IParsedToken | null, workspaceSlug?: string): Promise<string | null> {
  if (token?.workspaceId) return token.workspaceId;
  if (!workspaceSlug) return null;

  const slug = workspaceSlug.toLowerCase();
  const existing = await Workspace.findOne({ slug }).lean();
  if (existing) return existing._id.toString();

  const created = await Workspace.create({
    name: `${workspaceSlug} Workspace`,
    slug,
    timezone: 'UTC',
  });
  return created._id.toString();
}

async function geminiHealthcheck(ws: WebSocket) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    ws.send(
      JSON.stringify({
        type: 'gemini.health',
        ok: false,
        message: 'GEMINI_API_KEY not set',
      })
    );
    return;
  }

  try {
    // 1) Basic auth + connectivity check
    const modelsRes = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    // 2) Real generateContent ping (ensures the key can actually call a model)
    let pingOk = false;
    let pingStatus: number | undefined;
    let pingError: string | undefined;

    try {
      const pingRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'ping' }],
            },
          ],
          generationConfig: { maxOutputTokens: 5 },
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      pingOk = !!pingRes.data?.candidates?.[0]?.content;
      pingStatus = pingRes.status;
    } catch (pe: any) {
      pingOk = false;
      pingStatus = pe?.response?.status;
      pingError = pe?.response?.data?.error?.message || pe?.message;
    }

    ws.send(
      JSON.stringify({
        type: 'gemini.health',
        ok: true,
        status: modelsRes.status,
        modelCount: Array.isArray(modelsRes.data?.models) ? modelsRes.data.models.length : undefined,
        ping: {
          ok: pingOk,
          status: pingStatus,
          error: pingError,
        },
      })
    );
  } catch (e: any) {
    ws.send(
      JSON.stringify({
        type: 'gemini.health',
        ok: false,
        status: e?.response?.status,
        message: e?.response?.data?.error?.message || e?.message || 'Gemini healthcheck failed',
      })
    );
  }
}

export async function handleWSConnection(ws: WebSocket, token: IParsedToken | null, workspaceSlug?: string) {
  const workspaceId = await ensureWorkspaceId(token, workspaceSlug);
  if (!workspaceId) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Create AI provider instance
  const provider = new GeminiLiveProvider();
  await provider.initialize({});

  const session: WSSession = {
    ws,
    userId: token?.userId || 'anonymous',
    workspaceId,
    conversationId: '',
    provider,
    startTime: Date.now(),
  };

  sessions.set(sessionId, session);
  console.log(`[WS] Client connected: ${sessionId} workspace=${workspaceId}`);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WS] ${sessionId} received:`, message.type);
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
        console.log(`🎯 [CALL.START] ${sessionId} starting call...`);
        session.startTime = Date.now();

        // (요구사항) 통화 시작 시 Gemini API 연결 상태를 1회 확인
        await geminiHealthcheck(session.ws);

        // Create conversation in MongoDB
        const conversation = await Conversation.create({
          workspaceId: session.workspaceId,
          channel: 'web',
          status: 'ongoing',
          startedAt: new Date(),
          durationSec: 0,
        });

        session.conversationId = conversation._id.toString();
        console.log(`✓ [CALL.START] Conversation created: ${session.conversationId}`);

        // Start provider conversation
        console.log(`📞 [CALL.START] Starting Gemini conversation...`);
        await session.provider.startConversation(session.conversationId);
        console.log(`✓ [CALL.START] Gemini conversation started`);

        // Send call.started event
        session.ws.send(
          JSON.stringify({
            type: 'call.started',
            conversationId: session.conversationId,
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

        console.log(`🎤 [AUDIO] ${sessionId} sending audio chunk (${pcm16ChunkBase64.length} bytes)`);
        try {
          await session.provider.sendAudioChunk(pcm16ChunkBase64, sampleRate, seq);
        } catch (audioError) {
          console.error(`❌ [AUDIO] Error processing audio:`, audioError);
        }
        break;
      }

      case 'call.stop': {
        console.log(`📴 [CALL.STOP] ${sessionId} stopping call...`);
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

        const { summary, intent } = await session.provider.endConversation();
        const durationSec = Math.floor((Date.now() - session.startTime) / 1000);

        await Conversation.findByIdAndUpdate(session.conversationId, {
          status: 'completed',
          endedAt: new Date(),
          durationSec,
          summary,
          intent,
        });

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
  // (중복 등록 방지)
  (session.provider as any).removeAllListeners?.();
  console.log(`🎤 [EVENTS] setupProviderListeners called for ${session.conversationId}`);

  session.provider.on('stt.delta', async (event: any) => {
    console.log(`📝 [STT.DELTA] ${event.textDelta}`);
    session.ws.send(JSON.stringify({ type: 'stt.delta', textDelta: event.textDelta }));

    if (session.conversationId && event.textDelta) {
      try {
        await Message.create({
          conversationId: session.conversationId,
          role: 'user',
          text: event.textDelta,
          createdAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to save user message:', e);
      }
    }
  });

  session.provider.on('agent.delta', async (event: any) => {
    console.log(`💬 [AGENT.DELTA] ${event.textDelta}`);
    session.ws.send(JSON.stringify({ type: 'agent.delta', textDelta: event.textDelta }));

    if (session.conversationId && event.textDelta) {
      try {
        await Message.create({
          conversationId: session.conversationId,
          role: 'agent',
          text: event.textDelta,
          createdAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to save agent message:', e);
      }
    }
  });

  session.provider.on('tts.audio', (event: any) => {
    console.log(`🔊 [TTS.AUDIO] received ${event.pcm16ChunkBase64?.length || 0} bytes`);
    session.ws.send(
      JSON.stringify({
        type: 'tts.audio',
        pcm16ChunkBase64: event.pcm16ChunkBase64,
      })
    );
  });

  session.provider.on('tool.call', async (event: any) => {
    console.log(`🛠️ [TOOL.CALL] ${event.toolName}`);
    session.ws.send(
      JSON.stringify({
        type: 'tool.call',
        toolCallId: event.toolCallId,
        name: event.toolName,
        args: event.toolArgs,
      })
    );

    const toolResult = await executeToolCall(
      event.toolName!,
      event.toolArgs!,
      session.workspaceId,
      session.conversationId
    );

    await session.provider.sendToolResult(toolResult);
  });

  session.provider.on('error', (event: any) => {
    console.error(`❌ [PROVIDER.ERROR]`, event);
    session.ws.send(
      JSON.stringify({
        type: 'error',
        code: event.code,
        message: event.message,
      })
    );
  });
}
