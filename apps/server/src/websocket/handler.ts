import { WebSocket } from 'ws';
import axios from 'axios';
import { IAgentProvider } from '../providers/types.js';
import { GeminiLiveProvider } from '../providers/GeminiLiveProvider.js';
import { AgentConfig, Booking, Contact, Conversation, Message, Workspace } from '../models/index.js';
import { executeToolCall } from './tools.js';
import { IParsedToken } from '../lib/jwt.js';

export interface WSSession {
  ws: WebSocket;
  userId: string;
  workspaceId: string; // Mongo ObjectId string
  conversationId: string; // Mongo ObjectId string
  provider: IAgentProvider;
  startTime: number;
  sttBuffer: string;
  agentBuffer: string;
  fullUserTranscript: string;
  lastCustomerPhone: string;
  pendingBookingAt: Date | null;
  pendingBookingRequested: boolean;
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-latest:generateContent?key=${apiKey}`,
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
    sttBuffer: '',
    agentBuffer: '',
    fullUserTranscript: '',
    lastCustomerPhone: '',
    pendingBookingAt: null,
    pendingBookingRequested: false,
  };

  sessions.set(sessionId, session);
  console.log(`[WS] Client connected: ${sessionId} workspace=${workspaceId}`);

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
        console.log(`🎯 [CALL.START] ${sessionId} starting call...`);
        session.startTime = Date.now();
        session.sttBuffer = '';
        session.agentBuffer = '';
        session.fullUserTranscript = '';
        session.lastCustomerPhone = '';
        session.pendingBookingAt = null;
        session.pendingBookingRequested = false;

        // 저지연 모드: 헬스체크는 백그라운드로 수행(통화 시작 블로킹 금지)
        geminiHealthcheck(session.ws).catch(() => undefined);

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

        // 상담사 설정 + 회사 정보 반영
        const [agentConfig, workspace] = await Promise.all([
          AgentConfig.findOne({ workspaceId: session.workspaceId }).lean(),
          Workspace.findById(session.workspaceId).lean(),
        ]);

        const mergedConfig = {
          ...(agentConfig || {}),
          companyName:
            (agentConfig as any)?.companyName ||
            (workspace as any)?.businessInfo?.companyName ||
            (workspace as any)?.name ||
            '',
          companyDescription:
            (agentConfig as any)?.companyDescription ||
            (workspace as any)?.businessInfo?.description ||
            '',
          companyPhone:
            (agentConfig as any)?.companyPhone ||
            (workspace as any)?.businessInfo?.phone ||
            '',
          companyWebsite:
            (agentConfig as any)?.companyWebsite ||
            (workspace as any)?.businessInfo?.website ||
            '',
          speechRate: Math.min(1.2, Math.max(0.8, Number((agentConfig as any)?.speechRate ?? 1.0) || 1.0)),
          micInputGain: Math.min(2.0, Math.max(0.5, Number((agentConfig as any)?.micInputGain ?? 1.0) || 1.0)),
          micNoiseGate: Math.min(0.05, Math.max(0, Number((agentConfig as any)?.micNoiseGate ?? 0.0) || 0.0)),
          micSelfMonitor: Boolean((agentConfig as any)?.micSelfMonitor ?? false),
        };

        (session.provider as GeminiLiveProvider).setAgentConfig(mergedConfig as any);

        // Setup provider event listeners first (avoid missing early realtime events)
        setupProviderListeners(session);

        // Start provider conversation
        console.log(`📞 [CALL.START] Starting Gemini conversation...`);
        await session.provider.startConversation(session.conversationId);
        console.log(`✓ [CALL.START] Gemini conversation started`);

        // Send call.started event
        session.ws.send(
          JSON.stringify({
            type: 'call.started',
            conversationId: session.conversationId,
            speechRate: (mergedConfig as any).speechRate ?? 1.0,
            micInputGain: (mergedConfig as any).micInputGain ?? 1.0,
            micNoiseGate: (mergedConfig as any).micNoiseGate ?? 0.0,
            micSelfMonitor: (mergedConfig as any).micSelfMonitor ?? false,
          })
        );

        // 로컬/관리자 페이지 테스트용: 상담 시작 버튼 직후 에이전트가 먼저 인사
        const maybeSendTextTurn = (session.provider as any)?.sendTextTurn;
        if (typeof maybeSendTextTurn === 'function') {
          await maybeSendTextTurn.call(session.provider, '안녕하세요, 상담 시작되었습니다. 무엇을 도와드릴까요?');
        }

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

        // 종료 시에도 누락 방지를 위해 한 번 더 자동 예약 시도
        const bookingOnStop = await handleBookingCrudByPhone(session, session.fullUserTranscript);
        if (bookingOnStop) {
          session.agentBuffer = mergeCaption(session.agentBuffer, bookingOnStop);
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

        if (session.conversationId) {
          try {
            if (session.sttBuffer.trim()) {
              await Message.create({
                conversationId: session.conversationId,
                role: 'user',
                text: session.sttBuffer.trim(),
                createdAt: new Date(),
              });
            }
            if (session.agentBuffer.trim()) {
              await Message.create({
                conversationId: session.conversationId,
                role: 'agent',
                text: session.agentBuffer.trim(),
                createdAt: new Date(),
              });
            }
          } catch (e) {
            console.error('Failed to flush merged messages on stop:', e);
          }
        }

        session.sttBuffer = '';
        session.agentBuffer = '';
        session.fullUserTranscript = '';
        session.lastCustomerPhone = '';
        session.pendingBookingAt = null;
        session.pendingBookingRequested = false;
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
    if (event.textDelta) {
      session.sttBuffer = mergeCaption(session.sttBuffer, event.textDelta);
      session.fullUserTranscript = [session.fullUserTranscript, event.textDelta].filter(Boolean).join('\n');
      const detected = extractPhone(event.textDelta);
      if (detected) session.lastCustomerPhone = detected;
    }
  });

  session.provider.on('agent.delta', async (event: any) => {
    console.log(`💬 [AGENT.DELTA] ${event.textDelta}`);
    session.ws.send(JSON.stringify({ type: 'agent.delta', textDelta: event.textDelta }));
    if (event.textDelta) {
      session.agentBuffer = mergeCaption(session.agentBuffer, event.textDelta);
    }
  });

  session.provider.on('agent.complete', async () => {
    console.log(`✓ [AGENT.COMPLETE] Agent response complete`);

    const bookingAssistantReply = await handleBookingCrudByPhone(session, session.sttBuffer || session.fullUserTranscript);
    if (bookingAssistantReply) {
      // CRUD 결과를 모델 응답보다 우선시해서 허위 안내 방지
      session.agentBuffer = bookingAssistantReply;
      session.ws.send(JSON.stringify({ type: 'agent.delta', textDelta: bookingAssistantReply }));
    }

    if (session.conversationId) {
      try {
        if (session.sttBuffer.trim()) {
          await Message.create({
            conversationId: session.conversationId,
            role: 'user',
            text: session.sttBuffer.trim(),
            createdAt: new Date(),
          });
        }
        if (session.agentBuffer.trim()) {
          await Message.create({
            conversationId: session.conversationId,
            role: 'agent',
            text: session.agentBuffer.trim(),
            createdAt: new Date(),
          });
        }
      } catch (e) {
        console.error('Failed to save merged messages:', e);
      }
    }

    session.sttBuffer = '';
    session.agentBuffer = '';
    session.ws.send(JSON.stringify({ type: 'agent.complete' }));
  });

  session.provider.on('tts.audio', (event: any) => {
    session.ws.send(
      JSON.stringify({
        type: 'tts.audio',
        pcm16ChunkBase64: event.pcm16ChunkBase64,
        sampleRate: event.sampleRate,
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


function mergeCaption(prev: string, incomingRaw: string): string {
  const incoming = (incomingRaw || '').trim();
  if (!incoming) return prev;
  if (!prev) return incoming;

  if (incoming.startsWith(prev)) return incoming;
  if (prev.startsWith(incoming)) return prev;

  const joiner = /\s$/.test(prev) || /^\s/.test(incoming) ? '' : ' ';
  return `${prev}${joiner}${incoming}`;
}


function normalizePhone(input: string): string {
  return (input || '').replace(/\D/g, '');
}

function extractPhone(text: string): string | null {
  const raw = text || '';

  // 1) 공백/하이픈 포함 일반 패턴
  const m = raw.match(/(?:\+?82[\s-]?)?0?1[0-9](?:[\s-]?\d){7,9}/);
  if (m) {
    let digits = normalizePhone(m[0]);
    if (digits.startsWith('82')) digits = `0${digits.slice(2)}`;
    const matched = digits.match(/01\d{8,9}/);
    if (matched) return matched[0].slice(0, 11);
  }

  // 2) STT가 "0 1 0 8 ..."처럼 쪼개는 경우 대응
  const compactDigits = raw.replace(/\D/g, '');
  if (!compactDigits) return null;
  const normalizedCompact = compactDigits.startsWith('82') ? `0${compactDigits.slice(2)}` : compactDigits;
  const found = normalizedCompact.match(/01\d{8,9}/);
  return found ? found[0].slice(0, 11) : null;
}

function extractDateTimes(text: string): Date[] {
  const out: Date[] = [];
  const now = new Date();
  const normalizedText = (text || '').replace(/\s+/g, '');

  const sources = [text || '', normalizedText];

  for (const src of sources) {

  // 1) YYYY-MM-DD HH:mm
  const fullRegex = /(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\s*(\d{1,2})[:시](\d{1,2})?/g;
  let m: RegExpExecArray | null;
  while ((m = fullRegex.exec(src)) !== null) {
    const [_, y, mo, d, h, mi] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi || 0));
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  // 2) M월 D일 H시(분 optional)
  const mdRegex = /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/g;
  while ((m = mdRegex.exec(src)) !== null) {
    const [_, mo, d, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const dt = new Date(now.getFullYear(), Number(mo) - 1, Number(d), h, Number(miRaw || 0));
    if (dt.getTime() < now.getTime()) dt.setFullYear(now.getFullYear() + 1);
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  // 3) 상대 날짜(오늘/내일/모레) + 시간
  const relRegex = /(오늘|내일|모레)\s*(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/g;
  while ((m = relRegex.exec(src)) !== null) {
    const [_, dayWord, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;

    const dayOffset = dayWord === '내일' ? 1 : dayWord === '모레' ? 2 : 0;
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, Number(miRaw || 0));
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  // 4) M/D H:mm
  const slashRegex = /(\d{1,2})[\/-](\d{1,2})\s*(오전|오후)?\s*(\d{1,2})[:시](\d{1,2})?/g;
  while ((m = slashRegex.exec(src)) !== null) {
    const [_, mo, d, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const dt = new Date(now.getFullYear(), Number(mo) - 1, Number(d), h, Number(miRaw || 0));
    if (dt.getTime() < now.getTime()) dt.setFullYear(now.getFullYear() + 1);
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}

async function findOrCreateContactByPhone(workspaceId: string, phoneDigits: string) {
  let contact = await Contact.findOne({ workspaceId, phone: new RegExp(phoneDigits.slice(-8) + '$') });
  if (!contact) {
    contact = await Contact.create({ workspaceId, name: '고객', phone: phoneDigits, lastSeenAt: new Date() });
  }
  return contact;
}

export async function handleBookingCrudByPhone(session: WSSession, userTextRaw: string): Promise<string | null> {
  const userText = (userTextRaw || '').trim();
  if (!userText) return null;

  const dts = extractDateTimes(userText);
  const hasBookingWord = /(예약|일정|스케줄|조회|확인|내역|추가|생성|등록|수정|변경|취소|삭제|잡아|잡아줘)/.test(userText);
  const hasActionWord = /(해줘|부탁|잡아줘|등록해|추가해)/.test(userText);

  if (dts.length) session.pendingBookingAt = dts[0];
  if (hasBookingWord || (hasActionWord && dts.length > 0)) session.pendingBookingRequested = true;

  console.log(`[WEB][booking] input="${userText.slice(0, 120)}" hasBookingWord=${hasBookingWord} hasActionWord=${hasActionWord} dts=${dts.length} pendingAt=${session.pendingBookingAt ? session.pendingBookingAt.toISOString() : 'none'} pendingReq=${session.pendingBookingRequested}`);

  const likelyCreateByContext = session.pendingBookingRequested && !!session.pendingBookingAt;
  if (!hasBookingWord && !(hasActionWord && dts.length) && !likelyCreateByContext) return null;

  const detectedPhone = extractPhone(userText);
  const phone = detectedPhone || session.lastCustomerPhone;
  if (detectedPhone) session.lastCustomerPhone = detectedPhone;
  console.log(`[WEB][booking] parsed phone=${phone || 'none'} lastPhone=${session.lastCustomerPhone || 'none'}`);
  if (!phone) {
    return '예약 처리를 위해 고객 전화번호(예: 010-1234-5678)를 함께 말씀해 주세요.';
  }

  const isUpdate = /(수정|변경)/.test(userText);
  const isDelete = /(취소|삭제)/.test(userText);
  const isCreate = ((/(추가|생성|등록|잡아|해줘|부탁)/.test(userText) || dts.length > 0) || likelyCreateByContext) && !isUpdate && !isDelete;
  const isRead = /(조회|확인|내역|보여)/.test(userText) && !isCreate;

  const contact = await findOrCreateContactByPhone(session.workspaceId, phone);

  if (isRead) {
    let list = await Booking.find({ workspaceId: session.workspaceId, contactId: contact._id }).sort({ startAt: 1 }).limit(5).lean();

    // STT 번호 흔들림 대비: 동일 끝자리(8자리) 연락처들의 예약도 보조 조회
    if (!list.length && phone.length >= 8) {
      const similars = await Contact.find({ workspaceId: session.workspaceId, phone: new RegExp(`${phone.slice(-8)}$`) }).select('_id').lean();
      const ids = similars.map((c: any) => c._id);
      if (ids.length) {
        list = await Booking.find({ workspaceId: session.workspaceId, contactId: { $in: ids } }).sort({ startAt: 1 }).limit(5).lean();
      }
    }

    if (!list.length) return `전화번호 ${phone} 기준 예약 내역이 없습니다.`;
    const lines = list.map((b: any, i: number) => `${i + 1}) ${new Date(b.startAt).toLocaleString('ko-KR')} (${b.status})`);
    return `전화번호 ${phone} 예약 내역입니다.\n` + lines.join('\n');
  }

  if (isCreate) {
    const startAt = dts[0] || session.pendingBookingAt;
    if (!startAt) return '예약 추가할 날짜/시간을 말씀해 주세요. 예: 내일 오후 3시 / 2월 18일 14시';
    const endAt = startAt;
    const exists = await Booking.findOne({
      workspaceId: session.workspaceId,
      contactId: contact._id,
      startAt,
      status: { $ne: 'cancelled' },
    }).lean();
    if (exists) {
      return `해당 시간 예약이 이미 있습니다. (${new Date(exists.startAt).toLocaleString('ko-KR')})`;
    }

    const booking = await Booking.create({
      workspaceId: session.workspaceId,
      contactId: contact._id,
      startAt,
      endAt,
      serviceName: '전화 상담',
      status: 'confirmed',
      memo: `phone:${phone}`,
    });
    console.log(`[WEB][booking] created id=${booking._id} workspace=${session.workspaceId} contact=${contact._id} at=${startAt.toISOString()}`);
    session.pendingBookingAt = null;
    session.pendingBookingRequested = false;
    return `예약을 등록했습니다. (${new Date(booking.startAt).toLocaleString('ko-KR')})`;
  }

  if (isUpdate) {
    const target = await Booking.findOne({ workspaceId: session.workspaceId, contactId: contact._id, status: { $ne: 'cancelled' } }).sort({ startAt: 1 });
    if (!target) return `변경할 예약이 없습니다. 전화번호 ${phone} 기준 예약 내역을 먼저 확인해 주세요.`;
    if (!dts.length) return '예약 변경할 새 날짜/시간을 말씀해 주세요. 예: 모레 16시 / 3월 1일 오후 2시';
    const newStart = dts[dts.length - 1];
    target.startAt = newStart;
    target.endAt = newStart;
    await target.save();
    session.pendingBookingAt = null;
    session.pendingBookingRequested = false;
    return `예약 시간을 변경했습니다. (${newStart.toLocaleString('ko-KR')})`;
  }

  if (isDelete) {
    const target = await Booking.findOne({ workspaceId: session.workspaceId, contactId: contact._id, status: { $ne: 'cancelled' } }).sort({ startAt: 1 });
    if (!target) return `취소할 예약이 없습니다. 전화번호 ${phone} 기준 예약 내역이 비어 있습니다.`;
    target.status = 'cancelled';
    await target.save();
    session.pendingBookingAt = null;
    session.pendingBookingRequested = false;
    return `예약을 취소했습니다. (${new Date(target.startAt).toLocaleString('ko-KR')})`;
  }

  return null;
}
