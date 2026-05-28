import { useEffect, useRef, useState } from 'react';
import { useWebcam } from '../hooks/useWebcam.js';
import { usePoseDetector } from '../hooks/usePoseDetector.js';
import { drawSkeleton } from '../utils/skeleton.js';
import { connectPoseSocket } from '../services/ws.js';
import { posturePredictor } from '../services/tfjsInference.js';
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
  const lastLocalPredAt = useRef(0);

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

        // Offline-mode fallback: if the WS is disconnected we still want a
        // posture readout for the user. Throttled to once every 500 ms so we
        // don't tank the frame rate.
        if (!socketRef.current?.connected && t - lastLocalPredAt.current > 500) {
          lastLocalPredAt.current = t;
          posturePredictor.predict(lm).then((p) => { if (p) setPosture(p); });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sessionId, camReady, poseReady, detect, videoRef]);

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Sprint Capture</p>
        <h1 className="font-display text-5xl text-white mt-2 flex items-center gap-4 flex-wrap">
          LIVE CAPTURE
          {sessionId
            ? <button onClick={stopSession} className="btn-secondary text-sm">Stop session</button>
            : <button onClick={startSession} className="btn-primary text-sm" disabled={!camReady || !poseReady}>
                {camReady && poseReady ? 'Start session →' : 'Loading…'}
              </button>}
        </h1>
        <p className="text-slate-300 mt-2 max-w-2xl">
          Film a 40m run — we extract 33 body landmarks per frame for biomechanical scoring.
        </p>
      </header>

      <div className="relative inline-block rounded-2xl overflow-hidden border border-sprint-teal/30 shadow-2xl shadow-black/40">
        <video ref={videoRef} className="hidden" width={WIDTH} height={HEIGHT} muted playsInline />
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
        {posture && (
          <div className="card">
            <p className="text-sm text-slate-400 flex items-center gap-2">
              Posture
              {posture.offline && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sprint-orange/20 text-sprint-orange uppercase tracking-wide">offline</span>
              )}
            </p>
            <p className="font-display text-3xl text-sprint-orange mt-1">{posture.label}</p>
            <p className="text-sm text-slate-400 mt-1">confidence {(posture.confidence * 100).toFixed(1)}%</p>
          </div>
        )}
        {activity && (
          <div className="card">
            <p className="text-sm text-slate-400">Activity</p>
            <p className="font-display text-3xl text-sprint-teal mt-1">{activity.label}</p>
            <p className="text-sm text-slate-400 mt-1">confidence {(activity.confidence * 100).toFixed(1)}%</p>
          </div>
        )}
        {liveAngles && (
          <div className="card">
            <p className="text-sm text-slate-400 mb-2">Live joint angles</p>
            <ul className="text-sm space-y-0.5 text-slate-200">
              <li>L knee: <span className="text-sprint-orange font-mono">{liveAngles.left_knee?.toFixed(0)}°</span></li>
              <li>R knee: <span className="text-sprint-orange font-mono">{liveAngles.right_knee?.toFixed(0)}°</span></li>
              <li>L hip:  <span className="text-sprint-orange font-mono">{liveAngles.left_hip?.toFixed(0)}°</span></li>
              <li>R hip:  <span className="text-sprint-orange font-mono">{liveAngles.right_hip?.toFixed(0)}°</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
