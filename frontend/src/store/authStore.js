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
      // /auth/refresh now returns the user too — one round-trip instead of
      // following up with /auth/me. Fall back to /me if an older API responds.
      const user = data.user ?? (await api.get('/auth/me')).data.user;
      set({ user });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  login: (email, password) => doLogin(set, email, password),

  async register(email, password, displayName) {
    // Register now signs the user in directly (returns an access token +
    // sets the refresh cookie) — no second /login round-trip.
    const { data } = await api.post('/auth/register', { email, password, displayName });
    setAccessToken(data.accessToken);
    set({ user: data.user });
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { /* noop */ }
    setAccessToken(null);
    set({ user: null });
  },
}));
