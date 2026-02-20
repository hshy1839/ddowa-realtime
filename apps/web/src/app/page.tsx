'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/api-client';

const steps = [
  {
    title: '간단한 업체 정보 및 서비스 정보 입력',
    desc: '복잡한 세팅은 없습니다. 평소 전화로 안내하던 내용을 간단한 폼에 한 번만 입력하면 됩니다.',
  },
  {
    title: '업체 전용 전화 직원으로 세팅',
    desc: "입력된 내용을 기준으로 '또와'가 해당 업체만을 위한 전화 응대 직원으로 설정됩니다.",
  },
  {
    title: '실시간 전화 응대',
    desc: '고객이 전화를 걸면 또와가 지연 없고, 실제 사람 같은 목소리로 자연스럽게 전화를 받고 응대합니다.',
  },
  {
    title: '예약·결제 안내 → 기억 → 다음 제안',
    desc: '통화는 여기서 끝나지 않습니다. 또와는 예약/결제 안내를 마치고, 내용을 기억해 다음 통화에 활용합니다.',
  },
];

export default function Home() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getAuthToken()));
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,197,94,0.25),rgba(0,0,0,0)_35%)]" />
      <div className="stars" />
      <div className="stars stars-2" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <div className="text-sm font-bold tracking-tight">또와AI</div>
          {authed ? (
            <a href="/app" className="rounded-md bg-[#2bbf4b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#35cf57]">
              시작하기
            </a>
          ) : (
            <a href="/login" className="rounded-md border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/90 hover:border-white/40">
              로그인
            </a>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[86vh] w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2bbf4b]/40 bg-[#16381e]/70 px-3 py-1 text-xs text-[#9CFFB1]">
          <span className="rounded-full bg-[#2bbf4b] px-1.5 py-0.5 text-[10px] font-bold text-black">New</span>
          AI Call Agent
        </div>
        <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
          24시간 365일 수많은 전화 응대
          <br />
          '또와'가 대신 할게요 !
        </h1>
        <p className="mt-5 max-w-2xl text-sm text-white/70 sm:text-base">
          또와는 사장님 대신 전화를 받고, 설명하고, 예약까지 처리하는 AI 직원입니다.
        </p>
        <div className="mt-8 flex gap-3">
          <a href={authed ? '/app' : '/login'} className="rounded-md bg-[#2bbf4b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#35cf57]">
            {authed ? '시작하기' : '시작하기'}
          </a>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">전화 응대로 겪는 문제들, '또와'는 이렇게 해결합니다</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {['응대 누락/부재중 손실', '반복 문의 대응 피로', '예약 전환율 저하'].map((t) => (
            <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
              <p className="text-sm font-semibold text-white">{t}</p>
              <p className="mt-2 text-sm text-white/65">24/7 자동 응대, 정확한 안내, 예약 유도로 매출 손실을 줄입니다.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">또와가 전화를 예약 및 매출로 바꾸는 과정</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-bold text-[#7BFF98]">STEP {i + 1}</p>
              <p className="mt-2 text-base font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-white/65">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-10 text-center">
        <div className="rounded-3xl border border-[#2bbf4b]/30 bg-[#0f2214] px-6 py-12">
          <h3 className="text-2xl font-bold sm:text-3xl">사전예약 고객에게만 드리는 3개월 50% 할인 혜택</h3>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/75 sm:text-base">
            지금 시작하고 출시 당일 가장 먼저 AI 전화 상담원을 경험해보세요.
          </p>
          <div className="mt-7">
            <a href={authed ? '/app' : '/login'} className="inline-flex rounded-md bg-[#2bbf4b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#35cf57]">
              {authed ? '시작하기' : '지금 시작하기'}
            </a>
          </div>
        </div>
      </section>

      <style jsx>{`
        .stars,
        .stars:after {
          content: '';
          position: absolute;
          inset: -2000px;
          background-image: radial-gradient(2px 2px at 40px 60px, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1.5px 1.5px at 130px 160px, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1.8px 1.8px at 220px 300px, rgba(255, 255, 255, 0.65), transparent),
            radial-gradient(1.2px 1.2px at 320px 80px, rgba(255, 255, 255, 0.6), transparent),
            radial-gradient(1.7px 1.7px at 420px 220px, rgba(255, 255, 255, 0.7), transparent);
          background-size: 520px 520px;
          animation: drift 120s linear infinite;
          opacity: 0.35;
          pointer-events: none;
        }
        .stars-2,
        .stars-2:after {
          background-size: 700px 700px;
          animation-duration: 180s;
          opacity: 0.2;
        }
        @keyframes drift {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(1000px, 1200px, 0);
          }
        }
      `}</style>
    </main>
  );
}
