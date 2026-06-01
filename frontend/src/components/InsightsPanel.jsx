import { useEffect, useState } from 'react';
import api from '../services/api.js';

/**
 * Pulls and renders the three ML insights for a session:
 *   * Predicted 100m time
 *   * Injury risk score + flags
 *   * Top-K similar athletes (when there's a cohort to compare against)
 *
 * Renders nothing if the session hasn't been analyzed yet (no sprint
 * metrics → backend returns ok: false).
 */
export default function InsightsPanel({ sessionId }) {
  const [data, setData] = useState({ predict: null, injury: null, similar: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/sessions/${sessionId}/predict-time`).then((r) => r.data).catch(() => null),
      api.get(`/sessions/${sessionId}/injury-risk`).then((r) => r.data).catch(() => null),
      api.get(`/sessions/${sessionId}/similar?k=5`).then((r) => r.data).catch(() => null),
    ]).then(([predict, injury, similar]) => {
      if (!cancelled) setData({ predict, injury, similar, loading: false });
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (data.loading) return null;
  const anyOk = data.predict?.ok || data.injury?.ok || data.similar?.ok;
  if (!anyOk) return null;

  return (
    <section className="grid lg:grid-cols-3 gap-4">
      {data.predict?.ok && <PredictCard predict={data.predict} />}
      {data.injury?.ok && <InjuryCard injury={data.injury} />}
      {data.similar?.ok && data.similar.matches?.length > 0 && <SimilarCard matches={data.similar.matches} />}
    </section>
  );
}

function PredictCard({ predict }) {
  return (
    <div className="card border-l-4 border-l-sprint-orange">
      <p className="section-eyebrow">Predicted 100m time</p>
      <p className="font-display text-5xl text-sprint-orange mt-2">
        {predict.predicted_100m_s.toFixed(2)}<span className="text-2xl text-slate-400">s</span>
      </p>
      <p className="text-xs text-slate-400 mt-2">
        ± {(predict.confidence_high_s - predict.predicted_100m_s).toFixed(2)}s confidence
      </p>
      <p className="text-[10px] text-slate-500 mt-3">{predict.method}</p>
    </div>
  );
}

function InjuryCard({ injury }) {
  const bandColor = {
    low: 'text-sprint-green',
    moderate: 'text-sprint-orange',
    high: 'text-sprint-coral',
  }[injury.band] ?? 'text-slate-300';
  const ribbonColor = {
    low: 'border-l-sprint-green',
    moderate: 'border-l-sprint-orange',
    high: 'border-l-sprint-coral',
  }[injury.band] ?? 'border-l-slate-500';
  return (
    <div className={`card border-l-4 ${ribbonColor}`}>
      <p className="section-eyebrow">Injury risk</p>
      <p className={`font-display text-5xl mt-2 ${bandColor}`}>
        {Math.round(injury.score)}<span className="text-2xl text-slate-400">/100</span>
      </p>
      <p className={`text-sm uppercase tracking-wider ${bandColor}`}>{injury.band}</p>
      {injury.flags?.length > 0 && (
        <ul className="text-xs text-slate-400 mt-3 space-y-1">
          {injury.flags.map((f) => (
            <li key={f.flag}>
              <span className="text-sprint-coral">●</span> {f.flag.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimilarCard({ matches }) {
  return (
    <div className="card border-l-4 border-l-sprint-teal">
      <p className="section-eyebrow">Similar athletes</p>
      <ul className="mt-3 space-y-2">
        {matches.slice(0, 5).map((m, i) => (
          <li key={`${m.id}-${i}`} className="flex items-center justify-between text-sm">
            <span className="text-slate-200">
              {m.fullName ?? 'Athlete'}
              {m.country && <span className="text-slate-500 ml-2 text-xs">{m.country}</span>}
            </span>
            <span className="text-sprint-teal text-xs tabular-nums">
              d = {m.distance.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
