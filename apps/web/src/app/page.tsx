'use client';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.22),rgba(0,0,0,0)_34%)]" />
      <div className="stars" />
      <div className="stars stars-2" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5">
          <div className="text-sm font-bold tracking-tight">또와AI</div>
          <a
            href="/signup"
            className="rounded-md bg-[#2bbf4b] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#35cf57]"
          >
            사전예약
          </a>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-56px)] items-start justify-center px-6 pt-24 text-center sm:pt-28">
        <div className="max-w-4xl">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#2bbf4b]/40 bg-[#16381e]/70 px-3 py-1 text-xs text-[#9CFFB1]">
            <span className="rounded-full bg-[#2bbf4b] px-1.5 py-0.5 text-[10px] font-bold text-black">New</span>
            AI Call Agent
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
            24시간 365일 수많은 전화 응대
            <br />
            '또와'가 대신 할게요 !
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/70 sm:text-base">
            또와는 사장님 대신 전화를 받고, 설명하고, 예약까지 처리하는 AI 상담원입니다.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="/signup"
              className="rounded-md bg-[#2bbf4b] px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[#35cf57]"
            >
              사전예약하고 할인받기 ↗
            </a>
            <a
              href="/login"
              className="rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/40"
            >
              로그인
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
