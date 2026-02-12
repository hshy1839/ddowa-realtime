import axios from 'axios';
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

const env = { ...loadDotEnv(path.join(process.cwd(), '..', '..', '.env')), ...process.env };
const apiKey = env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY missing');

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
const res = await axios.get(url);
const models = res.data?.models || [];
const names = models.map((m) => m.name).filter(Boolean);

console.log('Total models:', names.length);
console.log('Live-ish models:');
for (const n of names.filter((x) => /live|bidi|realtime/i.test(x))) {
  console.log(' -', n);
}

console.log('\nAll model names:');
for (const n of names) console.log(n);
