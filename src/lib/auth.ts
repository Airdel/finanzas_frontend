import { AxiosError } from 'axios';
import { api } from './api';
import { useAuthStore } from '../store/auth';

export function logout() {
  // Invalidate the refresh token server-side; log out locally regardless
  api.post('/auth/logout').catch(() => {}).finally(useAuthStore.getState().logout);
}

type Session = {
  user: { id: number; email: string; name: string };
  accessToken: string;
  refreshToken: string;
};

// Enters without a password when the server allows it. Resolves false when
// the server asks for a password; network errors are rethrown.
export async function openSession(): Promise<boolean> {
  try {
    const res = await api.post('/auth/open');
    // NestJS TransformInterceptor wraps the response in a 'data' object
    const { user, accessToken, refreshToken }: Session = res.data.data ?? res.data;
    const auth = useAuthStore.getState();
    auth.setPasswordRequired(false);
    auth.setAuth(user, accessToken, refreshToken);
    return true;
  } catch (err) {
    // 403: password required or outside Tailscale; 404: older backend
    const status = err instanceof AxiosError ? err.response?.status : undefined;
    if (status === 403 || status === 404) {
      useAuthStore.getState().setPasswordRequired(true);
      return false;
    }
    throw err;
  }
}
