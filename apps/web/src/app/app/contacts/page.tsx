'use client';

import { useEffect, useMemo, useState } from 'react';

interface Contact {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  tags: string[];
  lastSeenAt?: string;
}

interface BookingLite {
  _id: string;
  startAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  serviceName?: string;
  phone?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cRes, bRes] = await Promise.all([
        fetch('/api/contacts', { cache: 'no-store' }),
        fetch('/api/bookings', { cache: 'no-store' }),
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();

      const contactList = cData.contacts || [];
      setContacts(contactList);
      setBookings((bData.bookings || []) as BookingLite[]);
      if (contactList.length && !selectedId) setSelectedId(contactList[0]._id);
    } catch (error) {
      console.error('Failed to fetch contacts/bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      setContacts((prev) => [data.contact, ...prev]);
      setNewContact({ name: '', email: '', phone: '' });
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const selected = contacts.find((c) => c._id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
    });
    setEditing(false);
  }, [selectedId]);

  const selectedBookings = useMemo(() => {
    if (!selected?.phone) return [];
    const normalized = selected.phone.replace(/\D/g, '');
    return bookings
      .filter((b) => (b.phone || '').replace(/\D/g, '') === normalized)
      .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt))
      .slice(0, 5);
  }, [bookings, selected]);

  const saveContactEdit = async () => {
    if (!selected) return;
    const res = await fetch(`/api/contacts/${selected._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok || !data?.contact) {
      alert('고객 정보 수정에 실패했습니다.');
      return;
    }
    setContacts((prev) => prev.map((c) => (c._id === selected._id ? { ...c, ...data.contact } : c)));
    setEditing(false);
  };

  const deleteContact = async () => {
    if (!selected) return;
    if (!window.confirm('이 고객을 삭제하시겠습니까?')) return;

    const res = await fetch(`/api/contacts/${selected._id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      alert('고객 삭제에 실패했습니다.');
      return;
    }

    setContacts((prev) => {
      const next = prev.filter((c) => c._id !== selected._id);
      setSelectedId(next[0]?._id || null);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-130px)] grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-pulse">
        <div className="rounded-2xl bg-white/10" />
        <div className="rounded-2xl bg-white/10" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-130px)] grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
      {/* left list */}
      <section className="rounded-2xl border border-white/15 bg-[#11151d] text-white overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-[#151b24]">
          <h1 className="font-semibold text-lg">연락처</h1>
        </div>

        <div className="h-[calc(100%-62px)] overflow-y-auto p-2">
          {contacts.map((contact) => {
            const active = selectedId === contact._id;
            const initials = (contact.name || '?').slice(0, 1);
            return (
              <button
                key={contact._id}
                onClick={() => setSelectedId(contact._id)}
                className={`w-full text-left rounded-xl p-3 mb-1 border transition ${
                  active ? 'bg-[#1d2430] border-[#2bbf4b]/60 shadow-[0_0_0_1px_rgba(43,191,75,0.35)]' : 'bg-[#151b24] border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d9e5ff] to-[#c8f1d2] border border-white/15 grid place-items-center font-semibold text-black">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{contact.name || '이름 없음'}</p>
                    <p className="text-xs text-white/70 truncate">{contact.phone || '-'}</p>
                    <p className="text-xs text-white/60 truncate">{contact.email || '-'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* right detail */}
      <section className="rounded-2xl border border-white/15 bg-[#0f1115] text-white overflow-y-auto">
        {selected ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#d9e5ff] to-[#c8f1d2] border border-white/15 grid place-items-center text-lg font-bold text-black">
                  {(selected.name || '?').slice(0, 1)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selected.name || '이름 없음'}</h2>
                  <p className="text-sm text-white/60">고객 상세 정보</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  {editing ? '취소' : '수정'}
                </button>
                <button
                  onClick={deleteContact}
                  className="px-3 py-1.5 rounded-lg border border-red-400/60 text-red-300 text-sm hover:bg-red-500/10"
                >
                  삭제
                </button>
              </div>
            </div>

            {editing ? (
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <div className="sm:col-span-2 rounded-xl border border-white/15 bg-[#151b24] p-3">
                  <p className="text-[11px] text-white/55 mb-1">이름</p>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/20"
                  />
                </div>
                <div className="rounded-xl border border-white/15 bg-[#151b24] p-3">
                  <p className="text-[11px] text-white/55 mb-1">전화번호</p>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/20"
                  />
                </div>
                <div className="rounded-xl border border-white/15 bg-[#151b24] p-3">
                  <p className="text-[11px] text-white/55 mb-1">이메일</p>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    onClick={saveContactEdit}
                    className="px-4 py-2 rounded-lg bg-[#2bbf4b] text-white font-semibold hover:bg-[#35cf57]"
                  >
                    수정 저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <Info label="전화번호" value={selected.phone || '-'} />
                <Info label="이메일" value={selected.email || '-'} />
                <Info label="마지막 접속" value={selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString() : '-'} />
                <Info label="Contact ID" value={selected._id} mono />
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">간략 예약 정보</h3>
              <div className="space-y-2">
                {selectedBookings.length === 0 ? (
                  <div className="rounded-xl border border-white/15 bg-[#151b24] p-3 text-sm text-white/65">예약 내역 없음</div>
                ) : (
                  selectedBookings.map((b) => (
                    <div key={b._id} className="rounded-xl border border-white/15 bg-[#151b24] p-3">
                      <p className="font-medium text-sm">{b.serviceName || '예약'}</p>
                      <p className="text-xs text-white/65 mt-1">{new Date(b.startAt).toLocaleString()}</p>
                      <p className="text-xs mt-1">상태: {b.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full grid place-items-center text-white/55">연락처를 선택하세요</div>
        )}
      </section>

      {/* FAB create */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-7 right-7 z-30 h-14 w-14 rounded-full bg-[#2b6fff] text-white text-3xl leading-none shadow-[0_12px_30px_rgba(43,111,255,0.45)] hover:bg-[#3f7dff]"
      >
        +
      </button>

      {showCreate && (
        <div className="fixed inset-0 z-40 bg-black/50 grid place-items-center p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#11151d] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-3">새 연락처 추가</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="이름"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-[#0f141d] text-white"
              />
              <input
                type="email"
                placeholder="이메일"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-[#0f141d] text-white"
              />
              <input
                type="tel"
                placeholder="전화번호"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-[#0f141d] text-white"
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-white/20 text-white/90">취소</button>
              <button onClick={handleAddContact} className="px-4 py-2 rounded-lg bg-[#2bbf4b] text-white font-semibold">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/15 px-3 py-2 bg-[#151b24]">
      <p className="text-[11px] text-white/55 mb-0.5">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
