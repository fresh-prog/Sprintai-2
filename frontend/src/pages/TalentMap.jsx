import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api.js';

// Lightweight ISO alpha-2 → lat/lng table. Just the countries we actually
// expect athletes from in v1 — extend as the cohort grows.
const COUNTRY_LATLNG = {
  UG: [1.3733, 32.2903],   // Uganda
  KE: [-0.0236, 37.9062],  // Kenya
  ET: [9.1450, 40.4897],   // Ethiopia
  TZ: [-6.3690, 34.8888],  // Tanzania
  RW: [-1.9403, 29.8739],  // Rwanda
  ZA: [-30.5595, 22.9375], // South Africa
  NG: [9.0820, 8.6753],    // Nigeria
  GH: [7.9465, -1.0232],   // Ghana
  US: [37.0902, -95.7129], // USA
  GB: [55.3781, -3.4360],  // United Kingdom
  JM: [18.1096, -77.2975], // Jamaica
  CA: [56.1304, -106.3468],// Canada
  AU: [-25.2744, 133.7751],// Australia
  BR: [-14.2350, -51.9253],// Brazil
  FR: [46.6034, 1.8883],   // France
  DE: [51.1657, 10.4515],  // Germany
};

export default function TalentMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/talent-map')
      .then(({ data }) => setRows(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [10, 25],          // Africa-centric default
      zoom: 2,
      worldCopyJump: true,
      preferCanvas: true,
    });
    // Stylized dark Carto basemap.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap · © CARTO',
    }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current || rows.length === 0) return;
    const layers = [];
    for (const row of rows) {
      const ll = COUNTRY_LATLNG[row.country];
      if (!ll) continue;
      // Radius scales with athlete count (capped); color with avg score.
      const radius = Math.min(60_000 + row.athletes * 25_000, 600_000);
      const score = Math.max(0, Math.min(row.avgScore ?? 0, 100));
      const color = scoreColor(score);
      const c = L.circle(ll, {
        radius,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
      }).addTo(mapRef.current);
      c.bindTooltip(
        `<div style="font-family:Inter;">
          <div style="font-family:'Bebas Neue';font-size:1.25rem;color:${color}">${row.country}</div>
          <div>${row.athletes} athlete${row.athletes === 1 ? '' : 's'}</div>
          <div>${row.sessions} session${row.sessions === 1 ? '' : 's'}</div>
          <div>avg score <b>${(row.avgScore ?? 0).toFixed(1)}</b></div>
          <div>peak score <b>${(row.maxScore ?? 0).toFixed(1)}</b></div>
        </div>`,
        { direction: 'top' },
      );
      layers.push(c);
    }
    return () => layers.forEach((l) => l.remove());
  }, [rows]);

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Global Reach</p>
        <h1 className="font-display text-5xl text-white mt-2">TALENT MAP</h1>
        <p className="text-slate-300 mt-2 max-w-2xl">
          Where athletes are being assessed and how their sprint scores compare. Each circle is
          one country; size = athlete count, color = mean sprint score.
        </p>
      </header>

      <div ref={containerRef} className="card p-0 overflow-hidden" style={{ height: 540 }} />

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400">
          No country-tagged sessions yet. Add athletes with a country code (e.g. UG) and run
          their sessions to populate the map.
        </p>
      ) : (
        <div className="card">
          <h3 className="font-display text-2xl text-white mb-3">RANKINGS</h3>
          <table className="min-w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left pb-2">Country</th>
                <th className="text-right pb-2">Athletes</th>
                <th className="text-right pb-2">Sessions</th>
                <th className="text-right pb-2">Avg score</th>
                <th className="text-right pb-2">Peak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.country}>
                  <td className="py-2 font-display text-lg text-sprint-orange">{r.country}</td>
                  <td className="text-right text-slate-200">{r.athletes}</td>
                  <td className="text-right text-slate-300">{r.sessions}</td>
                  <td className="text-right text-slate-200 tabular-nums">{(r.avgScore ?? 0).toFixed(1)}</td>
                  <td className="text-right text-slate-300 tabular-nums">{(r.maxScore ?? 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Score 0..100 → green↔orange↔coral.
function scoreColor(score) {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 40) return '#f5a623'; // orange
  return '#ef4444';                  // coral
}
