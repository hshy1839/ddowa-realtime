import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectMongo } from './lib/mongo.js';
import { verifyToken } from './lib/jwt.js';
import { handleWSConnection } from './websocket/handler.js';
import { User, Workspace } from './models/index.js';
import { buildTwimlStreamResponse, findWorkspaceByTwilioNumber, handleTwilioMediaWS, isTwilioMediaPath } from './twilio.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((kv) => {
        const idx = kv.indexOf('=');
        if (idx === -1) return [kv, ''];
        return [kv.slice(0, idx), decodeURIComponent(kv.slice(idx + 1))];
      })
  );
}

async function main() {
  await connectMongo();

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,https://ddowa-realtime.onrender.com')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // CORS 설정
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'ddowa server is running' });
  });


  app.post('/twilio/stream-status', (req, res) => {
    try {
      console.log('[Twilio][stream-status]', JSON.stringify(req.body || {}));
    } catch {}
    return res.sendStatus(204);
  });

  app.post('/twilio/voice', async (req, res) => {
    try {
      const called = String(req.body?.To || '');
      const from = String(req.body?.From || '');
      console.log(`[Twilio][voice] incoming webhook To=${called} From=${from}`);

      const workspaceId = (await findWorkspaceByTwilioNumber(called)) || '';

      if (!workspaceId) {
        res.set('Content-Type', 'text/xml');
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>등록되지 않은 Twilio 번호입니다.</Say></Response>');
      }

      const explicitStream = (process.env.TWILIO_STREAM_WSS_URL || '').trim();

      let streamUrl = explicitStream;
      if (!streamUrl) {
        const base = `${(req.headers['x-forwarded-proto'] as string) || 'https'}://${req.headers.host}`;
        const u = new URL(base);
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        u.pathname = '/twilio/media';
        streamUrl = u.toString();
      }

      const stream = new URL(streamUrl);
      // Twilio media WS에서 query string이 누락되는 케이스가 있어 workspaceId를 path에 포함
      stream.pathname = `/twilio/media/${workspaceId}`;
      if (from) stream.searchParams.set('from', from);
      console.log(`[Twilio][voice] workspaceId=${workspaceId} stream=${stream.toString()}`);

      const callback = `${(req.headers['x-forwarded-proto'] as string) || 'https'}://${req.headers.host}/twilio/stream-status`;
      const twiml = buildTwimlStreamResponse(stream.toString(), callback);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    } catch (e) {
      console.error('[Twilio] voice webhook error:', e);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>일시적 오류가 발생했습니다.</Say></Response>');
    }
  });

  // Auth endpoints
  app.post('/api/auth', async (req, res) => {
    console.log('📍 [AUTH] POST /api/auth 요청 받음');
    console.log('📍 [AUTH] Body:', req.body);
    
    try {
      const { email, password, action } = req.body;

      console.log(`📍 [AUTH] email=${email}, action=${action}`);

      if (!email || !password || !action) {
        console.error('❌ [AUTH] Missing fields');
        return res.status(400).json({ error: 'Missing fields' });
      }

      if (action === 'signup') {
        console.log('📍 [AUTH] 회원가입 시작:', email);
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          console.error('❌ [AUTH] 사용자 이미 존재:', email);
          return res.status(400).json({ error: 'User already exists' });
        }

        const slugBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-_]/g, '');
        const slug = slugBase || `ws-${Date.now()}`;

        console.log('📍 [AUTH] Workspace 생성 중:', slug);
        const workspace = await Workspace.create({
          name: 'My Workspace',
          slug,
          timezone: 'UTC',
        });
        console.log('✓ [AUTH] Workspace 생성됨:', workspace._id);

        console.log('📍 [AUTH] 비밀번호 해싱 중...');
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
          email: email.toLowerCase(),
          passwordHash,
          role: 'admin',
          workspaceId: workspace._id,
        });
        console.log('✓ [AUTH] 사용자 생성됨:', user._id);

        const token = jwt.sign(
          { userId: user._id, email: user.email, workspaceId: workspace._id },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        console.log('✓ [AUTH] 토큰 생성됨');

        return res.json({ token, user: { email: user.email } });
      }

      if (action === 'login') {
        console.log('📍 [AUTH] 로그인 시작:', email);
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          console.error('❌ [AUTH] 사용자 없음:', email);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          console.error('❌ [AUTH] 비밀번호 불일치');
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { userId: user._id, email: user.email, workspaceId: user.workspaceId },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        console.log('✓ [AUTH] 로그인 성공:', email);

        return res.json({ token, user: { email: user.email } });
      }

      console.error('❌ [AUTH] 잘못된 action:', action);
      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('❌ [AUTH] 에러:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (isTwilioMediaPath(url.pathname)) {
      handleTwilioMediaWS(ws, req.url || '/').catch((e) => {
        console.error('[Twilio] media WS init error:', e);
        try {
          ws.close(1011, 'Internal error');
        } catch {}
      });
      return;
    }

    // 1) Prefer httpOnly cookie token
    const cookies = parseCookies(req.headers.cookie);
    const rawToken = cookies.token;

    // 2) Also allow token via querystring (?token=...)
    const tokenFromQuery = url.searchParams.get('token') || undefined;
    const workspaceSlug = url.searchParams.get('workspaceSlug') || undefined;

    const token = verifyToken(rawToken || tokenFromQuery || '');

    // Delegate to the real handler (saves to MongoDB, uses Gemini provider, tools, etc.)
    handleWSConnection(ws, token, workspaceSlug).catch((e) => {
      console.error('[WS] Connection init error:', e);
      try {
        ws.close(1011, 'Internal error');
      } catch {
        // ignore
      }
    });

    // Friendly server-ready ping (clients can show status)
    try {
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to ddowa WebSocket Server',
          timestamp: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
  });

  const PORT = parseInt(process.env.PORT || '7777');

  server.listen(PORT, () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 ddowa Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ HTTP:  http://localhost:${PORT}
✓ WebSocket:  ws://localhost:${PORT}
✓ Health: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  });
}

main().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});

