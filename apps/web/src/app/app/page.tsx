'use client';

import { useEffect } from 'react';

const stats = [
  { label: '총 상담', value: '242' },
  { label: '총 연락처', value: '158' },
  { label: '완료된 예약', value: '47' },
  { label: '평균 만족도', value: '4.8/5' },
];

export default function DashboardPage() {
  useEffect(() => {
    console.log('✓ 대시보드 페이지 로드됨!');
  }, []);

  return (
    <div className="rounded-3xl bg-[#f6f7fb] text-slate-900 p-5 md:p-7 border border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">대시보드</h1>
        <div className="text-xs md:text-sm text-slate-500">오늘 요약</div>
      </div>

      {/* messenger-like board */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* left rail */}
        <section className="xl:col-span-3 rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-semibold mb-3">요약 메뉴</p>
          <div className="space-y-2 text-sm">
            {stats.map((item, idx) => (
              <div
                key={item.label}
                className={`rounded-xl px-3 py-2 border ${
                  idx === 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>
        </section>

        {/* center messages */}
        <section className="xl:col-span-6 rounded-2xl bg-white border border-slate-200 p-4 md:p-5">
          <p className="text-sm font-semibold mb-4">핵심 지표</p>

          <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
            {stats.map((item, idx) => (
              <div key={item.label} className="space-y-1">
                <div className="text-xs text-slate-400">{item.label}</div>
                <div
                  className={`inline-flex items-center rounded-2xl px-4 py-2.5 text-base md:text-lg font-semibold border ${
                    idx % 2 === 0
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-[#e8ecff] border-[#cdd7ff] text-indigo-700 ml-auto'
                  }`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* right detail */}
        <section className="xl:col-span-3 rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-semibold mb-3">최근 활동</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 leading-relaxed max-h-[430px] overflow-y-auto">
            데이터를 로드할 때 활동이 표시됩니다.
          </div>
        </section>
      </div>
    </div>
  );
}
