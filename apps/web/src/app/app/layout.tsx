'use client';

import { useRouter } from 'next/navigation';

const menus = [
  { href: '/app', label: '대시보드' },
  { href: '/app/call', label: '상담 시작' },
  { href: '/app/inbox', label: '받은 메시지' },
  { href: '/app/contacts', label: '연락처' },
  { href: '/app/analytics', label: '분석' },
  { href: '/app/bookings', label: '예약내역' },
  { href: '/app/settings', label: '설정' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-black">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:flex lg:flex-col border-r border-black/10 bg-white min-h-screen p-5">
          <h1 className="text-2xl font-bold mb-8 tracking-tight">ddowa</h1>
          <nav className="space-y-1">
            {menus.map((m) => (
              <a key={m.href} href={m.href} className="block px-4 py-2.5 rounded-xl text-sm hover:bg-black hover:text-white transition">
                {m.label}
              </a>
            ))}
          </nav>

          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/');
            }}
            className="mt-auto w-full px-4 py-2.5 rounded-xl bg-black text-white hover:bg-black/80"
          >
            로그아웃
          </button>
        </aside>

        <main className="min-w-0">
          <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/10 px-4 py-3">
            <div className="text-lg font-bold mb-2">ddowa</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {menus.map((m) => (
                <a key={m.href} href={m.href} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-black/15 text-xs">
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
