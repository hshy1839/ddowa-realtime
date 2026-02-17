'use client';

import { useEffect, useState } from 'react';

interface Contact {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  tags: string[];
  lastSeenAt?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
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
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const selected = contacts.find((c) => c._id === selectedId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
      <div className="xl:col-span-1 space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">연락처</h1>

        <div className="bg-white p-4 rounded-2xl border border-black/10">
          <p className="text-sm font-semibold mb-3">새 연락처 추가</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="이름"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
            />
            <input
              type="email"
              placeholder="이메일"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
            />
            <input
              type="tel"
              placeholder="전화번호"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-black/20 bg-white"
            />
            <button onClick={handleAddContact} className="w-full px-4 py-2.5 rounded-xl bg-black text-white hover:bg-black/85">
              추가
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
          {contacts.map((contact) => (
            <div
              key={contact._id}
              onClick={() => setSelectedId(contact._id)}
              className={`p-4 rounded-xl cursor-pointer border transition ${
                selectedId === contact._id ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black/40'
              }`}
            >
              <p className="font-semibold">{contact.name || 'Unknown'}</p>
              <p className={`text-sm ${selectedId === contact._id ? 'text-white/75' : 'text-black/60'}`}>{contact.email}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:col-span-2">
        {selected ? (
          <div className="bg-white p-6 rounded-2xl border border-black/10 min-h-[360px]">
            <h2 className="text-2xl font-bold mb-6">연락처 상세</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-black/50 text-sm">이름</p>
                <p className="font-semibold mt-1">{selected.name || '-'}</p>
              </div>
              <div>
                <p className="text-black/50 text-sm">이메일</p>
                <p className="font-semibold mt-1">{selected.email || '-'}</p>
              </div>
              <div>
                <p className="text-black/50 text-sm">전화번호</p>
                <p className="font-semibold mt-1">{selected.phone || '-'}</p>
              </div>
              <div>
                <p className="text-black/50 text-sm">마지막 상담</p>
                <p className="font-semibold mt-1">{selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString() : '-'}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-black/50 text-sm mb-2">태그</p>
              <div className="flex flex-wrap gap-2">
                {(selected.tags || []).length === 0 ? (
                  <span className="text-sm text-black/50">태그 없음</span>
                ) : (
                  selected.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg border border-black/20 text-sm">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-black/10 text-center text-black/50 min-h-[360px] grid place-items-center">
            연락처를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
