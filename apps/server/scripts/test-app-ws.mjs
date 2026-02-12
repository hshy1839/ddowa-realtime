import WebSocket from 'ws';

const wsUrl = 'ws://localhost:7777/?workspaceSlug=demo';
console.log('Connecting', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('open');
  const msg = { type: 'call.start', workspaceSlug: 'demo' };
  console.log('SEND', JSON.stringify(msg));
  ws.send(JSON.stringify(msg));

  setTimeout(() => {
    console.log('SEND(call.start again)');
    ws.send(JSON.stringify(msg));
  }, 1500);
});

ws.on('message', (d) => {
  const s = d.toString();
  console.log('MSG', s);

  try {
    const j = JSON.parse(s);
    if (j.type === 'call.started') {
      setTimeout(() => {
        const stop = { type: 'call.stop', conversationId: j.conversationId };
        console.log('SEND', JSON.stringify(stop));
        ws.send(JSON.stringify(stop));
      }, 1500);
    }
    if (j.type === 'call.ended') {
      ws.close();
    }
  } catch {
    // ignore
  }
});

ws.on('close', (c, r) => {
  console.log('close', c, r.toString());
});

ws.on('error', (e) => {
  console.log('error', e.message);
});
