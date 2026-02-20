import { WebSocket } from 'ws';
import { AgentConfig, Contact, Conversation, Message, Workspace } from './models/index.js';
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
  let mu = (~muLawByte) & 0xff;
  const sign = mu & 0x80;
  const exponent = (mu >> 4) & 0x07;
  const mantissa = mu & 0x0f;
  let sample = ((mantissa << 4) + 0x08) << exponent;
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
  const workspaceId = u.searchParams.get('workspaceId') || '';
  const from = u.searchParams.get('from') || '';
  console.log(`[Twilio][media] ws connected workspaceId=${workspaceId} from=${from}`);

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
  let startedAt = Date.now();

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
  });

  provider.on('agent.delta', (event: any) => {
    agentBuffer = mergeCaption(agentBuffer, event.textDelta || '');
  });

  provider.on('agent.complete', async () => {
    try {
      if (sttBuffer.trim()) {
        await Message.create({ conversationId, role: 'user', text: sttBuffer.trim(), createdAt: new Date() });
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
      const { summary, intent } = await provider.endConversation();
      const durationSec = Math.floor((Date.now() - startedAt) / 1000);
      await Conversation.findByIdAndUpdate(conversationId, {
        status: 'completed',
        endedAt: new Date(),
        durationSec,
        summary,
        intent,
      });
      if (sttBuffer.trim()) await Message.create({ conversationId, role: 'user', text: sttBuffer.trim(), createdAt: new Date() });
      if (agentBuffer.trim()) await Message.create({ conversationId, role: 'agent', text: agentBuffer.trim(), createdAt: new Date() });
    } catch {}
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
      } else if (msg.event === 'media') {
        const payload = msg.media?.payload || '';
        if (!payload) return;
        const pcm16 = mulawBase64ToPcm16(payload);
        await provider.sendAudioChunk(pcm16ToBase64(pcm16), 8000, Date.now());
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
