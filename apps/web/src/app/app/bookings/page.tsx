'use client';

import { useEffect, useMemo, useState } from 'react';

type Booking = {
  _id: string;
  startAt: string;
  endAt: string;
  serviceName?: string;
  memo?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  phone?: string;
  contactName?: string;
};

const statusList: Booking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    startAt: '',
    endAt: '',
    serviceName: '',
    memo: '',
    phone: '',
    status: 'pending' as Booking['status'],
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const res = await fetch('/api/bookings', { cache: 'no-store' });
    const data = await res.json();
    const list = (data.bookings || []) as Booking[];
    setBookings(list);
    // 예약이 있으면 가장 최근 예약 날짜로 자동 이동(조회 누락 체감 방지)
    if (list.length > 0) {
      const latest = new Date(list[0].startAt);
      setSelectedDate(latest);
      setMonthCursor(new Date(latest.getFullYear(), latest.getMonth(), 1));
    }
  };

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const selectedDayBookings = useMemo(() => {
    return bookings
      .filter((b) => dayKey(new Date(b.startAt)) === dayKey(selectedDate))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }, [bookings, selectedDate]);

  const daysInGrid = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const first = new Date(y, m, 1);
    const firstWeekday = first.getDay();
    const start = new Date(y, m, 1 - firstWeekday);
    return Array.from({ length: 42 }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [monthCursor]);

  const hasBookingOn = (d: Date) => bookings.some((b) => dayKey(new Date(b.startAt)) === dayKey(d));

  const openCreate = (day?: Date) => {
    const base = day || selectedDate;
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 0);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 30);
    setEditing(null);
    setForm({
      startAt: toInputDate(start),
      endAt: toInputDate(end),
      serviceName: '1:1 상담',
      memo: '',
      phone: '',
      status: 'pending',
    });
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      startAt: toInputDate(new Date(b.startAt)),
      endAt: toInputDate(new Date(b.endAt)),
      serviceName: b.serviceName || '',
      memo: b.memo || '',
      phone: b.phone || '',
      status: b.status,
    });
  };

  const submit = async () => {
    if (!form.startAt || !form.endAt) return alert('시작/종료 시간을 입력하세요.');

    const payload = {
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      serviceName: form.serviceName,
      memo: form.memo,
      phone: form.phone,
      status: form.status,
    };

    if (editing) {
      await fetch(`/api/bookings/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    await fetchBookings();
    setEditing(null);
    setForm({ startAt: '', endAt: '', serviceName: '', memo: '', phone: '', status: 'pending' });
  };

  const remove = async (id: string) => {
    if (!confirm('예약을 삭제할까요?')) return;
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    await fetchBookings();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
      <section className="bg-white rounded-2xl border border-black/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>◀</button>
          <h1 className="text-lg font-semibold">예약내역 · {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월</h1>
          <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>▶</button>
        </div>

        <div className="grid grid-cols-7 text-xs text-black/50 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInGrid.map((d) => {
            const isCurrentMonth = d.getMonth() === monthCursor.getMonth();
            const isSelected = dayKey(d) === dayKey(selectedDate);
            const has = hasBookingOn(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => {
                  setSelectedDate(d);
                  setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                className={`h-12 rounded-lg border text-sm relative ${
                  isSelected ? 'bg-black text-white border-black' : 'bg-white border-black/10 hover:border-black/40'
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                {d.getDate()}
                {has && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-black'}`} />}
              </button>
            );
          })}
        </div>

        <button onClick={() => openCreate(selectedDate)} className="mt-4 w-full h-10 rounded-xl bg-black text-white">예약 추가</button>
      </section>

      <section className="bg-white rounded-2xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold mb-3">{selectedDate.toLocaleDateString()} 예약 목록</h2>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 mb-4">
          {selectedDayBookings.length === 0 ? (
            <p className="text-black/50 text-sm">예약이 없습니다.</p>
          ) : (
            selectedDayBookings.map((b) => (
              <div key={b._id} className="border border-black/10 rounded-xl p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{b.serviceName || '서비스'}</p>
                    <p className="text-xs text-black/60">
                      {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ~ {new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {b.phone && <p className="text-xs mt-1 text-black/70">전화번호: {b.phone}</p>}
                    {b.memo && <p className="text-sm mt-1 text-black/75">{b.memo}</p>}
                    <p className="text-xs mt-1">상태: {b.status}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="px-2 py-1 text-xs rounded border border-black/20">수정</button>
                    <button onClick={() => remove(b._id)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600">삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border border-black/10 rounded-xl p-3">
          <h3 className="font-medium mb-2">{editing ? '예약 수정' : '예약 추가'}</h3>
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} className="px-3 py-2 rounded-lg border border-black/20" />
            <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} className="px-3 py-2 rounded-lg border border-black/20" />
          </div>
          <input placeholder="서비스명" value={form.serviceName} onChange={(e) => setForm((p) => ({ ...p, serviceName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-black/20 mb-2" />
          <input placeholder="고객 전화번호 (예: 01012345678)" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-black/20 mb-2" />
          <textarea placeholder="메모" value={form.memo} onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-black/20 mb-2" rows={3} />
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Booking['status'] }))} className="w-full px-3 py-2 rounded-lg border border-black/20 mb-3">
            {statusList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-black text-white">{editing ? '수정 저장' : '추가 저장'}</button>
            {editing && <button onClick={() => { setEditing(null); openCreate(selectedDate); }} className="px-4 py-2 rounded-lg border border-black/20">취소</button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function toInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
