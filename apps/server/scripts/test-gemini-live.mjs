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
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

// repo root .env
const env = {
  ...loadDotEnv(path.join(process.cwd(), '..', '..', '.env')),
  ...process.env,
};

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}

const model = env.GEMINI_LIVE_MODEL || 'models/gemini-2.0-flash-live';
const apiVersion = env.GEMINI_LIVE_API_VERSION || 'v1beta';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;

console.log('Connecting to:', url.replace(apiKey, '***'));
console.log('Model:', model);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('WS open');

  const setup = {
    setup: {
      model,
      generationConfig: {
        responseModalities: ['AUDIO'],
      },
    },
  };

  ws.send(JSON.stringify(setup));

  const sampleRate = 16000;
  const samples = 3200;
  const pcm16 = new Int16Array(samples);
  const b64 = Buffer.from(pcm16.buffer).toString('base64');

  const chunk = {
    realtimeInput: {
      mediaChunks: [
        {
          mimeType: `audio/pcm;rate=${sampleRate}`,
          data: b64,
        },
      ],
    },
  };

  setTimeout(() => {
    console.log('Sending audio chunk (silence)');
    ws.send(JSON.stringify(chunk));
  }, 300);

  setTimeout(() => {
    console.log('Closing');
    ws.close();
  }, 3000);
});

ws.on('message', (data) => {
  const text = data.toString();
  try {
    const msg = JSON.parse(text);
    console.log('MSG', JSON.stringify(msg).slice(0, 2000));
  } catch {
    console.log('MSG_RAW', text.slice(0, 2000));
  }
});

ws.on('error', (e) => {
  console.error('WS error', e);
});

ws.on('close', (code, reason) => {
  console.log('WS close', code, reason.toString());
});
