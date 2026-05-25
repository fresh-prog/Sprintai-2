import { useEffect, useMemo, useRef, useState } from 'react';
import { drawSkeleton } from '../utils/skeleton.js';

const W = 480;
const H = 360;

/**
 * Renders a frame-by-frame skeleton playback for persisted pose frames.
 *
 * The scrubber is the source of truth for the active frame index; the play
 * button just animates the scrubber. Decoupling them keeps the
 * "jump-to-frame-on-click" path identical to the play loop.
 */
export default function SkeletonReplay({ frames }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sorted = useMemo(
    () => [...frames].sort((a, b) => a.frameIdx - b.frameIdx),
    [frames],
  );
  const max = Math.max(0, sorted.length - 1);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    const frame = sorted[idx];
    if (frame) drawSkeleton(ctx, frame.keypoints, W, H);
  }, [idx, sorted]);

  useEffect(() => {
    if (!playing || sorted.length === 0) return;

    let last = performance.now();
    const stepMs = 33; // ≈ 30 fps replay regardless of capture rate
    function loop(now) {
      if (now - last >= stepMs) {
        last = now;
        setIdx((cur) => (cur >= max ? 0 : cur + 1));
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, sorted.length, max]);

  if (sorted.length === 0) {
    return <p className="text-slate-500 text-sm">No pose frames recorded for this session.</p>;
  }

  const current = sorted[idx];
  return (
    <div className="card space-y-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block w-full rounded-xl bg-slate-900"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={max}
          value={idx}
          onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
          className="flex-1"
        />
        <span className="text-xs text-slate-500 tabular-nums w-24 text-right">
          frame {idx + 1} / {sorted.length}
          {current ? ` · ${(current.tsMs / 1000).toFixed(1)}s` : ''}
        </span>
      </div>
    </div>
  );
}
