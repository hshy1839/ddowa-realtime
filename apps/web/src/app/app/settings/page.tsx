'use client';

import { useEffect, useState } from 'react';

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
  speechRate: number;
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
  speechRate: 1.0,
};

export default function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [newRule, setNewRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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
            <input value={config.companyName} onChange={(e) => setConfig((p) => ({ ...p, companyName: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white" />
          </Field>
          <Field label="대표 전화">
            <input value={config.companyPhone} onChange={(e) => setConfig((p) => ({ ...p, companyPhone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white" />
          </Field>
          <Field label="회사 설명" wide>
            <textarea rows={3} value={config.companyDescription} onChange={(e) => setConfig((p) => ({ ...p, companyDescription: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white" />
          </Field>
          <Field label="웹사이트" wide>
            <input value={config.companyWebsite} onChange={(e) => setConfig((p) => ({ ...p, companyWebsite: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white" />
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
          <Field label="폴백 메시지" wide>
            <input value={config.fallback} onChange={(e) => setConfig((p) => ({ ...p, fallback: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white" />
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
            <input value={newRule} onChange={(e) => setNewRule(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white flex-1" placeholder="새 규칙" />
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
