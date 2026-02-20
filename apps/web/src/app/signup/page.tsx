'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api-client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await api.post('/auth', { email, password, action: 'signup' });
      setAuthToken(response.data.token);
      router.push('/');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch {
      setError('회원가입 실패. 다시 시도하세요.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-w-md w-full border border-black/10">
        <h1 className="text-2xl font-bold text-black mb-6">회원가입</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black/70 mb-2 text-sm">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/20" placeholder="your@email.com" required />
          </div>

          <div>
            <label className="block text-black/70 mb-2 text-sm">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/20" placeholder="••••••••" required />
          </div>

          <div>
            <label className="block text-black/70 mb-2 text-sm">비밀번호 확인</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/20" placeholder="••••••••" required />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button type="submit" className="w-full px-4 py-2.5 bg-black hover:bg-black/85 rounded-xl text-white font-semibold">회원가입</button>
        </form>

        <p className="text-black/60 mt-4 text-sm">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="text-black font-semibold hover:underline">
            로그인
          </a>
        </p>
      </div>
    </div>
  );
}
