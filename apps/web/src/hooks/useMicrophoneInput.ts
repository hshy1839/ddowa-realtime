import { useState, useRef, useEffect } from 'react';

interface UseMicrophoneInput {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  onAudioChunk?: (pcm16Base64: string, sampleRate: number, seq: number) => void;
  error?: string;
  volumeLevel: number;
}

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SIZE = 2048;

export const useMicrophoneInput = (onAudioChunk?: (pcm16Base64: string, sampleRate: number, seq: number) => void): UseMicrophoneInput => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>();
  const [volumeLevel, setVolumeLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const seqRef = useRef(0);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError(undefined);

      // Initialize AudioContext
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx({ sampleRate: TARGET_SAMPLE_RATE });
        audioContextRef.current = audioContext;
      }

      const audioContext = audioContextRef.current;

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio nodes
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
      const analyzer = audioContext.createAnalyser();
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;

      processorRef.current = processor;
      analyzerRef.current = analyzer;
      silentGainRef.current = silentGain;

      // Setup volume meter  
      analyzer.fftSize = 256;
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      volumeIntervalRef.current = setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round(average)));
      }, 100);

      // Process audio chunks
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const sourceSampleRate = audioContext.sampleRate;

        // Resample to 16kHz for Gemini Live best quality
        const resampled = resampleFloat32(inputData, sourceSampleRate, TARGET_SAMPLE_RATE);

        // Convert Float32 to PCM16
        const pcm16 = floatToPCM16(resampled);
        const base64 = bufferToBase64(pcm16);

        if (onAudioChunk) {
          onAudioChunk(base64, TARGET_SAMPLE_RATE, seqRef.current++);
        }
      };

      // Connect nodes
      source.connect(analyzer);
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err: any) {
      const message = err.name === 'NotAllowedError' 
        ? '마이크 접근 권한이 필요합니다.'
        : err.name === 'NotFoundError'
        ? '마이크를 찾을 수 없습니다.'
        : `오류: ${err.message}`;
      
      setError(message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (analyzerRef.current) {
      analyzerRef.current.disconnect();
      analyzerRef.current = null;
    }

    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    setIsRecording(false);
    setVolumeLevel(0);
    seqRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    onAudioChunk,
    error,
    volumeLevel,
  };
};

// Float32 -> PCM16 변환
function floatToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

function resampleFloat32(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  let pos = 0;
  for (let i = 0; i < outputLength; i++) {
    const nextPos = Math.min(input.length, Math.round((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    while (pos < nextPos) {
      sum += input[pos++];
      count++;
    }
    output[i] = count > 0 ? sum / count : 0;
  }

  return output;
}

// Buffer to Base64
function bufferToBase64(buffer: Int16Array): string {
  const bytes = new Uint8Array(buffer.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
