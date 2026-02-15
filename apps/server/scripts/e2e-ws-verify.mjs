import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import WebSocket from 'ws';

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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await sleep(500);
  }
  return false;
}

function runWsScenario(port = 8080) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}?workspaceSlug=e2e-verify`);
    const counts = {
      connected: 0,
      callStarted: 0,
      sttDelta: 0,
      agentDelta: 0,
      agentComplete: 0,
      errors: 0,
    };

    let seq = 0;
    let sendTimer = null;

    const makeSilenceChunk = (samples = 2048) => {
      const pcm = new Int16Array(samples);
      return Buffer.from(pcm.buffer).toString('base64');
    };

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'call.start', workspaceSlug: 'e2e-verify' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'connected') counts.connected += 1;
      if (msg.type === 'call.started') {
        counts.callStarted += 1;
        sendTimer = setInterval(() => {
          ws.send(
            JSON.stringify({
              type: 'audio.chunk',
              pcm16ChunkBase64: makeSilenceChunk(),
              sampleRate: 16000,
              seq: seq++,
            })
          );
        }, 180);

        setTimeout(() => {
          if (sendTimer) clearInterval(sendTimer);
          ws.send(JSON.stringify({ type: 'call.stop' }));
        }, 4500);
      }
      if (msg.type === 'stt.delta') counts.sttDelta += 1;
      if (msg.type === 'agent.delta') counts.agentDelta += 1;
      if (msg.type === 'agent.complete') counts.agentComplete += 1;
      if (msg.type === 'error') counts.errors += 1;
    });

    ws.on('error', reject);

    setTimeout(() => {
      if (sendTimer) clearInterval(sendTimer);
      ws.close();
    }, 9000);

    ws.on('close', () => resolve(counts));
  });
}

async function main() {
  const root = path.join(process.cwd(), '..', '..');
  const env = { ...loadDotEnv(path.join(root, '.env')), ...process.env };

  const child = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      MONGODB_URI: env.MONGODB_URI,
      JWT_SECRET: env.JWT_SECRET,
      PORT: '8080',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logBuf = '';
  child.stdout.on('data', (d) => {
    logBuf += d.toString();
  });
  child.stderr.on('data', (d) => {
    logBuf += d.toString();
  });

  try {
    const up = await waitForHealth('http://localhost:8080/health', 30000);
    if (!up) {
      throw new Error('Server health check timeout');
    }

    const counts = await runWsScenario(8080);
    const pass = counts.callStarted >= 1 && counts.agentDelta >= 1 && counts.errors === 0;

    console.log('E2E_COUNTS', counts);
    console.log('E2E_RESULT', pass ? 'PASS' : 'FAIL');
    if (!pass) {
      console.log('SERVER_LOG_TAIL', logBuf.slice(-2000));
      process.exitCode = 1;
    }
  } finally {
    child.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error('E2E_ERROR', e.message);
  process.exit(1);
});
