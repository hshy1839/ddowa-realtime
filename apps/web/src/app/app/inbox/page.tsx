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
  status: string;
  durationSec?: number;
  summary?: string;
  intent?: string;
  startedAt: string;
  contactId?: string;
  messages?: MessageItem[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/conversations', { cache: 'no-store' });
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data?.conversations?.length) setSelectedId(data.conversations[0]._id);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    })();
  }, []);

  const deleteConversation = async (conversationId: string) => {
    const ok = window.confirm('삭제하시겠습니까?');
    if (!ok) return;

    try {
      setDeletingId(conversationId);
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '삭제 실패');
      setConversations((prev) => {
        const next = prev.filter((c) => c._id !== conversationId);
        setSelectedId(next[0]?._id || null);
        return next;
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
    <div className="h-[calc(100vh-140px)] min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="lg:col-span-1 rounded-2xl border border-white/15 bg-[#11151d] p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">받은 메시지</h1>
        <div className="space-y-2">
          {conversations.map((conv) => {
            const preview = conv.messages?.[conv.messages.length - 1]?.text || conv.summary || '(메시지 없음)';
            return (
              <div key={conv._id} onClick={() => setSelectedId(conv._id)} className={`p-3 rounded-xl cursor-pointer border transition ${selectedId === conv._id ? 'bg-[#1d2430] text-white border-[#2bbf4b]/60 shadow-[0_0_0_1px_rgba(43,191,75,0.35)]' : 'bg-[#151b24] border-white/10 hover:border-white/30 text-white'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-white">{conv.intent || '상담'}</p>
                    <p className="text-xs text-white/70">{new Date(conv.startedAt).toLocaleString()}</p>
                    <p className="text-[11px] mt-1 font-mono break-all text-white/65">contactId: {conv.contactId || '-'}</p>
                    <p
                      className="text-sm mt-1 break-words overflow-hidden text-white/90"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}
                    >
                      {preview}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv._id);
                    }}
                    disabled={deletingId === conv._id}
                    className="px-2 py-1 text-xs rounded-lg border border-red-400/60 bg-red-500/10 text-red-400 disabled:opacity-50"
                  >
                    {deletingId === conv._id ? (
                      '…'
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lg:col-span-2 rounded-2xl border border-white/15 bg-[#0f1115] p-4 flex flex-col min-h-0 overflow-hidden">
        {selected ? (
          <>
            <div className="mb-3 rounded-xl bg-[#151922] px-4 py-3 border border-white/15">
              <p className="font-semibold text-white">{selected.intent || '상담'}</p>
              <p className="text-xs text-white/70">{new Date(selected.startedAt).toLocaleString()} · {selected.durationSec || 0}초</p>
              <p className="text-[11px] text-white/65 font-mono mt-1 break-all">contactId: {selected.contactId || '-'}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1">
              {(selected.messages || []).map((msg, idx) => {
                const isUser = msg.role === 'user';
                const dateLabel = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
                const prev = selected.messages?.[idx - 1];
                const prevDateLabel = prev?.createdAt ? new Date(prev.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
                const showDateDivider = idx === 0 || dateLabel !== prevDateLabel;

                return (
                  <div key={msg._id}>
                    {showDateDivider && <div className="flex justify-center my-3"><span className="text-[11px] bg-white px-2 py-1 rounded-full border border-black/10 text-black/55">{dateLabel}</span></div>}
                    <div className={`flex items-end gap-2 min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2bbf4b] to-[#1a7f31] text-[11px] font-bold text-white grid place-items-center">AI</div>}
                      <div className={`max-w-[82%] sm:max-w-[76%] min-w-0 rounded-2xl px-3.5 py-2.5 shadow-sm ${isUser ? 'bg-gradient-to-r from-[#168d35] via-[#22b14c] to-[#39d866] text-white rounded-br-md' : 'bg-[#262b36] text-white rounded-bl-md border border-white/10'}`}>
                        {!isUser && <p className="text-[11px] text-white/60 mb-1">또와AI</p>}
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-6">{msg.text || '(빈 메시지)'}</p>
                        <div className={`text-[10px] mt-1 text-white/65 flex items-center gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</span>
                          {isUser && <span>읽음</span>}
                        </div>
                      </div>
                      {isUser && <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#168d35] to-[#39d866] text-white text-[11px] font-bold grid place-items-center">고객</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="h-full grid place-items-center text-black/50">상담을 선택하세요</div>
        )}
      </section>
    </div>
  );
}
