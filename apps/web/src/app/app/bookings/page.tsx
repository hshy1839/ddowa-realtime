'use client';

import { useEffect, useMemo, useState } from 'react';

type Booking = {
  _id: string;
  startAt: string;
  endAt?: string;
  serviceName?: string;
  memo?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  phone?: string;
  contactName?: string;
};

const statusList: Booking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];

const statusLabel: Record<Booking['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
};

const statusStyle: Record<Booking['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/40',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  completed: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  cancelled: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    startAt: '',
    serviceName: '',
    memo: '',
    phone: '',
    status: 'pending' as Booking['status'],
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings', { cache: 'no-store' });
      const data = await res.json();
      const list = (data.bookings || []) as Booking[];
      setBookings(list);
      if (list.length > 0) {
        const latest = new Date(list[0].startAt);
        setSelectedDate(latest);
        setMonthCursor(new Date(latest.getFullYear(), latest.getMonth(), 1));
      }
    } finally {
      setLoading(false);
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
    setEditing(null);
    setForm({
      startAt: toInputDate(start),
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
      serviceName: b.serviceName || '',
      memo: b.memo || '',
      phone: b.phone || '',
      status: b.status,
    });
  };

  const submit = async () => {
    if (!form.startAt) return alert('예약 시간을 입력하세요.');

    const payload = {
      startAt: new Date(form.startAt).toISOString(),
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
    setForm({ startAt: '', serviceName: '', memo: '', phone: '', status: 'pending' });
  };

  const remove = async (id: string) => {
    if (!confirm('예약을 삭제할까요?')) return;
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    await fetchBookings();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-4 lg:gap-5 animate-pulse">
        <section className="rounded-3xl border border-white/15 bg-[#131923] p-4 sm:p-5">
          <div className="h-8 w-52 rounded bg-white/10 mb-4" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/10" />
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-white/15 bg-[#131923] p-4 sm:p-5 space-y-3">
          <div className="h-7 w-40 rounded bg-white/10" />
          <div className="h-24 rounded-xl bg-white/10" />
          <div className="h-24 rounded-xl bg-white/10" />
          <div className="h-44 rounded-2xl bg-white/10" />
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-4 lg:gap-5">
      <section className="rounded-3xl border border-white/15 bg-[#131923] p-4 sm:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
            className="h-8 w-8 rounded-lg border border-white/20 text-white/80 hover:bg-white/10"
          >
            ◀
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-white">
            예약 캘린더 · {monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월
          </h1>
          <button
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
            className="h-8 w-8 rounded-lg border border-white/20 text-white/80 hover:bg-white/10"
          >
            ▶
          </button>
        </div>

        <div className="grid grid-cols-7 text-xs text-white/55 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
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
                className={`h-12 rounded-lg border text-sm relative transition ${
                  isSelected
                    ? 'bg-[#2bbf4b] text-white border-[#2bbf4b] font-semibold'
                    : 'bg-[#1a212d] border-white/10 text-white/90 hover:border-white/35'
                } ${!isCurrentMonth ? 'opacity-35' : ''}`}
              >
                {d.getDate()}
                {has && (
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#2bbf4b]'}`} />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => openCreate(selectedDate)}
          className="mt-4 w-full h-11 rounded-xl bg-[#2bbf4b] text-white font-semibold hover:bg-[#35cf57] transition"
        >
          예약 추가
        </button>
      </section>

      <section className="rounded-3xl border border-white/15 bg-[#131923] p-4 sm:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
        <h2 className="text-lg font-semibold text-white mb-4">
          {selectedDate.toLocaleDateString()} 예약 목록
        </h2>

        <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1 mb-5">
          {selectedDayBookings.length === 0 ? (
            <p className="text-white/55 text-sm rounded-xl border border-white/10 bg-[#1a212d] p-4">예약이 없습니다.</p>
          ) : (
            selectedDayBookings.map((b) => (
              <div key={b._id} className="border border-white/10 bg-[#1a212d] rounded-xl p-3.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{b.serviceName || '서비스'}</p>
                    <p className="text-xs text-white/70 mt-0.5">
                      {new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {b.phone && <p className="text-xs mt-1 text-white/75">전화번호: {b.phone}</p>}
                    {b.memo && <p className="text-sm mt-1.5 text-white/85 break-words">{b.memo}</p>}
                    <span className={`mt-2 inline-flex px-2 py-0.5 rounded-md border text-[11px] ${statusStyle[b.status]}`}>
                      {statusLabel[b.status]}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(b)} className="px-2.5 py-1.5 text-xs rounded-lg border border-white/25 text-white/90 hover:bg-white/10">수정</button>
                    <button onClick={() => remove(b._id)} className="px-2.5 py-1.5 text-xs rounded-lg border border-rose-400/60 text-rose-300 hover:bg-rose-500/10">삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border border-white/12 bg-[#1a212d] rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">{editing ? '예약 수정' : '예약 추가'}</h3>
          <div className="grid sm:grid-cols-1 gap-2 mb-2">
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-white/20 bg-[#0f141d] text-white"
            />
          </div>
          <input
            placeholder="서비스명"
            value={form.serviceName}
            onChange={(e) => setForm((p) => ({ ...p, serviceName: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-[#0f141d] text-white mb-2"
          />
          <input
            placeholder="고객 전화번호 (예: 01012345678)"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-[#0f141d] text-white mb-2"
          />
          <textarea
            placeholder="메모"
            value={form.memo}
            onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-[#0f141d] text-white mb-2"
            rows={3}
          />
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Booking['status'] }))}
            className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-[#0f141d] text-white mb-3"
          >
            {statusList.map((s) => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-[#2bbf4b] text-white font-semibold hover:bg-[#35cf57]">
              {editing ? '수정 저장' : '추가 저장'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); openCreate(selectedDate); }} className="px-4 py-2 rounded-lg border border-white/25 text-white/90 hover:bg-white/10">
                취소
              </button>
            )}
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
