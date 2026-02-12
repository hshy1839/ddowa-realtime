import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7777/api';

console.log('🌐 API_BASE:', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// 토큰을 localStorage + cookies에 저장
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token: string) => {
  console.log('💾 토큰 저장 (localStorage + cookies)');
  localStorage.setItem(TOKEN_KEY, token);
  // JS-Cookie로 HttpOnly가 아닌 일반 쿠키에 저장
  Cookies.set('token', token, { expires: 7, path: '/' });
  // API 인스턴스에 Authorization 헤더 추가
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const removeAuthToken = () => {
  console.log('🗑️ 토큰 삭제');
  localStorage.removeItem(TOKEN_KEY);
  Cookies.remove('token');
  delete api.defaults.headers.common['Authorization'];
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// 앱 초기화 시 저장된 토큰 복원
const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
  console.log('📎 저장된 토큰 로드됨');
}

// 요청/응답 인터셉터로 로깅
api.interceptors.request.use((config) => {
  console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  console.error('❌ [API] 요청 에러:', error);
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  console.log(`📥 [API] ${response.status} ${response.config.url}`);
  return response;
}, (error) => {
  console.error('❌ [API] 응답 에러:', error.message);
  // 401 Unauthorized 시 토큰 삭제
  if (error.response?.status === 401) {
    removeAuthToken();
  }
  return Promise.reject(error);
});



