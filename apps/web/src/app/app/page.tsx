'use client';

import { useEffect, useMemo, useState } from 'react';

type DashboardData = {
  stats: {
    totalConsultations: number;
    totalContacts: number;
    completedBookings: number;
    avgRating: number | null;
  };
  trend: { date: string; label: string; count: number }[];
  recentActivities: { id: string; text: string; at: string }[];
};

type Period = 'day' | 'week' | 'month';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('day');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
      setError('대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = useMemo(
    () => [
      { label: '총 상담', value: (data?.stats.totalConsultations ?? 0).toLocaleString() },
      { label: '총 연락처', value: (data?.stats.totalContacts ?? 0).toLocaleString() },
      { label: '완료된 예약', value: (data?.stats.completedBookings ?? 0).toLocaleString() },
    ],
    [data]
  );

  const trend = useMemo(() => {
    const raw = data?.trend || [];
    if (period === 'day') return raw;

    const map = new Map<string, { date: string; label: string; count: number }>();

    for (const item of raw) {
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) continue;

      if (period === 'week') {
        const firstDay = new Date(d);
        firstDay.setDate(d.getDate() - d.getDay());
        const key = firstDay.toISOString().slice(0, 10);
        const label = `${firstDay.getMonth() + 1}/${firstDay.getDate()}주`;
        const prev = map.get(key);
        map.set(key, { date: key, label, count: (prev?.count || 0) + item.count });
      } else {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getMonth() + 1}월`;
        const prev = map.get(key);
        map.set(key, { date: `${key}-01`, label, count: (prev?.count || 0) + item.count });
      }
    }

    return Array.from(map.values()).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [data, period]);

  const max = Math.max(...trend.map((x) => x.count), 1);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 h-72 rounded-2xl bg-white/10" />
          <div className="h-72 rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="min-h-[calc(100vh-120px)] rounded-3xl border border-white/15 bg-[#0f131a] p-5 sm:p-7 lg:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">대시보드</h1>
          <p className="text-sm text-white/65 mt-1">실시간 상담/예약 현황</p>
        </div>

        <button
          onClick={fetchDashboard}
          className="h-11 px-5 rounded-xl bg-[#2bbf4b] hover:bg-[#35cf57] text-white text-sm font-semibold transition"
        >
          새로고침
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-7">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/15 bg-[#171d27] p-5">
            <p className="text-sm text-white/65 mb-2">{item.label}</p>
            <p className="text-3xl font-extrabold tracking-tight text-white">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="xl:col-span-2 rounded-2xl border border-white/15 p-5 bg-[#171d27]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              {period === 'day' ? '일 단위 상담 추이' : period === 'week' ? '주 단위 상담 추이' : '월 단위 상담 추이'}
            </h2>
            <div className="flex items-center gap-2">
              {([
                ['day', '일'],
                ['week', '주'],
                ['month', '월'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    period === key
                      ? 'bg-[#2bbf4b] border-[#2bbf4b] text-white'
                      : 'bg-transparent border-white/20 text-white/75 hover:border-white/40'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-xs text-white/60 ml-1">단위: 건</span>
            </div>
          </div>

          <div className="h-80 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1623] to-[#0d131d] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="h-full grid grid-rows-5 gap-0">
              {[3, 2, 1, 0].map((row) => (
                <div key={row} className="border-t border-white/10" />
              ))}
            </div>
            <div className="-mt-80 h-80 flex items-end gap-2 sm:gap-3">
              {trend.map((v) => {
                const h = Math.max(12, Math.round((v.count / max) * 180));
                return (
                  <div key={v.date} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="text-xs text-white/80 font-medium">{v.count}</div>
                    <div className="w-full rounded-xl bg-white/5 p-1 border border-white/10">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-[#15803d] via-[#22c55e] to-[#86efac] shadow-[0_8px_24px_rgba(34,197,94,0.35)]"
                        style={{ height: `${h}px` }}
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs text-white/65">{v.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/15 p-5 bg-[#171d27]">
          <h2 className="text-lg font-semibold mb-4 text-white">최근 활동</h2>
          <ul className="space-y-3 text-sm">
            {(data?.recentActivities || []).length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-[#11161f] p-3 text-white/65">활동 데이터 없음</li>
            ) : (
              data?.recentActivities.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-[#11161f] p-3">
                  <p className="text-white/90 leading-6">{item.text}</p>
                  <p className="text-xs text-white/55 mt-1">{new Date(item.at).toLocaleString()}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}
