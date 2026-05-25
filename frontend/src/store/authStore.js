import { create } from 'zustand';
import api, { setAccessToken } from '../services/api.js';

async function doLogin(set, email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setAccessToken(data.accessToken);
  set({ user: data.user });
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  async bootstrap() {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      const me = await api.get('/auth/me');
      set({ user: me.data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  login: (email, password) => doLogin(set, email, password),

  async register(email, password, displayName) {
    await api.post('/auth/register', { email, password, displayName });
    await doLogin(set, email, password);
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { /* noop */ }
    setAccessToken(null);
    set({ user: null });
  },
}));
