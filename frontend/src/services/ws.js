import { io } from 'socket.io-client';
import { getAccessToken } from './api.js';

const URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:4000';

export function connectPoseSocket() {
  return io(`${URL}/ws/pose`, {
    auth: { token: getAccessToken() },
    transports: ['websocket'],
  });
}
