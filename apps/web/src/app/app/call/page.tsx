'use client';

import { useEffect, useRef, useState } from 'react';
import { useMicrophoneInput } from '@/hooks/useMicrophoneInput';

interface WSMessage {
  type: string;
  [key: string]: any;
}

const DEFAULT_PLAYBACK_RATE = 24000;

export default function CallPage() {
  const [conversationId, setConversationId] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [sttText, setSttText] = useState('');
  const [agentText, setAgentText] = useState('');
  const [geminiHealth, setGeminiHealth] = useState<string>('');
  const [wsReady, setWsReady] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  const wsRef = useRef<WebSocket | null>(null);
  const speechRateRef = useRef(1.0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const conversationIdRef = useRef<string>('');
  const nextPlaybackTimeRef = useRef(0);

  const { isRecording, startRecording, stopRecording, error: micError, volumeLevel } = useMicrophoneInput((pcm16Base64, sampleRate, seq) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !conversationIdRef.current) return;
    ws.send(JSON.stringify({ type: 'audio.chunk', conversationId: conversationIdRef.current, pcm16ChunkBase64: pcm16Base64, seq, sampleRate }));
  });

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7777';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => setWsReady(true);
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data) as WSMessage;
      if (message.type === 'gemini.health') return setGeminiHealth(message.ok ? 'Gemini OK' : `Gemini FAIL: ${message.message || message.status}`);
      if (message.type === 'call.started') {
        conversationIdRef.current = message.conversationId;
        setConversationId(message.conversationId);
        setSpeechRate(Number(message.speechRate) || 1.0);
        setIsCallActive(true);
      } else if (message.type === 'stt.delta') setSttText(message.textDelta || '');
      else if (message.type === 'agent.delta') setAgentText(message.textDelta || '');
      else if (message.type === 'tts.audio') playAudio(message.pcm16ChunkBase64, message.sampleRate);
      else if (message.type === 'call.ended') {
        setIsCallActive(false);
        stopRecording();
        conversationIdRef.current = '';
      }
    };

    wsRef.current.onclose = () => {
      setWsReady(false);
      stopRecording();
      conversationIdRef.current = '';
    };

    return () => {
      stopRecording();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    return audioContextRef.current;
  };

  const startCall = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return alert('WebSocket not connected');
    setSttText('');
    setAgentText('');
    setGeminiHealth('');
    nextPlaybackTimeRef.current = 0;
    await ensureAudioContext();
    await startRecording();
    wsRef.current.send(JSON.stringify({ type: 'call.start' }));
  };

  const stopCall = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'call.stop', conversationId: conversationIdRef.current }));
  };

  const playAudio = async (base64: string, sampleRate?: number) => {
    try {
      const audioContext = await ensureAudioContext();
      const rate = Number(sampleRate) || DEFAULT_PLAYBACK_RATE;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const pcm16 = new Int16Array(bytes.buffer);
      const channelData = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768;
      const buffer = audioContext.createBuffer(1, channelData.length, rate);
      buffer.copyToChannel(channelData, 0);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speechRateRef.current;
      source.connect(audioContext.destination);
      const now = audioContext.currentTime;
      const lead = 0.04;
      const startAt = Math.max(now + lead, nextPlaybackTimeRef.current || now + lead);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + buffer.duration / Math.max(0.8, speechRateRef.current);
    } catch (error) {
      console.error('Audio playback failed', error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold">실시간 상담</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-black/10">
          <h2 className="text-xl font-bold mb-4">상담 제어</h2>
          <div className="mb-4 text-sm space-y-1 text-black/70">
            <p>상태: <span className="font-semibold text-black">{isCallActive ? '진행 중' : '대기 중'}</span></p>
            <p>WebSocket: {wsReady ? '✅ 연결됨' : '❌ 연결 안 됨'}</p>
            <p>마이크: {isRecording ? '✅ 송출 중' : '⏸️ 정지'}</p>
            <p>입력 레벨: {volumeLevel}%</p>
            {conversationId && <p>📞 ID: {conversationId.slice(0, 8)}...</p>}
            <p>🗣️ 말하기 속도: {speechRate.toFixed(2)}x</p>
            {geminiHealth && <p className={geminiHealth.includes('OK') ? 'text-green-600' : 'text-red-500'}>🏥 {geminiHealth}</p>}
            {micError && <p className="text-red-500">🎙️ {micError}</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={startCall} disabled={isCallActive} className="px-5 py-2.5 rounded-xl bg-black text-white disabled:opacity-40">상담 시작</button>
            <button onClick={stopCall} disabled={!isCallActive} className="px-5 py-2.5 rounded-xl border border-black/20 disabled:opacity-40">상담 종료</button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/10">
          <h2 className="text-xl font-bold mb-4">실시간 자막</h2>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-black/60 text-sm">👤 사용자 (STT)</p>
              <button onClick={() => setSttText('')} className="text-xs px-2 py-1 rounded-lg border border-black/20">삭제</button>
            </div>
            <div className="bg-black/[0.03] p-4 rounded-xl min-h-[88px] text-sm max-h-[220px] overflow-y-auto">{sttText || <span className="text-black/45">입력 대기 중...</span>}</div>
          </div>

          <div>
            <p className="text-black/60 text-sm mb-2">🤖 상담사 (Agent)</p>
            <div className="bg-black text-white p-4 rounded-xl min-h-[88px] text-sm max-h-[150px] overflow-y-auto">{agentText || <span className="text-white/55">상담사 응답 대기 중...</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
