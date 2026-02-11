import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken, removeAuthToken } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const router = useRouter();
  const { user, setUser, setLoading } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const response = await api.post('/auth', { email, password, action: 'login' });
        setAuthToken(response.data.token);
        setUser(response.data.user);
        router.push('/app');
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, router]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const response = await api.post('/auth', { email, password, action: 'signup' });
        setAuthToken(response.data.token);
        setUser(response.data.user);
        router.push('/app');
      } catch (error) {
        console.error('Signup failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, router]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
      removeAuthToken();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [setUser, router]);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch {
      setUser(null);
      removeAuthToken();
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  return {
    user,
    login,
    signup,
    logout,
    checkAuth,
  };
}
