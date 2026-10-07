import { api } from './api';
import { useAuthStore } from '../store/auth';

export function logout() {
  // Invalidate the refresh token server-side; log out locally regardless
  api.post('/auth/logout').catch(() => {}).finally(useAuthStore.getState().logout);
}
