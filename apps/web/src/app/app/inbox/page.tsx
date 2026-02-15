'use client';

import { useEffect, useMemo, useState } from 'react';

interface MessageItem {
  _id: string;
  role: 'user' | 'agent';
  text?: string;
  createdAt?: string;
}

interface Conversation {
  _id: string;
  contactId?: string;
  status: string;
  durationSec?: number;
  summary?: string;
  intent?: string;
  startedAt: string;
  messages?: MessageItem[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', { cache: 'no-store' });
      const data = await res.json();
      setConversations(data.conversations || []);
      if (!selectedId && data?.conversations?.length) {
        setSelectedId(data.conversations[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      setDeletingId(conversationId);
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '삭제에 실패했습니다.');
      }

      setConversations((prev) => {
        const nextList = prev.filter((c) => c._id !== conversationId);
        setSelectedId((prevSelected) => {
          if (prevSelected !== conversationId) return prevSelected;
          return nextList[0]?._id || null;
        });
        return nextList;
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('메시지 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const selected = useMemo(() => conversations.find((c) => c._id === selectedId), [conversations, selectedId]);

  return (
    <div className="h-[calc(100vh-120px)] grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 rounded-2xl border border-slate-700 bg-slate-800 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">받은 메시지</h1>

        <div className="space-y-2">
          {conversations.map((conv) => {
            const preview = conv.messages?.[conv.messages.length - 1]?.text || conv.summary || '(메시지 없음)';
            return (
              <div
                key={conv._id}
                onClick={() => setSelectedId(conv._id)}
                className={`p-3 rounded-xl cursor-pointer border transition ${
                  selectedId === conv._id
                    ? 'bg-yellow-100/10 border-yellow-400'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{conv.intent || '상담'}</p>
                    <p className="text-xs text-slate-400">{new Date(conv.startedAt).toLocaleString()}</p>
                    <p className="text-sm text-slate-300 truncate mt-1">{preview}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv._id);
                    }}
                    disabled={deletingId === conv._id}
                    className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
                  >
                    {deletingId === conv._id ? '삭제중...' : '삭제'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-slate-700 bg-[#abc1d1] p-4 flex flex-col">
        {selected ? (
          <>
            <div className="mb-3 rounded-xl bg-white/80 px-4 py-3 text-slate-700">
              <p className="font-semibold">{selected.intent || '상담'}</p>
              <p className="text-xs text-slate-500">
                {new Date(selected.startedAt).toLocaleString()} · {selected.durationSec || 0}초
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(selected.messages || []).length === 0 ? (
                <div className="h-full grid place-items-center text-slate-700">메시지가 없습니다.</div>
              ) : (
                selected.messages?.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const dateLabel = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                    : '';
                  const prev = selected.messages?.[idx - 1];
                  const prevDateLabel = prev?.createdAt
                    ? new Date(prev.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                    : '';
                  const showDateDivider = idx === 0 || dateLabel !== prevDateLabel;

                  return (
                    <div key={msg._id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-3">
                          <span className="text-[11px] text-slate-600 bg-white/70 px-2 py-1 rounded-full">{dateLabel}</span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="h-8 w-8 rounded-full bg-white/90 text-slate-700 text-xs grid place-items-center shadow">
                            AI
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                            isUser
                              ? 'bg-[#ffe600] text-slate-900 rounded-br-md'
                              : 'bg-white text-slate-800 rounded-bl-md'
                          }`}
                        >
                          {!isUser && <p className="text-[11px] text-slate-500 mb-1">상담사</p>}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text || '(빈 메시지)'}</p>
                          <div className={`text-[10px] mt-1 opacity-60 flex items-center gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</span>
                            {isUser && <span>읽음</span>}
                          </div>
                        </div>

                        {isUser && (
                          <div className="h-8 w-8 rounded-full bg-yellow-200 text-slate-700 text-xs grid place-items-center shadow">
                            나
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="h-full grid place-items-center text-slate-700">상담을 선택하세요</div>
        )}
      </div>
    </div>
  );
}
