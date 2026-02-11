'use client';

import { useEffect, useState } from 'react';

interface Conversation {
  _id: string;
  contactId?: string;
  status: string;
  durationSec?: number;
  summary?: string;
  intent?: string;
  startedAt: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const selected = conversations.find((c) => c._id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="lg:col-span-1">
        <h1 className="text-3xl font-bold mb-4">받은 메시지</h1>
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv._id}
              onClick={() => setSelectedId(conv._id)}
              className={`p-4 rounded cursor-pointer border ${
                selectedId === conv._id
                  ? 'bg-slate-700 border-blue-500'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="font-semibold">{conv.intent || '상담'}</p>
              <p className="text-sm text-slate-400">{new Date(conv.startedAt).toLocaleString()}</p>
              <p className="text-sm text-slate-400">{conv.durationSec}초</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">상담 상세</h2>

            <div className="space-y-4">
              <div>
                <p className="text-slate-400">ID</p>
                <p className="font-mono text-sm">{selected._id}</p>
              </div>

              <div>
                <p className="text-slate-400">상태</p>
                <p className="font-semibold">{selected.status}</p>
              </div>

              <div>
                <p className="text-slate-400">시간</p>
                <p className="font-semibold">{selected.durationSec} 초</p>
              </div>

              <div>
                <p className="text-slate-400">의도</p>
                <p className="font-semibold">{selected.intent || '-'}</p>
              </div>

              <div>
                <p className="text-slate-400">요약</p>
                <p className="bg-slate-700 p-3 rounded mt-2">{selected.summary || '-'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center text-slate-400">
            상담을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
