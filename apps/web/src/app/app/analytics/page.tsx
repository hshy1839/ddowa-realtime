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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const maxDayCount = useMemo(() => Math.max(...(data?.dayCounts?.map((d) => d.count) || [1])), [data]);
  const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  if (loading) return <div className="text-black/60">분석 데이터 로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">분석</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card title="총 상담 분" value={(data?.metrics.totalMinutes || 0).toLocaleString()} sub={`총 상담 ${data?.metrics.totalConversations || 0}건 기준`} />
        <Card title="평균 만족도" value={String(data?.metrics.avgRating ?? '-')} sub={data?.metrics.avgRating ? '5점 만점' : '평점 데이터 없음'} />
        <Card title="완료율" value={`${data?.metrics.completionRate || 0}%`} sub="완료 예약 / 총 상담" />
        <Card title="평균 통화 시간" value={fmtSec(data?.metrics.avgCallSec || 0)} sub="분:초" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-black/10">
          <h2 className="text-lg font-semibold mb-4">지난 7일 상담 수</h2>
          <div className="h-64 flex items-end justify-around gap-2">
            {(data?.dayCounts || []).map((d) => (
              <div key={d.date} className="flex flex-col items-center w-full max-w-[48px]">
                <div className="text-xs text-black/70 mb-1">{d.count}</div>
                <div className="w-full bg-black rounded-t" style={{ height: `${Math.max(6, Math.round((d.count / maxDayCount) * 180))}px` }} />
                <div className="text-[11px] text-black/50 mt-2">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/10">
          <h2 className="text-lg font-semibold mb-4">상담 의도 분석</h2>
          {(data?.intentBreakdown || []).length === 0 ? (
            <p className="text-black/50">의도 데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {data?.intentBreakdown.map((row) => (
                <li key={row.intent} className="flex justify-between p-2.5 rounded-xl border border-black/10 text-sm">
                  <span>{row.intent}</span>
                  <span className="font-bold">{row.percent}% ({row.count})</span>
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
    <div className="bg-white p-5 rounded-2xl border border-black/10">
      <p className="text-black/55 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-black/45 mt-2">{sub}</p>
    </div>
  );
}
