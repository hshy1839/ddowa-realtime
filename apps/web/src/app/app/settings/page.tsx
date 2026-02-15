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
      if (data?.config) {
        setConfig({ ...defaultConfig, ...data.config });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setSaveMsg('설정 불러오기에 실패했습니다. (로그인/서버 상태 확인)');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMsg('');

      const payload = {
        ...config,
        rules: config.rules.filter(Boolean),
        forbidden: config.forbidden.filter(Boolean),
      };

      const res = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('save failed');

      const data = await res.json();
      if (data?.config) {
        setConfig({ ...defaultConfig, ...data.config });
      }
      await fetchConfig();
      setSaveMsg('저장 완료 ✅');
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">설정</h1>
        {saveMsg && <span className="text-sm text-slate-300">{saveMsg}</span>}
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4">회사 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">회사명</label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="회사명"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">대표 전화</label>
              <input
                type="tel"
                value={config.companyPhone}
                onChange={(e) => setConfig((p) => ({ ...p, companyPhone: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="전화번호"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-2">회사 설명</label>
              <textarea
                value={config.companyDescription}
                onChange={(e) => setConfig((p) => ({ ...p, companyDescription: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="회사/서비스 설명"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-2">웹사이트</label>
              <input
                type="url"
                value={config.companyWebsite}
                onChange={(e) => setConfig((p) => ({ ...p, companyWebsite: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4">상담사 설정</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">상담사 성별(음성 성향)</label>
              <select
                value={config.agentGender}
                onChange={(e) => setConfig((p) => ({ ...p, agentGender: e.target.value as AgentConfig['agentGender'] }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="neutral">중성</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">성격</label>
              <select
                value={config.agentPersonality}
                onChange={(e) => setConfig((p) => ({ ...p, agentPersonality: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="professional">전문적</option>
                <option value="friendly">친근함</option>
                <option value="warm">따뜻함</option>
                <option value="formal">정중함</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">응답 톤</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig((p) => ({ ...p, tone: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="professional">전문적</option>
              <option value="friendly">친근한</option>
              <option value="formal">정중한</option>
              <option value="concise">간결한</option>
            </select>
          </div>


          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">말하기 속도 ({config.speechRate.toFixed(2)}x)</label>
            <input
              type="range"
              min={0.8}
              max={1.2}
              step={0.05}
              value={config.speechRate}
              onChange={(e) => setConfig((p) => ({ ...p, speechRate: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">0.8x 느리게 ~ 1.2x 빠르게</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">폴백 메시지</label>
            <input
              type="text"
              value={config.fallback}
              onChange={(e) => setConfig((p) => ({ ...p, fallback: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              placeholder="도움을 드릴 수 없을 때 메시지"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">응대 규칙</label>
            <div className="space-y-2 mb-3">
              {config.rules.map((rule, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                  <span className="text-sm">{rule}</span>
                  <button
                    onClick={() => setConfig((p) => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))}
                    className="text-red-400 hover:text-red-500 text-sm"
                  >
                    제거
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="새 규칙"
              />
              <button onClick={addRule} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold">
                추가
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded font-semibold"
        >
          {isSaving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
