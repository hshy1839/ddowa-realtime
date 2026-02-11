'use client';

import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar Navigation */}
      <div className="flex">
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-4 min-h-screen">
          <h1 className="text-2xl font-bold mb-8">Tohwa</h1>

          <nav className="space-y-2">
            <a
              href="/app"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              대시보드
            </a>
            <a
              href="/app/call"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              상담 시작
            </a>
            <a
              href="/app/inbox"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              받은 메시지
            </a>
            <a
              href="/app/contacts"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              연락처
            </a>
            <a
              href="/app/analytics"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              분석
            </a>
            <a
              href="/app/settings"
              className="block px-4 py-2 rounded hover:bg-slate-700 transition"
            >
              설정
            </a>
          </nav>

          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/');
            }}
            className="mt-8 w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            로그아웃
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
