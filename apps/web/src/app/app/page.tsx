'use client';

import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    console.log('✓ 대시보드 페이지 로드됨!');
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">총 상담</p>
          <p className="text-3xl font-bold">242</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">총 연락처</p>
          <p className="text-3xl font-bold">158</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">완료된 예약</p>
          <p className="text-3xl font-bold">47</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">평균 만족도</p>
          <p className="text-3xl font-bold">4.8/5</p>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4">최근 활동</h2>
        <p className="text-slate-400">데이터를 로드할 때 활동이 표시됩니다.</p>
      </div>
    </div>
  );
}
