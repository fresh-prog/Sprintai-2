import { useEffect, useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import api from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Globe, { scoreColor } from '../components/Globe.jsx';
import { COUNTRY_BY_CODE, countryName } from '../lib/countries.js';

export default function TalentMap() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/talent-map')
      .then(({ data }) => setRows(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Join the API aggregates with our country centroids so the globe can place
  // each spike. Countries we don't have coordinates for are dropped from the
  // globe but still listed in the table.
  const markers = useMemo(
    () => rows
      .map((r) => {
        const c = COUNTRY_BY_CODE[r.country];
        if (!c) return null;
        return {
          code: r.country,
          name: c.name,
          flag: c.flag,
          lat: c.lat,
          lng: c.lng,
          sessions: r.sessions,
          athletes: r.athletes,
          avgScore: r.avgScore,
          maxScore: r.maxScore,
        };
      })
      .filter(Boolean),
    [rows],
  );

  return (
    <div className="space-y-8">
      <PageHeader icon={MapPinned} eyebrow="Global Reach" title="TALENT MAP" accent="green"
        subtitle="Every recorded sprint, plotted on a living globe. Each glowing spike marks a country — taller spikes mean more sessions, colour reflects the mean sprint score." />

      {loading ? (
        <div className="card grid place-items-center" style={{ height: 460 }}>
          <p className="text-slate-400">Spinning up the globe…</p>
        </div>
      ) : (
        <Globe markers={markers} />
      )}

      {/* Legend — colour is reinforced by the score ranges in text, so it never
          carries meaning on its own. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
        <span className="text-slate-400">Mean sprint score:</span>
        <LegendDot color={scoreColor(75)} label="Elite · 70+" />
        <LegendDot color={scoreColor(50)} label="Developing · 40–69" />
        <LegendDot color={scoreColor(20)} label="Emerging · under 40" />
        <LegendDot color={scoreColor(null)} label="Score pending" />
      </div>

      {!loading && rows.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-slate-300">No country-tagged sessions yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Record or upload a sprint, choose your country, and leave “Show on the Talent Map”
            checked — it appears here within moments.
          </p>
        </div>
      ) : !loading && (
        <div className="card">
          <h3 className="font-display text-2xl text-white mb-3">RANKINGS</h3>
          <table className="min-w-full text-sm">
            <caption className="sr-only">Sprint activity and scores aggregated by country.</caption>
            <thead className="text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="text-left pb-2">Country</th>
                <th scope="col" className="text-right pb-2">Athletes</th>
                <th scope="col" className="text-right pb-2">Sessions</th>
                <th scope="col" className="text-right pb-2">Avg score</th>
                <th scope="col" className="text-right pb-2">Peak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => {
                const c = COUNTRY_BY_CODE[r.country];
                return (
                  <tr key={r.country}>
                    <td className="py-2 font-display text-lg text-white">
                      <span className="mr-2" aria-hidden="true">{c?.flag}</span>
                      {countryName(r.country)}
                    </td>
                    <td className="text-right text-slate-200 tabular-nums">{r.athletes}</td>
                    <td className="text-right text-slate-300 tabular-nums">{r.sessions}</td>
                    <td className="text-right tabular-nums" style={{ color: scoreColor(r.avgScore) }}>
                      {r.avgScore == null ? '—' : r.avgScore.toFixed(1)}
                    </td>
                    <td className="text-right text-slate-300 tabular-nums">
                      {r.maxScore == null ? '—' : r.maxScore.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
