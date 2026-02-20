'use client';

import { useEffect, useRef, useState } from 'react';

interface AgentConfig {
  tone: string;
  rules: string[];
  forbidden: string[];
  fallback: string;
  toolsEnabled: string[];
  agentGender: 'female' | 'male' | 'neutral';
  agentPersonality: string;
  companyName: string;
  companyDescription: string;
  companyPhone: string;
  companyWebsite: string;
  twilioPhoneNumber: string;
  speechRate: number;
  micInputGain: number;
  micNoiseGate: number;
  micSelfMonitor: boolean;
}

const defaultConfig: AgentConfig = {
  tone: 'professional',
  rules: [],
  forbidden: [],
  fallback: '죄송합니다. 해당 내용은 확인 후 다시 안내드릴게요.',
  toolsEnabled: ['getBusinessInfo', 'listAvailability', 'createBooking', 'getPaymentLink'],
  agentGender: 'neutral',
  agentPersonality: 'professional',
  companyName: '',
  companyDescription: '',
  companyPhone: '',
  companyWebsite: '',
  twilioPhoneNumber: '',
  speechRate: 1.0,
  micInputGain: 1.0,
  micNoiseGate: 0.0,
  micSelfMonitor: false,
};

export default function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [newRule, setNewRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isMicTestOn, setIsMicTestOn] = useState(false);

  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micTestAudioContextRef = useRef<AudioContext | null>(null);
  const micTestSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micTestGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/agent-config', { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = await res.json();
      if (data?.config) setConfig({ ...defaultConfig, ...data.config });
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setSaveMsg('설정 불러오기 실패');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMsg('');
      const payload = { ...config, rules: config.rules.filter(Boolean), forbidden: config.forbidden.filter(Boolean) };
      const res = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');
      setSaveMsg('저장 완료 ✅');
      await fetchConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMsg('저장 실패 ❌');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(''), 2500);
    }
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setConfig((prev) => ({ ...prev, rules: [...prev.rules, newRule.trim()] }));
    setNewRule('');
  };


  const stopMicTest = async () => {
    try {
      micTestSourceRef.current?.disconnect();
      micTestGainRef.current?.disconnect();
      micTestStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (micTestAudioContextRef.current) await micTestAudioContextRef.current.close();
    } catch (e) {
      console.error('mic test stop failed', e);
    } finally {
      micTestSourceRef.current = null;
      micTestGainRef.current = null;
      micTestStreamRef.current = null;
      micTestAudioContextRef.current = null;
      setIsMicTestOn(false);
    }
  };

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = Math.min(2.0, Math.max(0.5, Number(config.micInputGain || 1.0)));

      source.connect(gain);
      gain.connect(ctx.destination);

      micTestStreamRef.current = stream;
      micTestAudioContextRef.current = ctx;
      micTestSourceRef.current = source;
      micTestGainRef.current = gain;
      setIsMicTestOn(true);
    } catch (e) {
      console.error('mic test start failed', e);
      alert('마이크 테스트 시작에 실패했습니다. 브라우저 권한을 확인해 주세요.');
      await stopMicTest();
    }
  };

  const toggleMicTest = async () => {
    if (isMicTestOn) await stopMicTest();
    else await startMicTest();
  };

  useEffect(() => {
    if (isMicTestOn && micTestGainRef.current) {
      micTestGainRef.current.gain.value = Math.min(2.0, Math.max(0.5, Number(config.micInputGain || 1.0)));
    }
  }, [config.micInputGain, isMicTestOn]);

  useEffect(() => {
    return () => {
      stopMicTest();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">설정</h1>
        {saveMsg && <span className="text-sm text-black/60">{saveMsg}</span>}
      </div>

      <section className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6">
        <h2 className="text-xl font-bold mb-4">회사 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="회사명">
            <input
              value={config.companyName}
              onChange={(e) => setConfig((p) => ({ ...p, companyName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: 브랜드/상호명 그대로 | 예시: 또화 상담센터"
            />
          </Field>
          <Field label="대표 전화">
            <input
              value={config.companyPhone}
              onChange={(e) => setConfig((p) => ({ ...p, companyPhone: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: 실제 연결번호 1개 | 예시: 010-1234-5678 / 02-123-4567"
            />
          </Field>
          <Field label="Twilio 연결 번호">
            <input
              value={config.twilioPhoneNumber}
              onChange={(e) => setConfig((p) => ({ ...p, twilioPhoneNumber: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: Twilio 구매 번호(E.164 권장) | 예시: +14155552671"
            />
          </Field>
          <Field label="회사 설명" wide>
            <textarea
              rows={3}
              value={config.companyDescription}
              onChange={(e) => setConfig((p) => ({ ...p, companyDescription: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: 누구에게+무엇을+어떻게 (1~2문장) | 예시: 전화 기반 예약 상담을 제공하며 예약 조회/추가/변경/취소를 실시간 처리합니다."
            />
          </Field>
          <Field label="웹사이트" wide>
            <input
              value={config.companyWebsite}
              onChange={(e) => setConfig((p) => ({ ...p, companyWebsite: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: https:// 포함 전체 URL | 예시: https://ddowa.ai"
            />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6">
        <h2 className="text-xl font-bold mb-4">상담사 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="성별(음성 성향)">
            <select value={config.agentGender} onChange={(e) => setConfig((p) => ({ ...p, agentGender: e.target.value as AgentConfig['agentGender'] }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white">
              <option value="female">여성</option><option value="male">남성</option><option value="neutral">중성</option>
            </select>
          </Field>
          <Field label="성격">
            <select value={config.agentPersonality} onChange={(e) => setConfig((p) => ({ ...p, agentPersonality: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white">
              <option value="professional">전문적</option><option value="friendly">친근함</option><option value="warm">따뜻함</option><option value="formal">정중함</option>
            </select>
          </Field>
          <Field label="응답 톤">
            <select value={config.tone} onChange={(e) => setConfig((p) => ({ ...p, tone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white">
              <option value="professional">전문적</option><option value="friendly">친근한</option><option value="formal">정중한</option><option value="concise">간결한</option>
            </select>
          </Field>
          <Field label={`말하기 속도 (${config.speechRate.toFixed(2)}x)`}>
            <input type="range" min={0.8} max={1.2} step={0.05} value={config.speechRate} onChange={(e) => setConfig((p) => ({ ...p, speechRate: Number(e.target.value) }))} className="w-full" />
          </Field>
          <Field label={`마이크 입력 감도 (${config.micInputGain.toFixed(2)}x)`}>
            <input type="range" min={0.5} max={2.0} step={0.05} value={config.micInputGain} onChange={(e) => setConfig((p) => ({ ...p, micInputGain: Number(e.target.value) }))} className="w-full" />
          </Field>
          <Field label={`노이즈 게이트 (${config.micNoiseGate.toFixed(3)})`}>
            <input type="range" min={0} max={0.05} step={0.001} value={config.micNoiseGate} onChange={(e) => setConfig((p) => ({ ...p, micNoiseGate: Number(e.target.value) }))} className="w-full" />
          </Field>
          <Field label="셀프 모니터링(내 목소리 듣기)">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.micSelfMonitor} onChange={(e) => setConfig((p) => ({ ...p, micSelfMonitor: e.target.checked }))} />
                테스트 중 내 마이크를 스피커로 재생
              </label>
              <button
                type="button"
                onClick={toggleMicTest}
                className={`px-3 py-1.5 text-xs rounded-lg border ${isMicTestOn ? 'border-red-300 text-red-600 bg-red-50' : 'border-black/20 hover:bg-black hover:text-white'}`}
              >
                {isMicTestOn ? '테스트 종료' : '테스트'}
              </button>
            </div>
          </Field>
          <Field label="폴백 메시지" wide>
            <input
              value={config.fallback}
              onChange={(e) => setConfig((p) => ({ ...p, fallback: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
              placeholder="형식: 모를 때 고정 응답 1문장 | 예시: 정확한 처리를 위해 고객 전화번호와 희망 날짜/시간을 알려주세요."
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-sm text-black/60 mb-2">응대 규칙</p>
          <div className="space-y-2 mb-3">
            {config.rules.map((rule, i) => (
              <div key={i} className="flex justify-between items-center bg-black/[0.03] border border-black/10 p-2 rounded-xl">
                <span className="text-sm">{rule}</span>
                <button onClick={() => setConfig((p) => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))} className="text-xs px-2 py-1 rounded border border-black/20 hover:bg-black hover:text-white">제거</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newRule} onChange={(e) => setNewRule(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white flex-1" placeholder="형식: 한 줄 1규칙(행동지침) | 예시: 예약 문의는 대표번호로 돌리지 말고 시스템에서 직접 처리한다." />
            <button onClick={addRule} className="px-4 py-2 rounded-xl bg-black text-white">추가</button>
          </div>
        </div>
      </section>

      <button onClick={handleSave} disabled={isSaving} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/85 disabled:opacity-50">
        {isSaving ? '저장 중...' : '설정 저장'}
      </button>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="block text-sm text-black/60 mb-2">{label}</label>
      {children}
    </div>
  );
}
