'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface WSMessage {
  type: string;
  [key: string]: any;
}

export default function PublicCallPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const [wsStatus, setWsStatus] = useState('연결 중...');
  const [conversationId, setConversationId] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);
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
      try {
        const message = JSON.parse(event.data) as WSMessage;
        console.log('📨 Message:', message.type);
        
        if (message.type === 'connected') {
          setMessages((prev) => [...prev, `✓ 서버 연결 확인됨`]);
        } else if (message.type === 'call.started') {
          setConversationId(message.conversationId);
          setIsCallActive(true);
          setMessages((prev) => [...prev, `📞 상담 시작됨: ${message.conversationId.slice(0, 8)}...`]);
        } else if (message.type === 'call.ended') {
          setIsCallActive(false);
          setMessages((prev) => [...prev, `📞 상담 종료됨`]);
        } else {
          setMessages((prev) => [...prev, `📨 수신: ${JSON.stringify(message).substring(0, 100)}`]);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
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

  const startCall = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('서버 연결이 끊어졌습니다.');
      return;
    }
    
    console.log('📞 Sending call.start');
    wsRef.current.send(JSON.stringify({ type: 'call.start', workspaceSlug }));
    setMessages((prev) => [...prev, '📤 전송: call.start']);
  };

  const stopCall = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('📞 Sending call.stop');
    wsRef.current.send(JSON.stringify({ type: 'call.stop', conversationId }));
    setMessages((prev) => [...prev, '📤 전송: call.stop']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-2">🤖 Tohwa AI 상담</h1>
        <p className="text-slate-400">실시간 WebSocket 상담 서비스</p>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto">
        {/* Status Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <span className="text-slate-400">상태: </span>
            <span 
              className={`font-bold ${
                wsStatus.includes('✓') && wsStatus.includes('연결') 
                  ? 'text-green-400' 
                  : wsStatus.includes('오류') 
                  ? 'text-red-400' 
                  : 'text-yellow-400'
              }`}
            >
              {wsStatus}
            </span>
          </div>

          {conversationId && (
            <div className="text-sm text-slate-400">
              대화 ID: <span className="text-cyan-400">{conversationId}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex gap-3 mb-4">
            <button
              onClick={startCall}
              disabled={isCallActive}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              📞 상담 시작
            </button>
            <button
              onClick={stopCall}
              disabled={!isCallActive}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              🛑 상담 종료
            </button>
          </div>
          <p className="text-sm text-slate-400">
            "{conversationId ? '상담 중입니다' : '상담 시작 버튼을 클릭하세요'}"
          </p>
        </div>

        {/* Message Log */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">📋 메시지 로그</h2>
          <div className="bg-slate-900 p-4 rounded h-64 overflow-y-auto font-mono text-sm space-y-2">
            {messages.length === 0 ? (
              <div className="text-slate-500">메시지가 없습니다...</div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className="text-slate-300">
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-900/50 border border-blue-700/50 rounded-lg text-sm text-slate-300">
          <p>💡 <strong>팁:</strong> F12를 눌러 개발자 도구 콘솔에서 상세 로그를 확인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
