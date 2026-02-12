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
const apiVersion = env.GEMINI_LIVE_API_VERSION || 'v1alpha';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const setupVariants = [
  {
    name: 'snake_case',
    msg: { setup: { model, generation_config: { response_modalities: ['AUDIO', 'TEXT'] } } },
  },
  {
    name: 'camelCase',
    msg: { setup: { model, generationConfig: { responseModalities: ['AUDIO', 'TEXT'] } } },
  },
  {
    name: 'generationConfig_only',
    msg: { setup: { model, generationConfig: { responseModalities: ['AUDIO'] } } },
  },
  {
    name: 'no_generation_config',
    msg: { setup: { model } },
  },
];

async function runVariant(variant) {
  console.log('\n=== Variant:', variant.name, '===');
  const ws = new WebSocket(url);

  ws.on('open', () => {
    ws.send(JSON.stringify(variant.msg));
    // send a tiny silence chunk shortly after
    const sampleRate = 16000;
    const pcm16 = new Int16Array(800);
    const b64 = Buffer.from(pcm16.buffer).toString('base64');
    setTimeout(() => {
      ws.send(
        JSON.stringify({
          realtime_input: {
            media_chunks: [{ mime_type: `audio/pcm;rate=${sampleRate}`, data: b64 }],
          },
        })
      );
    }, 200);

    setTimeout(() => ws.close(), 1200);
  });

  ws.on('message', (d) => {
    console.log('MSG', d.toString().slice(0, 800));
  });

  ws.on('close', (code, reason) => {
    console.log('CLOSE', code, reason.toString());
  });

  ws.on('error', (e) => {
    console.log('ERR', e.message);
  });

  await new Promise((r) => setTimeout(r, 1500));
}

for (const v of setupVariants) {
  // eslint-disable-next-line no-await-in-loop
  await runVariant(v);
}
