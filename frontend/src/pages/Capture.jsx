import { useEffect, useRef, useState } from 'react';
import { useWebcam } from '../hooks/useWebcam.js';
import { usePoseDetector } from '../hooks/usePoseDetector.js';
import { drawSkeleton } from '../utils/skeleton.js';
import { connectPoseSocket } from '../services/ws.js';
import api from '../services/api.js';

const WIDTH = 640;
const HEIGHT = 480;
const WINDOW_SIZE = 8;

export default function Capture() {
  const { videoRef, ready: camReady } = useWebcam({ width: WIDTH, height: HEIGHT });
  const { ready: poseReady, detect } = usePoseDetector();
  const canvasRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [posture, setPosture] = useState(null);
  const [activity, setActivity] = useState(null);
  const [liveAngles, setLiveAngles] = useState(null);
  const socketRef = useRef(null);
  const bufferRef = useRef([]);
  const frameIdxRef = useRef(0);
  const rafRef = useRef(null);

  async function startSession() {
    const { data } = await api.post('/sessions', { label: `Capture ${new Date().toLocaleString()}`, source: 'WEBCAM' });
    setSessionId(data.id);
    const sock = connectPoseSocket();
    sock.on('connect', () => sock.emit('session:join', { sessionId: data.id }));
    sock.on('prediction:posture',  (p) => setPosture(p));
    sock.on('prediction:activity', (p) => setActivity(p));
    sock.on('metric:angles', ({ angles }) => setLiveAngles(angles));
    socketRef.current = sock;
  }

  async function stopSession() {
    cancelAnimationFrame(rafRef.current);
    socketRef.current?.emit('session:end', { sessionId });
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSessionId(null);
  }

  useEffect(() => {
    if (!sessionId || !camReady || !poseReady) return;
    const ctx = canvasRef.current.getContext('2d');

    function tick() {
      const t = performance.now();
      const result = detect(videoRef.current, t);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.drawImage(videoRef.current, 0, 0, WIDTH, HEIGHT);

      const lm = result?.landmarks?.[0];
      if (lm) {
        drawSkeleton(ctx, lm, WIDTH, HEIGHT);
        bufferRef.current.push({
          frameIdx: frameIdxRef.current++,
          tsMs: Math.round(t),
          keypoints: lm.map((p, i) => ({ i, x: p.x, y: p.y, z: p.z ?? 0, vis: p.visibility ?? 1 })),
        });
        if (bufferRef.current.length >= WINDOW_SIZE) {
          const window = bufferRef.current.splice(0, WINDOW_SIZE);
          socketRef.current?.emit('pose:window', { frames: window });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sessionId, camReady, poseReady, detect, videoRef]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Live capture</h1>
        {sessionId
          ? <button onClick={stopSession} className="btn-secondary">Stop session</button>
          : <button onClick={startSession} className="btn-primary" disabled={!camReady || !poseReady}>
              {camReady && poseReady ? 'Start session' : 'Loading…'}
            </button>}
      </div>

      <div className="relative inline-block rounded-2xl overflow-hidden border border-slate-200">
        <video ref={videoRef} className="hidden" width={WIDTH} height={HEIGHT} muted playsInline />
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
        {posture && (
          <div className="card">
            <p className="text-sm text-slate-500">Posture</p>
            <p className="text-2xl font-bold">{posture.label}</p>
            <p className="text-sm">confidence {(posture.confidence * 100).toFixed(1)}%</p>
          </div>
        )}
        {activity && (
          <div className="card">
            <p className="text-sm text-slate-500">Activity</p>
            <p className="text-2xl font-bold">{activity.label}</p>
            <p className="text-sm">confidence {(activity.confidence * 100).toFixed(1)}%</p>
          </div>
        )}
        {liveAngles && (
          <div className="card">
            <p className="text-sm text-slate-500">Live joint angles</p>
            <ul className="text-sm space-y-0.5">
              <li>L knee: {liveAngles.left_knee?.toFixed(0)}°</li>
              <li>R knee: {liveAngles.right_knee?.toFixed(0)}°</li>
              <li>L hip:  {liveAngles.left_hip?.toFixed(0)}°</li>
              <li>R hip:  {liveAngles.right_hip?.toFixed(0)}°</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
