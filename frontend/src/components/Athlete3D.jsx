import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * 3D athlete skeleton viewer.
 *
 * Renders a sequence of MediaPipe Pose frames in a rotatable 3D scene.
 * Props:
 *   frames: PoseFrame[] — same shape Postgres stores (keypoints + tsMs)
 *   autoPlay: boolean — start the playback loop on mount
 *   speed: number — playback speed multiplier (1 = real time)
 *
 * Why react-three-fiber instead of a plain Canvas: rotation, lighting, and
 * camera controls come for free, and we can layer extra geometry (ground
 * plane, trail) without writing matrix math by hand.
 */
export default function Athlete3D({ frames = [], autoPlay = true, speed = 1 }) {
  const sorted = useMemo(() => [...frames].sort((a, b) => a.frameIdx - b.frameIdx), [frames]);
  const [playing, setPlaying] = useState(autoPlay);
  const [frameIdx, setFrameIdx] = useState(0);
  const maxIdx = Math.max(0, sorted.length - 1);

  if (sorted.length === 0) {
    return (
      <div className="card text-center text-slate-400 py-10">
        No pose frames available — record a session first.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="aspect-video bg-gradient-to-b from-navy-900 to-navy-700">
        <Canvas
          camera={{ position: [2.5, 1.8, 3.5], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#060c1c']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 10, 5]} intensity={1.1} castShadow />
          <Grid
            args={[20, 20]}
            cellColor="#1ec5c540"
            sectionColor="#1ec5c5"
            sectionThickness={1}
            cellThickness={0.5}
            position={[0, -1.05, 0]}
            infiniteGrid
            fadeDistance={20}
          />
          <Skeleton frame={sorted[frameIdx]} />
          <Trail frames={sorted.slice(Math.max(0, frameIdx - 30), frameIdx + 1)} />
          <OrbitControls enablePan={false} target={[0, 0.5, 0]} />
          {playing && (
            <Animator
              maxIdx={maxIdx}
              speed={speed}
              onFrame={(i) => setFrameIdx(i)}
            />
          )}
        </Canvas>
      </div>

      <div className="flex items-center gap-3 p-4">
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
          max={maxIdx}
          value={frameIdx}
          onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
          className="flex-1 accent-sprint-orange"
        />
        <span className="text-xs text-slate-500 tabular-nums w-32 text-right">
          frame {frameIdx + 1} / {sorted.length}
          {sorted[frameIdx] ? ` · ${(sorted[frameIdx].tsMs / 1000).toFixed(1)}s` : ''}
        </span>
      </div>
    </div>
  );
}

// 33-landmark skeleton — MediaPipe Pose connections.
const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Map MediaPipe normalized image coords → r3f world coords.
//   image X (0..1, left→right) → world X centered at 0
//   image Y (0..1, top→bottom) → world Y inverted, centered at 1
//   image Z (relative depth)    → world Z
function toWorld(p) {
  return [(p.x - 0.5) * 2, (1 - p.y) * 2 - 0.4, (p.z ?? 0) * 2];
}

function Skeleton({ frame }) {
  if (!frame) return null;
  const kp = frame.keypoints;
  return (
    <group>
      {CONNECTIONS.map(([a, b]) => {
        const pa = kp[a]; const pb = kp[b];
        if (!pa || !pb) return null;
        return <Bone key={`${a}-${b}`} from={toWorld(pa)} to={toWorld(pb)} />;
      })}
      {kp.map((p, i) => (
        <Joint key={i} position={toWorld(p)} highlight={[0, 11, 12, 23, 24, 27, 28].includes(i)} />
      ))}
    </group>
  );
}

function Bone({ from, to }) {
  const ref = useRef();
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: mid.toArray(), quaternion: q, length: Math.max(len, 0.001) };
  }, [from, to]);
  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.025, 0.025, length, 8]} />
      <meshStandardMaterial color="#1ec5c5" emissive="#1ec5c5" emissiveIntensity={0.25} />
    </mesh>
  );
}

function Joint({ position, highlight }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[highlight ? 0.05 : 0.035, 16, 16]} />
      <meshStandardMaterial
        color={highlight ? '#f5a623' : '#ffffff'}
        emissive={highlight ? '#f5a623' : '#000000'}
        emissiveIntensity={highlight ? 0.4 : 0}
      />
    </mesh>
  );
}

function Trail({ frames }) {
  const points = useMemo(() => {
    return frames
      .map((f) => {
        const lhip = f.keypoints[23]; const rhip = f.keypoints[24];
        if (!lhip || !rhip) return null;
        return new THREE.Vector3(
          ((lhip.x + rhip.x) / 2 - 0.5) * 2,
          (1 - (lhip.y + rhip.y) / 2) * 2 - 0.4,
          ((lhip.z ?? 0) + (rhip.z ?? 0)) / 2 * 2,
        );
      })
      .filter(Boolean);
  }, [frames]);
  if (points.length < 2) return null;
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geom}>
      <lineBasicMaterial color="#f5a623" linewidth={2} transparent opacity={0.7} />
    </line>
  );
}

function Animator({ maxIdx, speed, onFrame }) {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * speed * 30; // ~30 fps playback
    const idx = Math.floor(t.current) % (maxIdx + 1);
    onFrame(idx);
  });
  return null;
}
