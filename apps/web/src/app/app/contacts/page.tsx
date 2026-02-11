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
      setContacts(data.contacts);
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
      setContacts([...contacts, data.contact]);
      setNewContact({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const selected = contacts.find((c) => c._id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="lg:col-span-1">
        <h1 className="text-3xl font-bold mb-4">연락처</h1>

        <div className="bg-slate-800 p-4 rounded-lg mb-6 border border-slate-700">
          <p className="text-sm font-semibold mb-3">새 연락처 추가</p>
          <input
            type="text"
            placeholder="이름"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-2"
          />
          <input
            type="email"
            placeholder="이메일"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-2"
          />
          <input
            type="tel"
            placeholder="전화번호"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white mb-3"
          />
          <button
            onClick={handleAddContact}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm"
          >
            추가
          </button>
        </div>

        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact._id}
              onClick={() => setSelectedId(contact._id)}
              className={`p-4 rounded cursor-pointer border ${
                selectedId === contact._id
                  ? 'bg-slate-700 border-blue-500'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="font-semibold">{contact.name || 'Unknown'}</p>
              <p className="text-sm text-slate-400">{contact.email}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">연락처 상세</h2>

            <div className="space-y-4">
              <div>
                <p className="text-slate-400">이름</p>
                <p className="font-semibold">{selected.name || '-'}</p>
              </div>

              <div>
                <p className="text-slate-400">이메일</p>
                <p className="font-semibold">{selected.email || '-'}</p>
              </div>

              <div>
                <p className="text-slate-400">전화번호</p>
                <p className="font-semibold">{selected.phone || '-'}</p>
              </div>

              <div>
                <p className="text-slate-400">태그</p>
                <div className="flex gap-2 mt-2">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-blue-700 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {selected.lastSeenAt && (
                <div>
                  <p className="text-slate-400">마지막 상담</p>
                  <p className="font-semibold">
                    {new Date(selected.lastSeenAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center text-slate-400">
            연락처를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
