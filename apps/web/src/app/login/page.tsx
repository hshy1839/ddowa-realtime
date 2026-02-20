'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth', { email, password, action: 'login', rememberMe });
      setAuthToken(response.data.token, rememberMe);
      router.push('/');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch {
      setError('로그인 실패. 이메일과 비밀번호를 확인하세요.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-w-md w-full border border-black/10">
        <h1 className="text-2xl font-bold text-black mb-6">로그인</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black/70 mb-2 text-sm">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/20" placeholder="your@email.com" required />
          </div>

          <div>
            <label className="block text-black/70 mb-2 text-sm">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/20" placeholder="••••••••" required />
          </div>

          <label className="flex items-center gap-2 text-sm text-black/70">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4" />
            로그인 유지
          </label>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button type="submit" className="w-full px-4 py-2.5 bg-black hover:bg-black/85 rounded-xl text-white font-semibold">로그인</button>
        </form>

        <p className="text-black/60 mt-4 text-sm">
          계정이 없으신가요?{' '}
          <a href="/signup" className="text-black font-semibold hover:underline">
            회원가입
          </a>
        </p>
      </div>
    </div>
  );
}
