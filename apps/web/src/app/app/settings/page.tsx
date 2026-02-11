'use client';

import { useEffect, useState } from 'react';

interface AgentConfig {
  tone: string;
  rules: string[];
  forbidden: string[];
  fallback: string;
  toolsEnabled: string[];
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig>({
    tone: 'professional',
    rules: [],
    forbidden: [],
    fallback: 'I cannot help with that',
    toolsEnabled: [],
  });
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/agent-config');
      const data = await res.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const addRule = () => {
    if (newRule.trim()) {
      setConfig({
        ...config,
        rules: [...config.rules, newRule],
      });
      setNewRule('');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">설정</h1>

      <div className="space-y-6">
        {/* Business Info */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">사업 정보</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">회사명</label>
              <input
                type="text"
                defaultValue="My Company"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="회사명"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">설명</label>
              <textarea
                defaultValue="Professional consultation services"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="설명"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">전화번호</label>
              <input
                type="tel"
                defaultValue="+1234567890"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="전화번호"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">웹사이트</label>
              <input
                type="url"
                defaultValue="https://example.com"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="웹사이트 URL"
              />
            </div>
          </div>
        </div>

        {/* Agent Config */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">상담사 설정</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">톤</label>
              <select
                value={config.tone}
                onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="professional">전문적</option>
                <option value="friendly">친근한</option>
                <option value="formal">정중한</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">폴백 메시지</label>
              <input
                type="text"
                value={config.fallback}
                onChange={(e) => setConfig({ ...config, fallback: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="도움을 드릴 수 없을 때 메시지"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">규칙</label>
              <div className="space-y-2 mb-3">
                {config.rules.map((rule, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                    <span>{rule}</span>
                    <button
                      onClick={() =>
                        setConfig({ ...config, rules: config.rules.filter((_, idx) => idx !== i) })
                      }
                      className="text-red-400 hover:text-red-600"
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
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">활성화된 도구</label>
              <div className="space-y-2">
                {['getBusinessInfo', 'listAvailability', 'createBooking', 'getPaymentLink'].map(
                  (tool) => (
                    <label key={tool} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.toolsEnabled.includes(tool)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              toolsEnabled: [...config.toolsEnabled, tool],
                            });
                          } else {
                            setConfig({
                              ...config,
                              toolsEnabled: config.toolsEnabled.filter((t) => t !== tool),
                            });
                          }
                        }}
                        className="mr-3"
                      />
                      <span className="text-sm">{tool}</span>
                    </label>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold"
        >
          설정 저장
        </button>
      </div>
    </div>
  );
}
