import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { connectMongo } from './lib/mongo';
import { verifyToken } from './lib/jwt';
import { handleWSConnection } from './websocket/handler';

dotenv.config();

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

  // CORS 설정
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Tohwa server is running' });
  });

  wss.on('connection', (ws, req) => {
    // 1) Prefer httpOnly cookie token
    const cookies = parseCookies(req.headers.cookie);
    const rawToken = cookies.token;

    // 2) Also allow token via querystring (?token=...)
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
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
          message: 'Connected to Tohwa WebSocket Server',
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
💎 Tohwa Server
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

