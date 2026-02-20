'use client';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-w-xl w-full border border-black/10">
        <h1 className="text-2xl font-bold text-black mb-3">정식 출시 전 사전 신청 안내</h1>
        <p className="text-black/70 leading-7">
          현재 회원가입은 잠시 중단되어 있습니다.<br />
          정식 출시 전 사전 신청 설문에 참여해주시면 <span className="font-semibold text-black">할인 혜택</span>을 드립니다.
        </p>

        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdGPT4XZEVo_Nu3Z3zkBs4TjN8tOTTQFPlPQtgpBPDHB-BSBg/viewform?usp=dialog"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 font-semibold text-white hover:bg-black/85"
        >
          설문조사 참여하고 할인받기
        </a>

        <p className="text-black/60 mt-4 text-sm text-center">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="text-black font-semibold hover:underline">
            로그인
          </a>
        </p>
      </div>
    </div>
  );
}
