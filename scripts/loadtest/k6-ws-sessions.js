// k6 WebSocket load test.
//
// Simulates N concurrent capture sessions. Each VU:
//   1. registers + logs in over REST
//   2. POSTs /sessions to get a session id
//   3. opens the /ws/pose namespace and joins the session
//   4. emits 8-frame windows of randomized landmarks at 30 fps for a while
//
// Run:
//   docker compose up -d                  # stack on http://localhost
//   k6 run -e BASE=http://localhost:4000 scripts/loadtest/k6-ws-sessions.js
//
// Tune via env:
//   VUS=50 DURATION=2m k6 run ...

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:4000';

export const options = {
  vus: Number(__ENV.VUS || 25),
  duration: __ENV.DURATION || '60s',
  thresholds: {
    'ws_connecting': ['p(95)<1500'],
    'checks': ['rate>0.95'],
  },
};

function makeKeypoints() {
  return Array.from({ length: 33 }, (_, i) => ({
    i,
    x: Math.random(),
    y: Math.random(),
    z: 0,
    vis: 1,
  }));
}

function randomEmail() {
  return `k6+${__VU}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export default function () {
  const email = randomEmail();
  const password = 'correct-horse-battery';

  const regRes = http.post(`${BASE}/api/v1/auth/register`,
    JSON.stringify({ email, password, displayName: `k6-${__VU}` }),
    { headers: { 'Content-Type': 'application/json' } });
  check(regRes, { 'register 201': (r) => r.status === 201 });

  const loginRes = http.post(`${BASE}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  const token = loginRes.json('accessToken');

  const sessRes = http.post(`${BASE}/api/v1/sessions`,
    JSON.stringify({ label: `k6-vu-${__VU}`, source: 'WEBCAM' }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  check(sessRes, { 'session 201': (r) => r.status === 201 });
  const sessionId = sessRes.json('id');

  const wsUrl = `${BASE.replace(/^http/, 'ws')}/ws/pose/?EIO=4&transport=websocket`;
  const res = ws.connect(wsUrl, { tags: { service: 'ws' } }, function (socket) {
    socket.on('open', () => {
      // Socket.IO handshake on the namespace.
      socket.send(`40/ws/pose,{"token":"${token}"}`);
      socket.send(`42/ws/pose,["session:join",{"sessionId":"${sessionId}"}]`);
    });
    socket.setInterval(() => {
      const frames = Array.from({ length: 8 }, (_, k) => ({
        frameIdx: Date.now() + k,
        tsMs: Date.now() + k * 33,
        keypoints: makeKeypoints(),
      }));
      socket.send(`42/ws/pose,["pose:window",${JSON.stringify({ frames })}]`);
    }, 250);
    socket.setTimeout(() => socket.close(), 30_000);
  });
  check(res, { 'ws connected': (r) => r && r.status === 101 });
  sleep(1);
}
