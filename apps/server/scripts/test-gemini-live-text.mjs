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

const apiVersion = env.GEMINI_LIVE_API_VERSION || 'v1alpha';
const model = env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
console.log('url', url.replace(apiKey, '***'));
console.log('model', model);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('open');
  ws.send(
    JSON.stringify({
      setup: {
        model,
        generationConfig: { responseModalities: ['AUDIO'] },
      },
    })
  );

  // Send text after setupComplete arrives (see ws.on('message'))

  setTimeout(() => {
    console.log('close');
    ws.close();
  }, 6000);
});

let sent = false;
ws.on('message', (d) => {
  const s = d.toString();
  console.log('MSG', s.slice(0, 2000));

  try {
    const j = JSON.parse(s);
    if (!sent && j?.setupComplete) {
      sent = true;
      console.log('send text turn');
      ws.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: 'Hello! Please reply with a short greeting.' }],
              },
            ],
          },
        })
      );
    }
  } catch {
    // ignore
  }
});

ws.on('close', (c, r) => {
  console.log('close event', c, r.toString());
});

ws.on('error', (e) => {
  console.log('err', e.message);
});
