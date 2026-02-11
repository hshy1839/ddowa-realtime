import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE,
  // We rely on httpOnly cookies set by /api/auth; JS should not manage auth cookies.
  withCredentials: true,
});

// Backward-compatible no-ops (existing UI calls these after login/signup)
export const setAuthToken = (_token: string) => {};
export const removeAuthToken = () => {};
