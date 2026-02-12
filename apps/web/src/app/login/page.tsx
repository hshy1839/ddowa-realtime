'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('🔐 로그인 시도:', email);
      const response = await api.post('/auth', { email, password, action: 'login' });
      console.log('✓ 로그인 성공:', response.data);
      setAuthToken(response.data.token);
      console.log('📍 대시보드로 이동 시작...');
      
      // 라우터 이동
      router.push('/app');
      
      // 페이지 새로고침 (확실한 이동)
      setTimeout(() => {
        window.location.href = '/app';
      }, 500);
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      setError('로그인 실패. 이메일과 비밀번호를 확인하세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-6">
      <div className="bg-slate-700 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">로그인</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-white mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
          >
            로그인
          </button>
        </form>

        <p className="text-slate-300 mt-4">
          계정이 없으신가요?{' '}
          <a href="/signup" className="text-blue-400 hover:underline">
            회원가입
          </a>
        </p>
      </div>
    </div>
  );
}
