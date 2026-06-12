import { io } from 'socket.io-client';
import { getAccessToken } from './api.js';

// Same-origin in production (nginx proxies /socket.io to the backend), so
// the app works from any device that can reach the host.
const URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:4000');

export function connectPoseSocket() {
  return io(`${URL}/ws/pose`, {
    auth: { token: getAccessToken() },
    transports: ['websocket'],
  });
}
