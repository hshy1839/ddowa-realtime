'use client';

import { useEffect, useRef, useState } from 'react';

interface WSMessage {
  type: string;
  [key: string]: any;
}

export default function CallPage() {
  const [conversationId, setConversationId] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [sttText, setSttText] = useState('');
  const [agentText, setAgentText] = useState('');
  const [geminiHealth, setGeminiHealth] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const conversationIdRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7777';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data) as WSMessage;

      if (message.type === 'gemini.health') {
        setGeminiHealth(message.ok ? 'Gemini OK' : `Gemini FAIL: ${message.message || message.status}`);
        return;
      }

      if (message.type === 'call.started') {
        conversationIdRef.current = message.conversationId;
        setConversationId(message.conversationId);
        setIsCallActive(true);
        startStreaming();
      } else if (message.type === 'stt.delta') {
        setSttText((prev) => prev + (message.textDelta || ''));
      } else if (message.type === 'agent.delta') {
        setAgentText((prev) => prev + (message.textDelta || ''));
      } else if (message.type === 'tts.audio') {
        playAudio(message.pcm16ChunkBase64);
      } else if (message.type === 'call.ended') {
        setIsCallActive(false);
        stopStreaming();
        console.log('Call ended:', message);
      } else if (message.type === 'error') {
        console.error('WebSocket error:', message);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      stopStreaming();
    };

    return () => {
      stopStreaming();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const startCall = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket not connected');
      return;
    }

    ensureAudioContext();

    // Request mic first; streaming begins after call.started arrives
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('마이크 권한이 필요합니다.');
      return;
    }

    // Reset UI
    setSttText('');
    setAgentText('');
    setGeminiHealth('');

    wsRef.current.send(JSON.stringify({ type: 'call.start' }));
  };

  const stopCall = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'call.stop', conversationId: conversationIdRef.current }));
  };

  const startStreaming = () => {
    if (!micStreamRef.current) return;
    if (!audioContextRef.current) ensureAudioContext();

    // Avoid duplicate processors
    if (processorRef.current) return;

    const audioContext = audioContextRef.current!;
    const source = audioContext.createMediaStreamSource(micStreamRef.current);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processorRef.current = processor;

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!conversationIdRef.current) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);

      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
      }

      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
      ws.send(
        JSON.stringify({
          type: 'audio.chunk',
          conversationId: conversationIdRef.current,
          pcm16ChunkBase64: base64,
          seq: Date.now(),
          sampleRate: 16000,
        })
      );
    };
  };

  const stopStreaming = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    conversationIdRef.current = '';
  };

  const playAudio = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 16000);
      const channelData = audioBuffer.getChannelData(0);

      const pcm16 = new Int16Array(bytes.buffer);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">실시간 상담</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">상담 제어</h2>

          <div className="mb-4">
            <p className="text-slate-400">
              상태: <span className="font-semibold">{isCallActive ? '진행 중' : '대기 중'}</span>
            </p>
            {conversationId && <p className="text-slate-400 text-sm">ID: {conversationId.slice(0, 8)}...</p>}
            {geminiHealth && <p className="text-slate-400 text-sm">{geminiHealth}</p>}
          </div>

          <div className="flex gap-4">
            <button
              onClick={startCall}
              disabled={isCallActive}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded font-semibold"
            >
              상담 시작
            </button>
            <button
              onClick={stopCall}
              disabled={!isCallActive}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 rounded font-semibold"
            >
              상담 종료
            </button>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">실시간 자막</h2>

          <div className="mb-4">
            <p className="text-slate-400 mb-2">사용자:</p>
            <div className="bg-slate-700 p-3 rounded min-h-[60px] text-sm">{sttText || '...'}</div>
          </div>

          <div>
            <p className="text-slate-400 mb-2">상담사:</p>
            <div className="bg-slate-700 p-3 rounded min-h-[60px] text-sm">{agentText || '...'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
