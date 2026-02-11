import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tohwa server is running' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('✓ WebSocket client connected');
  let conversationId = '';
  
  // Send welcome message immediately
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Tohwa WebSocket Server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', JSON.stringify(message).substring(0, 100));
      
      if (message.type === 'call.start') {
        conversationId = `conv_${Date.now()}`;
        console.log('📞 Call started:', conversationId);
        ws.send(JSON.stringify({ 
          type: 'call.started', 
          conversationId,
          timestamp: new Date().toISOString()
        }));
      } else if (message.type === 'audio.chunk') {
        // Just acknowledge audio chunks
        // In production, would process audio here
      } else if (message.type === 'call.stop') {
        console.log('📞 Call ended:', conversationId);
        ws.send(JSON.stringify({ 
          type: 'call.ended', 
          conversationId,
          summary: 'Call ended successfully',
          intent: 'default',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('✗ WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
});

const PORT = parseInt(process.env.PORT || '8080');

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


