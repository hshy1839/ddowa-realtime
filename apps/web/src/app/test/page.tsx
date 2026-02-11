'use client';

import { useEffect, useState, useRef } from 'react';

export default function TestPage() {
  const [wsStatus, setWsStatus] = useState('연결 중...');
  const [messages, setMessages] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7777';
    console.log('🔗 WebSocket URL:', wsUrl);
    setMessages([`🔗 연결 시도: ${wsUrl}`]);

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✓ WebSocket Connected!');
      setWsStatus('✓ 연결됨');
      setMessages((prev) => [...prev, '✓ WebSocket 연결 성공']);
    };

    wsRef.current.onmessage = (event) => {
      console.log('📨 Message:', event.data);
      setMessages((prev) => [...prev, `📨 수신: ${event.data.substring(0, 100)}`]);
    };

    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket Error:', error);
      setWsStatus('❌ 오류');
      setMessages((prev) => [...prev, `❌ 오류: ${String(error)}`]);
    };

    wsRef.current.onclose = () => {
      console.log('✗ WebSocket Closed');
      setWsStatus('✗ 닫힘');
      setMessages((prev) => [...prev, '✗ WebSocket 연결 종료']);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'call.start', workspaceSlug: 'test' }));
      setMessages((prev) => [...prev, '📤 전송: call.start']);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 WebSocket 테스트</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>상태:</strong> <span style={{ color: wsStatus.includes('✓') ? 'green' : 'red' }}>{wsStatus}</span>
      </div>

      <button 
        onClick={sendMessage}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          cursor: 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        📞 상담 시작 (call.start)
      </button>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        <strong>메시지 로그:</strong>
        <div>
          {messages.map((msg, index) => (
            <div key={index} style={{ marginTop: '5px', fontSize: '12px' }}>
              {msg}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>디버깅 팁:</strong></p>
        <ul>
          <li>F12를 눌러서 개발자 도구 콘솔을 확인하세요</li>
          <li>NEXT_PUBLIC_WS_URL 환경변수 확인: {process.env.NEXT_PUBLIC_WS_URL}</li>
          <li>Express 서버가 포트 7777에서 실행 중인지 확인하세요</li>
        </ul>
      </div>
    </div>
  );
}
