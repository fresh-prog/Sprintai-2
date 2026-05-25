import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true,
});

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

// Refresh-on-401 once per request.
let refreshInFlight = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retried) {
      orig._retried = true;
      refreshInFlight ||= api.post('/auth/refresh').finally(() => { refreshInFlight = null; });
      try {
        const { data } = await refreshInFlight;
        accessToken = data.accessToken;
        orig.headers.Authorization = `Bearer ${accessToken}`;
        return api(orig);
      } catch {
        accessToken = null;
      }
    }
    throw err;
  },
);

export default api;
