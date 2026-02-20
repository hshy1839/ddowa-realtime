import { WebSocket } from 'ws';
import { AgentConfig, Booking, Contact, Conversation, Message, Workspace } from './models/index.js';
import { GeminiLiveProvider } from './providers/GeminiLiveProvider.js';

function normalizePhone(input?: string): string {
  return (input || '').replace(/\D/g, '');
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function pcm16ToBase64(samples: Int16Array): string {
  return toBase64(new Uint8Array(samples.buffer));
}

function base64ToPCM16(base64: string): Int16Array {
  const bytes = fromBase64(base64);
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

function muLawDecodeByte(muLawByte: number): number {
  const MULAW_BIAS = 0x84;
  const mu = (~muLawByte) & 0xff;
  const sign = mu & 0x80;
  const exponent = (mu >> 4) & 0x07;
  const mantissa = mu & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  return sign ? -sample : sample;
}

function muLawEncodeSample(sample: number): number {
  const MULAW_MAX = 0x7fff;
  const MULAW_BIAS = 0x84;

  let s = Math.max(-MULAW_MAX, Math.min(MULAW_MAX, sample));
  const sign = s < 0 ? 0x80 : 0;
  if (s < 0) s = -s;
  s += MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (s & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {
    // find exponent
  }

  const mantissa = (s >> (exponent + 3)) & 0x0f;
  const mu = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mu;
}

function mulawBase64ToPcm16(base64: string): Int16Array {
  const inBytes = fromBase64(base64);
  const out = new Int16Array(inBytes.length);
  for (let i = 0; i < inBytes.length; i++) out[i] = muLawDecodeByte(inBytes[i]);
  return out;
}

function pcm16ToMulawBase64(samples: Int16Array): string {
  const out = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = muLawEncodeSample(samples[i]);
  return toBase64(out);
}

function resamplePcm16(input: Int16Array, inputRate: number, outputRate: number): Int16Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = Math.round(input[i0] * (1 - frac) + input[i1] * frac);
  }
  return out;
}

function extractDateTimes(text: string): Date[] {
  const now = new Date();
  const out: Date[] = [];

  const regexes = [
    /(오늘|내일|모레)\s*(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/g,
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(오전|오후)?\s*(\d{1,2})\s*(?:시|:)(\d{1,2})?/g,
    /(\d{1,2})[\/-](\d{1,2})\s*(오전|오후)?\s*(\d{1,2})\s*(?:시|:)(\d{1,2})?/g,
  ];

  let m: RegExpExecArray | null;

  while ((m = regexes[0].exec(text)) !== null) {
    const [_, dayWord, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const dayOffset = dayWord === '내일' ? 1 : dayWord === '모레' ? 2 : 0;
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, Number(miRaw || 0));
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  while ((m = regexes[1].exec(text)) !== null) {
    const [_, mo, d, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const dt = new Date(now.getFullYear(), Number(mo) - 1, Number(d), h, Number(miRaw || 0));
    if (dt.getTime() < now.getTime()) dt.setFullYear(now.getFullYear() + 1);
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  while ((m = regexes[2].exec(text)) !== null) {
    const [_, mo, d, ampm, hRaw, miRaw] = m;
    let h = Number(hRaw);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const dt = new Date(now.getFullYear(), Number(mo) - 1, Number(d), h, Number(miRaw || 0));
    if (dt.getTime() < now.getTime()) dt.setFullYear(now.getFullYear() + 1);
    if (!Number.isNaN(dt.getTime())) out.push(dt);
  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}

function classifyConversation(summary: string): { intent: string; title: string } {
  const t = (summary || '').toLowerCase();
  if (/(예약|일정|스케줄|방문|시간)/.test(summary)) return { intent: '예약 문의', title: '예약 문의' };
  if (/(상담|문의|질문|도움)/.test(summary)) return { intent: '상담 문의', title: '상담 문의' };
  if (/(가격|요금|비용|위치|영업시간|안내)/.test(summary)) return { intent: '안내 문의', title: '안내 문의' };
  return { intent: '일반 문의', title: '일반 문의' };
}

export function isTwilioMediaPath(pathname: string): boolean {
  return pathname === '/twilio/media' || pathname === '/twilio/media/' || pathname.startsWith('/twilio/media');
}

export async function findWorkspaceByTwilioNumber(calledRaw?: string): Promise<string | null> {
  const called = normalizePhone(calledRaw);
  if (!called) return null;

  const cfg = await AgentConfig.findOne({ twilioPhoneNumber: new RegExp(`${called.slice(-8)}$`) }).lean();
  return cfg?.workspaceId?.toString?.() || null;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildTwimlStreamResponse(streamUrl: string, statusCallbackUrl?: string): string {
  const safeStreamUrl = escapeXmlAttr(streamUrl);
  const callbackAttr = statusCallbackUrl
    ? ` statusCallback="${escapeXmlAttr(statusCallbackUrl)}" statusCallbackMethod="POST"`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Connect>\n    <Stream url="${safeStreamUrl}"${callbackAttr} />\n  </Connect>\n</Response>`;
}

export async function handleTwilioMediaWS(ws: WebSocket, reqUrl: string) {
  const u = new URL(reqUrl, 'http://localhost');
  const pathParts = u.pathname.split('/').filter(Boolean);
  const workspaceIdFromPath = pathParts[2] || '';
  const workspaceId = u.searchParams.get('workspaceId') || workspaceIdFromPath || '';
  const from = u.searchParams.get('from') || '';
  console.log(`[Twilio][media] ws connected path=${u.pathname} workspaceId=${workspaceId} from=${from}`);

  if (!workspaceId) {
    ws.close(1008, 'workspaceId required');
    return;
  }

  const [agentConfig, workspace] = await Promise.all([
    AgentConfig.findOne({ workspaceId }).lean(),
    Workspace.findById(workspaceId).lean(),
  ]);

  const provider = new GeminiLiveProvider();
  await provider.initialize({});

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
  };

  provider.setAgentConfig(mergedConfig as any);

  let streamSid = '';
  let sttBuffer = '';
  let agentBuffer = '';
  let fullUserTranscript = '';
  let startedAt = Date.now();
  let greeted = false;
  let inboundMediaCount = 0;
  let autoBooked = false;

  const contact = from
    ? await Contact.findOneAndUpdate(
        { workspaceId, phone: new RegExp(`${normalizePhone(from).slice(-8)}$`) },
        { workspaceId, phone: normalizePhone(from), name: '전화고객', lastSeenAt: new Date() },
        { upsert: true, new: true }
      )
    : null;

  const conversation = await Conversation.create({
    workspaceId,
    contactId: contact?._id,
    channel: 'phone',
    status: 'ongoing',
    startedAt: new Date(),
    meta: { from },
  });

  const conversationId = conversation._id.toString();
  await provider.startConversation(conversationId);

  const mergeCaption = (prev: string, incomingRaw: string) => {
    const incoming = (incomingRaw || '').trim();
    if (!incoming) return prev;
    if (!prev) return incoming;
    if (incoming.startsWith(prev)) return incoming;
    if (prev.startsWith(incoming)) return prev;
    const joiner = /\s$/.test(prev) || /^\s/.test(incoming) ? '' : ' ';
    return `${prev}${joiner}${incoming}`;
  };

  provider.on('stt.delta', (event: any) => {
    sttBuffer = mergeCaption(sttBuffer, event.textDelta || '');
    if (event?.textDelta) console.log(`[Twilio][stt] ${String(event.textDelta).slice(0, 80)}`);
  });

  provider.on('agent.delta', (event: any) => {
    agentBuffer = mergeCaption(agentBuffer, event.textDelta || '');
  });

  const tryAutoCreateBooking = async (text: string) => {
    if (autoBooked || !contact?._id) return false;
    const hasBookingRequest = /(예약|일정|스케줄|잡아|등록|추가)/.test(text) && !/(취소|삭제|변경|수정|조회\s*만)/.test(text);
    if (!hasBookingRequest) return false;

    const dts = extractDateTimes(text);
    if (!dts.length) return false;

    const startAt = dts[0];
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const exists = await Booking.findOne({
      workspaceId,
      contactId: contact._id,
      startAt,
      status: { $ne: 'cancelled' },
    }).lean();

    if (exists) {
      autoBooked = true;
      console.log(`[Twilio][booking] already exists at ${startAt.toISOString()}`);
      return true;
    }

    await Booking.create({
      workspaceId,
      contactId: contact._id,
      startAt,
      endAt,
      serviceName: '전화 상담',
      status: 'confirmed',
      memo: `auto-booking phone:${normalizePhone(from)}`,
    });

    autoBooked = true;
    console.log(`[Twilio][booking] auto-created ${startAt.toISOString()} contact=${contact._id}`);
    return true;
  };

  provider.on('agent.complete', async () => {
    try {
      if (sttBuffer.trim()) {
        fullUserTranscript = [fullUserTranscript, sttBuffer.trim()].filter(Boolean).join('\n');
        await Message.create({ conversationId, role: 'user', text: sttBuffer.trim(), createdAt: new Date() });
        try {
          await tryAutoCreateBooking(fullUserTranscript);
        } catch (e: any) {
          console.error('[Twilio][booking] auto-create error:', e?.message || e);
        }
      }
      if (agentBuffer.trim()) {
        await Message.create({ conversationId, role: 'agent', text: agentBuffer.trim(), createdAt: new Date() });
      }
    } catch {}
    sttBuffer = '';
    agentBuffer = '';
  });

  provider.on('tts.audio', (event: any) => {
    if (!streamSid || ws.readyState !== ws.OPEN) return;
    const inputPcm16 = base64ToPCM16(event.pcm16ChunkBase64 || '');
    const inRate = Number(event.sampleRate) || 24000;
    const outPcm16 = resamplePcm16(inputPcm16, inRate, 8000);
    const payload = pcm16ToMulawBase64(outPcm16);

    ws.send(
      JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload },
      })
    );
  });

  const finalize = async () => {
    try {
      const { summary, intent: rawIntent } = await provider.endConversation();
      const durationSec = Math.floor((Date.now() - startedAt) / 1000);

      if (sttBuffer.trim()) await Message.create({ conversationId, role: 'user', text: sttBuffer.trim(), createdAt: new Date() });
      if (agentBuffer.trim()) await Message.create({ conversationId, role: 'agent', text: agentBuffer.trim(), createdAt: new Date() });

      const classified = classifyConversation(summary || '');
      let finalSummary = summary || '';
      let finalIntent = rawIntent && rawIntent !== 'customer_inquiry' ? rawIntent : classified.intent;

      // 종료 시에도 한 번 더 안전하게 자동 예약 시도
      const userTextForBooking = [fullUserTranscript || '', sttBuffer || '', summary || ''].filter(Boolean).join('\n');
      const bookedAtFinalize = await tryAutoCreateBooking(userTextForBooking);
      if (bookedAtFinalize) {
        const dts = extractDateTimes(userTextForBooking);
        if (dts.length) {
          finalSummary = `${finalSummary}\n[자동예약] ${dts[0].toLocaleString('ko-KR')} 예약 생성 완료`;
        } else {
          finalSummary = `${finalSummary}\n[자동예약] 예약 생성 완료`;
        }
        finalIntent = '예약 문의';
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        status: 'completed',
        endedAt: new Date(),
        durationSec,
        summary: finalSummary,
        intent: finalIntent,
        meta: {
          from,
          title: finalIntent || classified.title,
          autoBooked,
        },
      });
    } catch (e: any) {
      console.error('[Twilio][finalize] error:', e?.message || e);
    }
    try {
      await provider.disconnect();
    } catch {}
  };

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event === 'start') {
        streamSid = msg.start?.streamSid || msg.streamSid || '';
        startedAt = Date.now();
        console.log(`[Twilio][media] start streamSid=${streamSid}`);
        if (!greeted) {
          greeted = true;
          await provider.sendTextTurn('전화 연결되었습니다. 안녕하세요, 무엇을 도와드릴까요?');
        }
      } else if (msg.event === 'media') {
        const payload = msg.media?.payload || '';
        if (!payload) return;
        inboundMediaCount += 1;
        if (inboundMediaCount % 50 === 0) {
          console.log(`[Twilio][media] inbound chunks=${inboundMediaCount}`);
        }
        const pcm16_8k = mulawBase64ToPcm16(payload);
        // Gemini Live 인식 안정화를 위해 전화 8k PCM을 16k로 업샘플링 후 전달
        const pcm16_16k = resamplePcm16(pcm16_8k, 8000, 16000);
        await provider.sendAudioChunk(pcm16ToBase64(pcm16_16k), 16000, Date.now());
      } else if (msg.event === 'stop') {
        console.log(`[Twilio][media] stop streamSid=${msg.streamSid || streamSid}`);
        await finalize();
      }
    } catch (e: any) {
      console.error('[Twilio][media] message parse/handle error:', e?.message || e);
    }
  });

  ws.on('close', async () => {
    console.log('[Twilio][media] ws closed');
    await finalize();
  });

  ws.on('error', async (err: any) => {
    console.error('[Twilio][media] ws error:', err?.message || err);
    await finalize();
  });
}
