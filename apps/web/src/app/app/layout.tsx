'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const menus = [
  { href: '/app', label: '대시보드' },
  { href: '/app/call', label: '상담 시작', localOnly: true },
  { href: '/app/inbox', label: '받은 메시지' },
  { href: '/app/contacts', label: '연락처' },
  { href: '/app/analytics', label: '분석' },
  { href: '/app/bookings', label: '예약내역' },
  { href: '/app/settings', label: '설정' },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocal(host === 'localhost' || host === '127.0.0.1');
  }, []);

  const visibleMenus = useMemo(
    () => menus.filter((m) => !('localOnly' in m) || !m.localOnly || isLocal),
    [isLocal]
  );

  return (
    <div className="app-theme min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),rgba(0,0,0,0)_35%)]" />
      <div className="app-stars" />
      <div className="app-stars app-stars-2" />
      <div className="relative lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:flex lg:flex-col border-r border-white/10 bg-black/50 backdrop-blur min-h-screen p-5">
          <h1 className="text-2xl font-extrabold mb-8 tracking-tight">또와AI</h1>
          <nav className="space-y-1">
            {visibleMenus.map((m) => (
              <a key={m.href} href={m.href} className="block px-4 py-2.5 rounded-xl text-sm text-white/85 hover:bg-white/10 hover:text-white transition">
                {m.label}
              </a>
            ))}
          </nav>

          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/');
            }}
            className="mt-auto w-full px-4 py-2.5 rounded-xl bg-[#2bbf4b] text-white hover:bg-[#35cf57]"
          >
            로그아웃
          </button>
        </aside>

        <main className="min-w-0">
          <header className="lg:hidden sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
            <div className="text-lg font-bold mb-2">또와AI</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {visibleMenus.map((m) => (
                <a key={m.href} href={m.href} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/90">
                  {m.label}
                </a>
              ))}
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
