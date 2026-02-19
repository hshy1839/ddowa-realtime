import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket 연결
wss.on('connection', (ws) => {
  console.log('✓ 새로운 WebSocket 클라이언트 연결됨');

  ws.send(JSON.stringify({
    type: 'connection',
    message: 'WebSocket 서버에 연결되었습니다',
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WS]', message.type, message);

      // 에코 응답
      ws.send(JSON.stringify({
        type: 'echo',
        yourMessage: message,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[WS Error]', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    console.log('✗ WebSocket 클라이언트 연결 해제됨');
  });

  ws.on('error', (error) => {
    console.error('[WS Error]', error.message);
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 ddowa Express Server (JavaScript)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Express API:      http://localhost:${PORT}
  WebSocket:        ws://localhost:${PORT}
  Health Check:     http://localhost:${PORT}/health

  📡 WebSocket 준비됨. 클라이언트 연결 대기 중...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  server.close(() => {
    console.log('✓ 서버 종료됨');
    process.exit(0);
  });
});
