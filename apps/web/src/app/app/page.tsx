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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      { label: '평균 만족도', value: data?.stats.avgRating != null ? `${data.stats.avgRating}/5` : '-' },
    ],
    [data]
  );

  const trend = data?.trend || [];
  const max = Math.max(...trend.map((x) => x.count), 1);

  if (loading) return <div className="text-white/80">대시보드 로딩 중...</div>;
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

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/15 bg-[#171d27] p-5">
            <p className="text-sm text-white/65 mb-2">{item.label}</p>
            <p className="text-3xl font-extrabold tracking-tight text-white">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="xl:col-span-2 rounded-2xl border border-white/15 p-5 bg-[#171d27]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">최근 7일 상담 추이</h2>
            <span className="text-xs text-white/60">단위: 건</span>
          </div>

          <div className="h-60 flex items-end gap-2 sm:gap-3">
            {trend.map((v) => (
              <div key={v.date} className="flex-1 flex flex-col items-center justify-end gap-2">
                <div className="text-xs text-white/75">{v.count}</div>
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-[#168d35] via-[#22b14c] to-[#6cff92]"
                  style={{ height: `${Math.max(10, Math.round((v.count / max) * 180))}px` }}
                />
                <span className="text-[11px] sm:text-xs text-white/65">{v.label}</span>
              </div>
            ))}
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
