import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

/**
 * Repurposes Leaflet as a generic 2D viewport for normalized motion
 * coordinates (no real-world projection). We project [0,1] × [0,1] onto a
 * fake CRS so the heatmap/polyline rendering Just Works™.
 */
export default function MovementMap({ points = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      zoomControl: false,
      attributionControl: false,
    });
    map.fitBounds([[0, 0], [100, 100]]);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    const map = mapRef.current;

    // Convert normalized [0,1] coords → 0..100 plane; flip Y so up-on-screen is up-in-data.
    const latlngs = points.map(({ x, y }) => [100 - y * 100, x * 100]);

    const traj = L.polyline(latlngs, { color: '#2563eb', weight: 3 }).addTo(map);
    const heat = L.heatLayer(latlngs.map((p) => [...p, 0.5]), { radius: 25, blur: 20 }).addTo(map);
    return () => { traj.remove(); heat.remove(); };
  }, [points]);

  return <div ref={containerRef} className="card p-0" style={{ height: 360 }} />;
}
