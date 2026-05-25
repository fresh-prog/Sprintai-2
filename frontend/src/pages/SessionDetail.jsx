import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import AngleChart from '../components/AngleChart.jsx';
import MovementMap from '../components/MovementMap.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [frames, setFrames] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/sessions/${id}/summary`),
      api.get(`/sessions/${id}/metrics`),
      api.get(`/sessions/${id}/frames`),
    ]).then(([s, m, f]) => {
      setSummary(s.data);
      setMetrics(m.data.metrics ?? []);
      setFrames(f.data.frames ?? []);
    });
  }, [id]);

  // Pivot metrics by name → time series the chart wants.
  const series = useMemo(() => {
    const byTs = new Map();
    for (const m of metrics) {
      if (!byTs.has(m.tsMs)) byTs.set(m.tsMs, { tsMs: m.tsMs });
      byTs.get(m.tsMs)[m.name] = m.value;
    }
    return [...byTs.values()].sort((a, b) => a.tsMs - b.tsMs);
  }, [metrics]);

  // Hip-center trajectory for the movement map.
  const trajectory = useMemo(() => {
    return frames
      .map((f) => {
        const kp = f.keypoints;
        const lhip = kp?.[23], rhip = kp?.[24];
        if (!lhip || !rhip) return null;
        return { x: (lhip.x + rhip.x) / 2, y: (lhip.y + rhip.y) / 2 };
      })
      .filter(Boolean);
  }, [frames]);

  if (!summary) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{summary.session.label}</h1>
        <p className="text-slate-500 text-sm">
          {new Date(summary.session.startedAt).toLocaleString()} · {summary.frameCount} frames
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <AngleChart data={series} dataKey="left_knee"  label="Left knee angle"  color="#2563eb" />
        <AngleChart data={series} dataKey="right_knee" label="Right knee angle" color="#16a34a" />
        <AngleChart data={series} dataKey="left_hip"   label="Left hip angle"   color="#d97706" />
        <AngleChart data={series} dataKey="right_hip"  label="Right hip angle"  color="#dc2626" />
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-2">Movement map (hip center)</h2>
        <MovementMap points={trajectory} />
      </section>
    </div>
  );
}
