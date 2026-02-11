'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold">Tohwa</h1>
        <div className="flex gap-4">
          <a href="/login" className="px-4 py-2 hover:bg-slate-700 rounded">
            로그인
          </a>
          <a href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            회원가입
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-4">AI-Powered Realtime Consultation</h2>
        <p className="text-xl text-slate-300 mb-8">
          실시간 AI 음성 상담 및 예약 관리 플랫폼. 고객과의 상호작용을 더 스마트하게 만드세요.
        </p>
        <a
          href="/signup"
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
        >
          무료로 시작하기
        </a>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold mb-12 text-center">주요 기능</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-700 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-2">실시간 음성 상담</h4>
            <p className="text-slate-300">Google Gemini AI와의 자연스러운 음성 대화</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-2">자동 예약</h4>
            <p className="text-slate-300">AI가 예약을 처리하고 결제 링크를 제공합니다</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-2">분석 대시보드</h4>
            <p className="text-slate-300">통화 기록, 고객 데이터, 예약 통계 확인</p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold mb-12 text-center">요금</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-700 p-8 rounded-lg border border-slate-600">
            <h4 className="text-2xl font-bold mb-4">Free</h4>
            <p className="text-2xl font-bold mb-6">무료</p>
            <ul className="space-y-2 text-slate-300">
              <li>✓ 월 100건 상담</li>
              <li>✓ 기본 분석</li>
              <li>✓ 이메일 지원</li>
            </ul>
          </div>
          <div className="bg-blue-700 p-8 rounded-lg border border-blue-600">
            <h4 className="text-2xl font-bold mb-4">Pro</h4>
            <p className="text-2xl font-bold mb-6">$99/월</p>
            <ul className="space-y-2">
              <li>✓ 무제한 상담</li>
              <li>✓ 고급 분석</li>
              <li>✓ 우선 지원</li>
              <li>✓ API 접근</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-20">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h3 className="text-3xl font-bold mb-4">지금 시작하세요</h3>
          <p className="text-lg mb-8">신용카드 없이 무료로 시작할 수 있습니다</p>
          <a
            href="/signup"
            className="inline-block px-8 py-3 bg-white text-blue-600 hover:bg-slate-100 rounded-lg font-semibold"
          >
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}
