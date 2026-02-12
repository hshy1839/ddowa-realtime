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
  const [wsReady, setWsReady] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [streamingOn, setStreamingOn] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const conversationIdRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7777';
    console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✅ WebSocket 연결됨');
      setWsReady(true);
    };

    wsRef.current.onmessage = (event) => {
      console.log(`📨 WebSocket 메시지 받음:`, event.data);
      const message = JSON.parse(event.data) as WSMessage;

      if (message.type === 'gemini.health') {
        console.log(`🏥 [GEMINI.HEALTH]`, message);
        setGeminiHealth(message.ok ? 'Gemini OK' : `Gemini FAIL: ${message.message || message.status}`);
        return;
      }

      if (message.type === 'call.started') {
        console.log(`📞 [CALL.STARTED]`, message.conversationId);
        conversationIdRef.current = message.conversationId;
        setConversationId(message.conversationId);
        setIsCallActive(true);
        startStreaming();
      } else if (message.type === 'stt.delta') {
        console.log(`📝 [STT.DELTA]`, message.textDelta);
        setSttText((prev) => prev + (message.textDelta || ''));
      } else if (message.type === 'agent.delta') {
        console.log(`💬 [AGENT.DELTA]`, message.textDelta);
        setAgentText((prev) => prev + (message.textDelta || ''));
      } else if (message.type === 'tts.audio') {
        console.log(`🔊 [TTS.AUDIO] ${message.pcm16ChunkBase64?.length || 0} bytes`);
        playAudio(message.pcm16ChunkBase64);
      } else if (message.type === 'call.ended') {
        console.log(`📴 [CALL.ENDED]`);
        setIsCallActive(false);
        stopStreaming();
        console.log('Call ended:', message);
      } else if (message.type === 'error') {
        console.error('❌ WebSocket error:', message);
      } else {
        console.log(`❓ 알 수 없는 메시지 타입: ${message.type}`, message);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket 에러:', error);
    };

    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket 연결 해제');
      setWsReady(false);
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
      console.error('❌ WebSocket not connected');
      alert('WebSocket not connected');
      return;
    }

    console.log('🎤 상담 시작...');
    ensureAudioContext();

    // Request mic first; streaming begins after call.started arrives
    try {
      console.log('🎙️ 마이크 권한 요청...');
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      console.log('✅ 마이크 권한 획득');
    } catch (error) {
      console.error('❌ 마이크 접근 거부:', error);
      setMicGranted(false);
      alert('마이크 권한이 필요합니다.');
      return;
    }

    // Reset UI
    setSttText('');
    setAgentText('');
    setGeminiHealth('');
    setStreamingOn(false);

    console.log('📤 call.start 메시지 전송');
    wsRef.current.send(JSON.stringify({ type: 'call.start' }));
    console.log('✅ call.start 전송됨');
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

    setStreamingOn(true);

    processor.onaudioprocess = (event) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!conversationIdRef.current) return;

      const inputData = event.inputBuffer.getChannelData(0);
      
      // 마이크 입력 음량 감지
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const isVoiceDetected = rms > 0.01; // 임계값: 0.01
      setIsListening(isVoiceDetected);
      
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
    setStreamingOn(false);

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
      console.log(`🔊 [AUDIO PLAY] 오디오 데이터 수신: ${base64.length} bytes`);
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      console.log(`🔊 [AUDIO] AudioContext state: ${audioContext.state}`);
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        console.warn('⚠️ AudioContext suspended - resuming...');
        audioContext.resume().then(() => console.log('✅ AudioContext resumed'));
      }

      // PCM16 데이터를 Float32로 변환
      const pcm16 = new Int16Array(bytes.buffer);
      const channelData = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0; // Normalize to [-1, 1]
      }

      // OfflineAudioContext 또는 AudioBuffer로 재생
      const audioBuffer = audioContext.createBuffer(1, channelData.length, 16000);
      audioBuffer.copyToChannel(channelData, 0);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      console.log(`🔊 [AUDIO] Playing audio buffer: ${channelData.length / 16000}s`);
      source.start();
      console.log(`✅ [AUDIO] Audio playback started`);
    } catch (error) {
      console.error('❌ [AUDIO] Error playing audio:', error);
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
            <p className="text-slate-400 text-sm">WebSocket: {wsReady ? '✅ 연결됨' : '❌ 연결 안 됨'}</p>
            <p className="text-slate-400 text-sm">마이크: {micGranted ? '✅ 허용됨' : '⏳ 대기/미허용'}</p>
            <p className={`text-sm font-semibold ${streamingOn ? 'text-green-400' : 'text-slate-400'}`}>
              🎙️ {streamingOn ? (isListening ? '✨ 입력 중...' : '⏸️ 대기 중') : '❌ 미활성'}
            </p>
            {conversationId && <p className="text-slate-400 text-sm">📞 ID: {conversationId.slice(0, 8)}...</p>}
            {geminiHealth && <p className={`text-sm ${geminiHealth.includes('OK') ? 'text-green-400' : 'text-red-400'}`}>🏥 {geminiHealth}</p>}
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
            <p className="text-slate-400 mb-2">👤 사용자 (STT):</p>
            <div className="bg-slate-700 p-4 rounded min-h-[80px] text-sm max-h-[150px] overflow-y-auto">
              {sttText || <span className="text-slate-500">입력 대기 중...</span>}
            </div>
          </div>

          <div>
            <p className="text-slate-400 mb-2">🤖 상담사 (Agent):</p>
            <div className="bg-blue-900 p-4 rounded min-h-[80px] text-sm max-h-[150px] overflow-y-auto text-blue-100">
              {agentText ? (
                <span>{agentText}</span>
              ) : (
                <span className="text-slate-500">상담사 응답 대기 중...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
