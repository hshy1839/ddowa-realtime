import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7777/api';

console.log('🌐 API_BASE:', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const TOKEN_KEY = 'auth_token';
const TOKEN_REMEMBER_KEY = 'auth_token_remember';

export const setAuthToken = (token: string, rememberMe = true) => {
  console.log('💾 토큰 저장');

  // 기존 토큰 흔적 정리
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_REMEMBER_KEY, '1');
    Cookies.set('token', token, { expires: 7, path: '/' });
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_REMEMBER_KEY);
    Cookies.set('token', token, { path: '/' }); // 세션 쿠키
  }

  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const removeAuthToken = () => {
  console.log('🗑️ 토큰 삭제');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  Cookies.remove('token');
  delete api.defaults.headers.common['Authorization'];
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

// 앱 초기화 시 저장된 토큰 복원
if (typeof window !== 'undefined') {
  const savedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (savedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    console.log('📎 저장된 토큰 로드됨');
  }
}

api.interceptors.request.use(
  (config) => {
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ [API] 요청 에러:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ [API] 응답 에러:', error.message);
    if (error.response?.status === 401) {
      removeAuthToken();
    }
    return Promise.reject(error);
  }
);
