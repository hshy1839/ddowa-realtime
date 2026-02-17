'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMicrophoneInput } from '@/hooks/useMicrophoneInput';

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface Caption {
  id: string;
  role: 'user' | 'agent';
  text: string;
  isComplete: boolean;
}

const DEFAULT_OUTPUT_SAMPLE_RATE = 24000;

export default function PublicCallPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const [wsStatus, setWsStatus] = useState('연결 중...');
  const [conversationId, setConversationId] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);

  const [userCaption, setUserCaption] = useState<string>('');
  const [agentCaption, setAgentCaption] = useState<string>('');
  const [captions, setCaptions] = useState<Caption[]>([]);

  const [volumeLevel, setVolumeLevel] = useState(0);
  const [micError, setMicError] = useState<string>();
  const [speechRate, setSpeechRate] = useState(1.0);

  const wsRef = useRef<WebSocket | null>(null);
  const speechRateRef = useRef(1.0);
  const captionIdRef = useRef(0);
  const userCaptionRef = useRef('');
  const agentCaptionRef = useRef('');

  // TTS 재생 버퍼(버벅임 방지)
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);

  useEffect(() => {
    userCaptionRef.current = userCaption;
  }, [userCaption]);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    agentCaptionRef.current = agentCaption;
  }, [agentCaption]);

  const { isRecording, startRecording, stopRecording, error: useMicError, volumeLevel: micVolumeLevel } =
    useMicrophoneInput((pcm16Base64, sampleRate, seq) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && isCallActive) {
        wsRef.current.send(
          JSON.stringify({
            type: 'audio.chunk',
            pcm16ChunkBase64: pcm16Base64,
            sampleRate,
            seq,
          })
        );
      }
    });

  useEffect(() => {
    setVolumeLevel(micVolumeLevel);
  }, [micVolumeLevel]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    const u = new URL(wsUrl);
    u.searchParams.set('workspaceSlug', workspaceSlug);

    wsRef.current = new WebSocket(u.toString());

    wsRef.current.onopen = () => {
      setWsStatus('✓ 연결됨');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;

        if (message.type === 'connected') {
          return;
        }

        if (message.type === 'call.started') {
          setConversationId(message.conversationId);
          setIsCallActive(true);
          setUserCaption('');
          setAgentCaption('');
          userCaptionRef.current = '';
          agentCaptionRef.current = '';
          setCaptions([]);
          nextPlaybackTimeRef.current = 0;
          setSpeechRate(Number(message.speechRate) || 1.0);
          return;
        }

        if (message.type === 'call.ended') {
          setIsCallActive(false);
          nextPlaybackTimeRef.current = 0;
          setSpeechRate(Number(message.speechRate) || 1.0);
          return;
        }

        if (message.type === 'stt.delta') {
          const next = mergeCaption(userCaptionRef.current, message.textDelta || '');
          userCaptionRef.current = next;
          setUserCaption(next);
          return;
        }

        if (message.type === 'agent.delta') {
          const next = mergeCaption(agentCaptionRef.current, message.textDelta || '');
          agentCaptionRef.current = next;
          setAgentCaption(next);
          return;
        }

        if (message.type === 'tts.audio' && message.pcm16ChunkBase64) {
          enqueuePcm16Audio(message.pcm16ChunkBase64, Number(message.sampleRate) || DEFAULT_OUTPUT_SAMPLE_RATE);
          return;
        }

        if (message.type === 'agent.complete') {
          const userFinal = userCaptionRef.current.trim();
          const agentFinal = agentCaptionRef.current.trim();

          if (userFinal) {
            setCaptions((prev) => [
              ...prev,
              {
                id: `user_${captionIdRef.current++}`,
                role: 'user',
                text: userFinal,
                isComplete: true,
              },
            ]);
          }

          if (agentFinal) {
            setCaptions((prev) => [
              ...prev,
              {
                id: `agent_${captionIdRef.current++}`,
                role: 'agent',
                text: agentFinal,
                isComplete: true,
              },
            ]);
          }

          userCaptionRef.current = '';
          agentCaptionRef.current = '';
          setUserCaption('');
          setAgentCaption('');
          return;
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };

    wsRef.current.onerror = () => setWsStatus('❌ 오류');
    wsRef.current.onclose = () => setWsStatus('✗ 닫힘');

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, [workspaceSlug]);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const enqueuePcm16Audio = async (base64: string, sampleRate: number) => {
    try {
      const ctx = await ensureAudioContext();
      const int16 = base64ToInt16(base64);
      if (!int16.length) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, sampleRate || DEFAULT_OUTPUT_SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speechRateRef.current;
      source.connect(ctx.destination);

      const safeLeadTime = 0.03;
      const now = ctx.currentTime;
      const startAt = Math.max(now + safeLeadTime, nextPlaybackTimeRef.current);

      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + buffer.duration / Math.max(0.8, speechRateRef.current);

      if (nextPlaybackTimeRef.current - now > 1.5) {
        nextPlaybackTimeRef.current = now + safeLeadTime;
      }
    } catch (e) {
      console.error('❌ TTS enqueue failed:', e);
    }
  };

  const handleStartCall = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('서버 연결이 끊어졌습니다.');
      return;
    }

    setUserCaption('');
    setAgentCaption('');
    userCaptionRef.current = '';
    agentCaptionRef.current = '';
    setCaptions([]);
    captionIdRef.current = 0;
    nextPlaybackTimeRef.current = 0;

    wsRef.current.send(JSON.stringify({ type: 'call.start', workspaceSlug }));

    try {
      await startRecording();
      await ensureAudioContext();
    } catch {
      setMicError('마이크 시작 실패');
    }
  };

  const handleStopCall = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'call.stop', conversationId }));
    stopRecording();
    nextPlaybackTimeRef.current = 0;
  };


  const handleDeleteCaption = (id: string) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDeleteReceived = () => {
    setCaptions((prev) => prev.filter((c) => c.role !== 'agent'));
    setAgentCaption('');
    agentCaptionRef.current = '';
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#f7f7f7] text-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-2">🤖 Tohwa AI 상담</h1>
        <p className="text-black/55">실시간 음성 상담 및 자막 서비스</p>
        <p className="text-xs text-slate-500 mt-1">상담사 음성 속도: {speechRate.toFixed(2)}x</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleDeleteReceived}
            className="px-3 py-1.5 text-xs rounded-xl border border-black/20 hover:bg-black hover:text-white transition"
          >
            받은 메시지 삭제
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-black/10 rounded-2xl p-5 mb-4">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <span className="text-black/55">상태: </span>
              <span
                className={`font-bold ${
                  wsStatus.includes('✓') && wsStatus.includes('연결')
                    ? 'text-green-600'
                    : wsStatus.includes('오류')
                    ? 'text-red-400'
                    : 'text-black'
                }`}
              >
                {wsStatus}
              </span>
            </div>
            {isCallActive && (
              <div className="text-green-400 animate-pulse">🔴 {isRecording ? '마이크 입력 중...' : '대기 중...'}</div>
            )}
          </div>

          {conversationId && (
            <div className="text-sm text-black/55">
              대화 ID: <span className="text-cyan-400">{conversationId.slice(0, 12)}...</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-black/10 rounded-2xl p-5 mb-4">
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleStartCall}
              disabled={isCallActive}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              📞 상담 시작
            </button>
            <button
              onClick={handleStopCall}
              disabled={!isCallActive}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              🛑 상담 종료
            </button>
          </div>

          {isCallActive && (
            <div className="mb-4">
              <div className="text-sm text-black/55 mb-2">마이크 레벨</div>
              <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full transition-all" style={{ width: `${volumeLevel}%` }} />
              </div>
            </div>
          )}

          {(micError || useMicError) && <div className="text-red-400 text-sm mb-2">⚠️ {micError || useMicError}</div>}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-black/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-blue-300">👤 사용자</h2>
            <div className="min-h-20 max-h-40 overflow-y-auto bg-black/[0.03] p-4 rounded-xl">
              <p className="text-black text-lg">{userCaption || <span className="text-slate-500">음성을 인식 중입니다...</span>}</p>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4 text-purple-300">🤖 상담사 AI</h2>
            <div className="min-h-20 max-h-40 overflow-y-auto bg-black/[0.03] p-4 rounded-xl">
              <p className="text-black text-lg">
                {agentCaption || <span className="text-slate-500">응답을 기다리는 중입니다...</span>}
                {agentCaption && <span className="animate-pulse">▌</span>}
              </p>
            </div>
          </div>
        </div>

        {captions.length > 0 && (
          <div className="bg-white border border-black/10 rounded-2xl p-5 mt-5">
            <h2 className="text-lg font-semibold mb-4">📋 대화 기록</h2>
            <div className="bg-[#eef2f5] p-4 rounded-xl h-96 overflow-y-auto space-y-4">
              {captions.map((caption) => (
                <div
                  key={caption.id}
                  className={`p-3 rounded ${
                    caption.role === 'user' ? 'bg-blue-900/40 border-l-4 border-blue-500' : 'bg-purple-900/40 border-l-4 border-purple-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-black/55 mb-1">
                    <span>{caption.role === 'user' ? '👤 사용자' : '🤖 상담사'}</span>
                    <button
                      onClick={() => handleDeleteCaption(caption.id)}
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="text-black break-words">{caption.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-white border border-black/10 rounded-xl text-sm text-black/70">
          <p>
            💡 <strong>팁:</strong> 상담 시작 후 말하면 사용자 자막이 올라오고, AI 음성/자막이 실시간으로 이어집니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function mergeCaption(prev: string, incomingRaw: string): string {
  const incoming = (incomingRaw || '').trim();
  if (!incoming) return prev;
  if (!prev) return incoming;

  // Gemini가 전체 누적 텍스트를 보낼 때
  if (incoming.startsWith(prev)) return incoming;
  // 간헐적으로 더 짧은 스냅샷이 오면 기존 유지
  if (prev.startsWith(incoming)) return prev;

  // delta로 들어오면 append
  const joiner = /\s$/.test(prev) || /^\s/.test(incoming) ? '' : ' ';
  return `${prev}${joiner}${incoming}`;
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}
