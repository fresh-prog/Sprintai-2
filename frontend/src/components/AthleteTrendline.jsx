import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * Trendline of sprint score (and predicted 100m time) over time for a
 * single athlete. Pulls every COMPLETED session for the athlete and the
 * `sprint.sprint_score` metric from each.
 */
export default function AthleteTrendline({ athleteId }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Fetch the athlete's sessions, then pull each session's sprint_score
        // metric. We keep this simple — for large rosters, a dedicated
        // /athletes/:id/trend endpoint would be the right next step.
        const { data: sessions } = await api.get('/sessions?limit=200');
        const filtered = (sessions.data ?? []).filter(
          (s) => s.athleteId === athleteId && s.status === 'COMPLETED',
        );
        const detailed = await Promise.all(
          filtered.map(async (s) => {
            try {
              const { data } = await api.get(`/sessions/${s.id}/summary`);
              return {
                startedAt: s.startedAt,
                label: s.label,
                score: data.sprint?.sprint_score ?? null,
                technique: data.sprint?.technique_score ?? null,
              };
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setSeries(
          detailed
            .filter((d) => d && d.score != null)
            .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [athleteId]);

  const chartData = useMemo(() => ({
    labels: series.map((s) => new Date(s.startedAt).toLocaleDateString()),
    datasets: [
      {
        label: 'Sprint Score',
        data: series.map((s) => s.score),
        borderColor: '#f5a623',
        backgroundColor: 'rgba(245,166,35,0.2)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Technique Score',
        data: series.map((s) => s.technique),
        borderColor: '#1ec5c5',
        backgroundColor: 'rgba(30,197,197,0.0)',
        fill: false,
        tension: 0.3,
      },
    ],
  }), [series]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: {
        min: 0, max: 100,
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  }), []);

  if (loading) return <p className="text-slate-400 text-sm">Loading trend…</p>;
  if (series.length < 2) {
    return (
      <p className="text-slate-500 text-sm">
        Need at least 2 completed sessions to plot a trend ({series.length} so far).
      </p>
    );
  }
  return (
    <div className="card" style={{ height: 320 }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
