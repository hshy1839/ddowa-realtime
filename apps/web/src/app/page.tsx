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
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    setAuthed(Boolean(getAuthToken()));
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,197,94,0.25),rgba(0,0,0,0)_35%)]" />
      <div className="stars" />
      <div className="stars stars-2" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="text-lg font-extrabold tracking-tight">또와AI</div>
          {authed ? (
            <a href="/app" className="rounded-md bg-[#2bbf4b] px-5 py-2 text-sm font-bold text-white hover:bg-[#35cf57]">
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
            시작하기
          </a>
          {!authed && (
            <a href="/login" className="rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white/90 hover:border-white/40">
              로그인
            </a>
          )}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28">
        <div className="mx-auto mb-5 w-fit rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80">Benefits</div>
        <h2 className="mx-auto mb-14 max-w-4xl text-center text-3xl font-bold leading-tight sm:text-5xl">
          전화 응대로 겪고 있는 문제들,
          <br />
          '또와'는 이렇게 해결합니다
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: '"전화 응대 인건비가 부담돼요"',
              desc: "'또와'는 직원 한 명 비용보다 훨씬 적은 금액으로 24시간 전화 응대를 대신합니다.",
            },
            {
              title: '"업무 중에는 전화를 못 받아요"',
              desc: "'또와'는 24시간 365일 어떤 순간에도 즉시 전화를 받습니다.",
            },
            {
              title: '"똑같은 설명을 계속 해요"',
              desc: '자주 묻는 질문은 또와가 대신 정확하게 안내합니다.',
            },
            {
              title: '"직원마다 설명이 달라서 문제가 생겨요"',
              desc: "'또와'는 사용자가 입력한 동일한 기준으로 응대합니다.",
            },
            {
              title: '"무슨 전화가 왔었는지 나중에 기억이 안 나요"',
              desc: "또와는 모든 통화를 자동으로 요약해 기록하여, 사용자 문의 내역 확인이 편리합니다.",
            },
            {
              title: '"예약까지 이어지지 않는 전화가 많아요"',
              desc: "'또와'는 '상담'이 아니라 '예약'을 목표로 통화합니다.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/15 bg-white/[0.02] p-6 text-left shadow-[inset_0_-20px_50px_rgba(34,197,94,0.12)]">
              <div className="mb-4 h-8 w-8 rounded-full border border-white/30 bg-white text-center text-2xl leading-7 text-black">+</div>
              <p className="text-2xl font-semibold leading-snug">{item.title}</p>
              <p className="mt-3 text-base text-white/70">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28">
        <div className="mx-auto mb-5 w-fit rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80">How it works</div>
        <h2 className="mx-auto mb-14 max-w-4xl text-center text-3xl font-bold leading-tight sm:text-5xl">
          또와가 전화를 예약 및 매출로
          <br />
          바꾸는 과정
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/15 bg-white/[0.02] p-6 text-left shadow-[inset_0_-20px_50px_rgba(34,197,94,0.12)]">
              <div className="mb-4 inline-flex rounded-full border border-[#2bbf4b]/40 bg-[#16381e]/70 px-2.5 py-1 text-[11px] font-bold text-[#9CFFB1]">
                STEP {i + 1}
              </div>
              <p className="text-2xl font-semibold leading-snug">{s.title}</p>
              <p className="mt-3 text-base text-white/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-32 pb-6">
        <div className="mx-auto mb-5 w-fit rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80">FAQs</div>
        <h2 className="mx-auto mb-10 max-w-4xl text-center text-3xl font-bold leading-tight sm:text-6xl">
          또와AI 자주 묻는 질문
        </h2>

        <div className="space-y-3">
          {[
            {
              q: '또와는 챗봇이랑 뭐가 다른가요?',
              a: '챗봇은 보통 텍스트로 정해진 답변을 보여주는 도구입니다. 또와는 사람처럼 전화를 받고, 대화를 이어가며, 예약과 결제까지 마무리하는 전화 응대 AI 상담원입니다.',
            },
            {
              q: '자동응답기(ARS)랑은 어떤 차이가 있나요?',
              a: 'ARS는 정해진 번호 선택 흐름 중심이고, 또와는 고객 발화를 이해해 문맥에 맞게 안내/상담/예약까지 연속 처리합니다.',
            },
            {
              q: 'AI가 받으면 고객이 불편해하지 않나요?',
              a: '실제 통화 톤과 속도를 자연스럽게 조정해 이질감을 낮췄고, 필요 시 즉시 사람 상담으로 넘기는 운영도 가능합니다.',
            },
            {
              q: '설정이나 초기 세팅이 복잡하지 않나요?',
              a: '업체 소개, 서비스, 예약 정책만 입력하면 바로 시작 가능합니다. 복잡한 개발 없이 운영 중심으로 세팅됩니다.',
            },
          ].map((item, idx) => {
            const opened = openFaq === idx;
            return (
              <div key={item.q} className="rounded-xl border border-white/15 bg-white/[0.02] px-5 py-4 shadow-[inset_0_-30px_60px_rgba(34,197,94,0.12)]">
                <button
                  type="button"
                  onClick={() => setOpenFaq(opened ? -1 : idx)}
                  className="flex w-full items-center justify-between text-left text-lg font-semibold"
                >
                  <span>{item.q}</span>
                  <span className={`text-white/70 transition ${opened ? 'rotate-180' : ''}`}>⌃</span>
                </button>
                {opened && <p className="mt-3 pr-6 text-sm leading-7 text-white/75">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-0" />

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
