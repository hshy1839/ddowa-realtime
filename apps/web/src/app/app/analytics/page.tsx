'use client';

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">분석</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">총 상담 분</p>
          <p className="text-3xl font-bold">1,240</p>
          <p className="text-sm text-slate-400 mt-2">지난 달 대비 +12%</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">평균 만족도</p>
          <p className="text-3xl font-bold">4.8</p>
          <p className="text-sm text-slate-400 mt-2">5점 만점</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">완료율</p>
          <p className="text-3xl font-bold">94%</p>
          <p className="text-sm text-slate-400 mt-2">예약까지 완료</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 mb-2">평균 통화 시간</p>
          <p className="text-3xl font-bold">5:34</p>
          <p className="text-sm text-slate-400 mt-2">분:초</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">지난 7일 상담 수</h2>
          <div className="h-64 flex items-end justify-around">
            {[12, 15, 18, 22, 19, 25, 28].map((val, i) => (
              <div key={i} className="w-8 bg-blue-600 rounded-t" style={{ height: `${val * 8}px` }} />
            ))}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">상담 의도 분석</h2>
          <ul className="space-y-3">
            <li className="flex justify-between">
              <span>정보 요청</span>
              <span className="font-bold">45%</span>
            </li>
            <li className="flex justify-between">
              <span>예약 신청</span>
              <span className="font-bold">35%</span>
            </li>
            <li className="flex justify-between">
              <span>기타 문의</span>
              <span className="font-bold">14%</span>
            </li>
            <li className="flex justify-between">
              <span>불만 처리</span>
              <span className="font-bold">6%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
