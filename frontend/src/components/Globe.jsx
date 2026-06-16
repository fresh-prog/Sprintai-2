import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import { BackSide, Quaternion, Vector3 } from 'three';

// Auto-rotating, interactive 3D globe for the Global Talent Map. Each marker is
// a glowing spike rising from the country where sessions were recorded — taller
// = more sessions, colour = mean sprint score. Drag to spin, hover/tap a spike
// for details. Honours prefers-reduced-motion (no auto-spin) and is paired with
// the rankings table below as the accessible, screen-reader-friendly data view.

const R = 1; // globe radius in scene units
const UP = new Vector3(0, 1, 0);

// lat/lng (deg) → point on the sphere surface. Matches the convention of the
// equirectangular earth-dark texture so spikes sit on the right country.
function latLngToVec3(lat, lng, radius = R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  return new Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// Score 0..100 → green / amber / coral. Always paired with a numeric label in
// the tooltip + table, so meaning never rests on colour alone.
export function scoreColor(score) {
  if (score == null) return '#38bdf8'; // pending (no sprint score yet) → teal
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f5a623';
  return '#ef4444';
}

function Marker({ marker, maxSessions, selected, onSelect }) {
  const [hover, setHover] = useState(false);
  const surface = useMemo(() => latLngToVec3(marker.lat, marker.lng), [marker.lat, marker.lng]);
  const quat = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, surface.clone().normalize()),
    [surface],
  );
  // Spike height scales with session volume (log-ish, capped) for a readable
  // skyline even when one country dwarfs the rest.
  const h = 0.12 + 0.45 * Math.min(1, Math.sqrt(marker.sessions / Math.max(1, maxSessions)));
  const color = scoreColor(marker.avgScore);
  const dir = surface.clone().normalize();
  const open = hover || selected;

  return (
    <group
      quaternion={quat}
      position={surface.clone().add(dir.clone().multiplyScalar(h / 2))}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : marker.code); }}
    >
      {/* The visible spike */}
      <mesh>
        <cylinderGeometry args={[0.006, 0.012, h, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {/* Glowing cap at the tip */}
      <mesh position={[0, h / 2, 0]}>
        <sphereGeometry args={[open ? 0.03 : 0.022, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Oversized invisible hit area so it's easy to tap on touch screens */}
      <mesh position={[0, h / 2, 0]} visible={false}>
        <sphereGeometry args={[0.07, 8, 8]} />
      </mesh>

      {open && (
        <Html position={[0, h / 2 + 0.06, 0]} center distanceFactor={2.4} zIndexRange={[40, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-xl border border-white/15 bg-navy-900/95 px-3 py-2 text-left shadow-2xl shadow-black/50">
            <div className="font-display text-lg leading-none" style={{ color }}>
              {marker.flag} {marker.name}
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              {marker.sessions} session{marker.sessions === 1 ? '' : 's'} · {marker.athletes} athlete{marker.athletes === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-slate-300">
              {marker.avgScore == null
                ? 'score pending'
                : <>avg <b className="tnum">{marker.avgScore.toFixed(1)}</b> · peak <b className="tnum">{(marker.maxScore ?? 0).toFixed(1)}</b></>}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Earth() {
  const tex = useTexture('/textures/earth-blue-marble.jpg');
  return (
    <mesh>
      <sphereGeometry args={[R, 64, 64]} />
      {/* Bright daytime "blue marble" earth. A gentle emissiveMap keeps the
          shadowed side from going dark as the globe revolves. */}
      <meshPhongMaterial
        map={tex}
        emissiveMap={tex}
        emissive="#ffffff"
        emissiveIntensity={0.3}
        shininess={8}
        specular="#2a4a6a"
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[R, 48, 48]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} side={BackSide} />
    </mesh>
  );
}

// Slowly spins the whole scene group; OrbitControls below pauses naturally while
// the user is dragging. Disabled entirely under reduced-motion.
function Spinner({ enabled, children }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

export default function Globe({ markers = [], height = 460 }) {
  const [selected, setSelected] = useState(null);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const maxSessions = markers.reduce((m, k) => Math.max(m, k.sessions), 1);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-navy-900 to-black"
      style={{ height }}
      role="img"
      aria-label={`Rotating globe with ${markers.length} ${markers.length === 1 ? 'country' : 'countries'} marked. Full data in the rankings table below.`}
    >
      <Canvas
        camera={{ position: [0, 0.6, 3.0], fov: 38 }}
        dpr={[1, 2]}
        frameloop={reduced ? 'demand' : 'always'}
        onPointerMissed={() => setSelected(null)}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <Spinner enabled={!reduced && selected == null}>
            <Earth />
            <Atmosphere />
            {markers.map((m) => (
              <Marker
                key={m.code}
                marker={m}
                maxSessions={maxSessions}
                selected={selected === m.code}
                onSelect={setSelected}
              />
            ))}
          </Spinner>
        </Suspense>
        {/* Drag + zoom only — the continuous "revolving" spin is done by the
            <Spinner> group so it's independent of the camera and pauses cleanly
            when a marker is selected. */}
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.8}
          maxDistance={4.5}
          rotateSpeed={0.5}
        />
      </Canvas>

      {markers.length > 0 && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Drag to spin · scroll to zoom · tap a marker for details
        </p>
      )}
    </div>
  );
}
