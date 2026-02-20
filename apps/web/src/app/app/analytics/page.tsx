'use client';

import { useEffect, useMemo, useState } from 'react';

type AnalyticsResponse = {
  metrics: {
    totalMinutes: number;
    avgRating: number | null;
    completionRate: number;
    avgCallSec: number;
    totalConversations: number;
  };
  dayCounts: { date: string; label: string; count: number }[];
  intentBreakdown: { intent: string; count: number; percent: number }[];
};

type Period = 'day' | 'week' | 'month';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('day');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics', { cache: 'no-store' });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        setData(await res.json());
      } catch (e) {
        console.error(e);
        setError('분석 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartCounts = useMemo(() => {
    const raw = data?.dayCounts || [];
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

  const maxDayCount = useMemo(() => Math.max(...(chartCounts.map((d) => d.count) || [1])), [chartCounts]);
  const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-white/10" />
          <div className="h-72 rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">분석</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <Card title="총 상담 분" value={(data?.metrics.totalMinutes || 0).toLocaleString()} sub={`총 상담 ${data?.metrics.totalConversations || 0}건 기준`} />
        <Card title="완료율" value={`${data?.metrics.completionRate || 0}%`} sub="완료 예약(확정+완료) / 총 상담" />
        <Card title="평균 통화 시간" value={fmtSec(data?.metrics.avgCallSec || 0)} sub="분:초" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/15 bg-[#171d27] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              {period === 'day' ? '일 단위 상담 수' : period === 'week' ? '주 단위 상담 수' : '월 단위 상담 수'}
            </h2>
            <div className="flex gap-2">
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
                      ? 'bg-[#2bbf4b] text-white border-[#2bbf4b]'
                      : 'bg-transparent text-white/75 border-white/20 hover:border-white/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1623] to-[#0d131d] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="h-full grid grid-rows-5">
              {[3, 2, 1, 0].map((row) => (
                <div key={row} className="border-t border-white/10" />
              ))}
            </div>
            <div className="-mt-80 h-80 flex items-end justify-around gap-2">
              {chartCounts.map((d) => {
                const h = Math.max(10, Math.round((d.count / maxDayCount) * 190));
                return (
                  <div key={d.date} className="flex flex-col items-center w-full max-w-[62px]">
                    <div className="text-xs text-white/80 mb-1 font-semibold">{d.count}</div>
                    <div className="w-full rounded-xl border border-white/10 bg-white/5 p-1 shadow-[0_8px_20px_rgba(34,197,94,0.2)]">
                      <div
                        className="w-full rounded-lg bg-gradient-to-t from-[#15803d] via-[#22c55e] to-[#86efac] shadow-[0_10px_22px_rgba(34,197,94,0.32)]"
                        style={{ height: `${h}px` }}
                      />
                    </div>
                    <div className="text-[11px] text-white/60 mt-2">{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-[#171d27] p-5">
          <h2 className="text-lg font-semibold mb-4 text-white">상담 의도 분석</h2>
          {(data?.intentBreakdown || []).length === 0 ? (
            <p className="text-white/60">의도 데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {data?.intentBreakdown.map((row) => (
                <li key={row.intent} className="flex justify-between p-2.5 rounded-xl border border-white/10 bg-[#11161f] text-sm text-white/90">
                  <span>{row.intent}</span>
                  <span className="font-bold text-white">{row.percent}% ({row.count})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-[#171d27] p-5">
      <p className="text-white/65 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/55 mt-2">{sub}</p>
    </div>
  );
}
