import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

function loadDotEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    out[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return out;
}

const env = { ...loadDotEnv(path.join(process.cwd(), '..', '..', '.env')), ...process.env };
const apiKey = env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY missing');

const model = env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('open');
  ws.send(JSON.stringify({ setup: { model, generationConfig: { responseModalities: ['AUDIO'] } } }));

  const sampleRate = 16000;
  const pcm16 = new Int16Array(1600);
  const b64 = Buffer.from(pcm16.buffer).toString('base64');

  const variants = [
    {
      name: 'snake_case',
      msg: { realtime_input: { media_chunks: [{ mime_type: `audio/pcm;rate=${sampleRate}`, data: b64 }] } },
    },
    {
      name: 'camelCase',
      msg: { realtimeInput: { mediaChunks: [{ mimeType: `audio/pcm;rate=${sampleRate}`, data: b64 }] } },
    },
    {
      name: 'client_content_inlineData',
      msg: {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType: `audio/pcm;rate=${sampleRate}`, data: b64 } }],
            },
          ],
        },
      },
    },
  ];

  let i = 0;
  const tick = () => {
    const v = variants[i++];
    if (!v) {
      setTimeout(() => ws.close(), 1500);
      return;
    }
    console.log('send variant', v.name);
    ws.send(JSON.stringify(v.msg));
    setTimeout(tick, 500);
  };

  setTimeout(tick, 300);
});

ws.on('message', (d) => {
  console.log('MSG', d.toString().slice(0, 1200));
});

ws.on('close', (c, r) => {
  console.log('close', c, r.toString());
});

ws.on('error', (e) => {
  console.log('err', e.message);
});
