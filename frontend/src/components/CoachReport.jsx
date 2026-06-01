import { useEffect, useState } from 'react';
import api from '../services/api.js';

/**
 * Coach-facing hero for the session detail page.
 *
 *   • Tier badge (ELITE / HIGH_PERFORMANCE / DEVELOPING / HIGH_POTENTIAL /
 *     DEVELOPMENTAL) + a one-sentence description.
 *   • Peak-sprinter comparison table — your metrics vs Bolt's peak,
 *     Olympic-finalist mean, national-elite mean, sub-elite mean.
 *   • Prioritized recommendations — the cue a coach would yell mid-rep
 *     plus 2–3 named drills per item.
 */
export default function CoachReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/sessions/${sessionId}/coach-report`)
      .then(({ data }) => { if (!cancelled) setReport(data); })
      .catch(() => { if (!cancelled) setReport({ ok: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) return null;
  if (!report?.ok) return null;

  const { tier, comparison, recommendations } = report;

  return (
    <section className="space-y-6">
      <TierHero tier={tier} />
      <PeakComparison rows={comparison} />
      <Recommendations items={recommendations} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tier hero                                                                  */
/* -------------------------------------------------------------------------- */

const TIER_STYLE = {
  ELITE:            { label: 'ELITE',            bg: 'from-sprint-orange to-sprint-coral', text: 'text-navy-900' },
  HIGH_PERFORMANCE: { label: 'HIGH PERFORMANCE', bg: 'from-sprint-orange to-sprint-orange-deep', text: 'text-navy-900' },
  DEVELOPING:       { label: 'DEVELOPING',       bg: 'from-sprint-teal to-sprint-teal-deep', text: 'text-navy-900' },
  HIGH_POTENTIAL:   { label: 'HIGH POTENTIAL',   bg: 'from-sprint-purple to-sprint-teal-deep', text: 'text-white' },
  DEVELOPMENTAL:    { label: 'DEVELOPMENTAL',    bg: 'from-slate-600 to-slate-700', text: 'text-white' },
};

function TierHero({ tier }) {
  const style = TIER_STYLE[tier.tier] ?? TIER_STYLE.DEVELOPMENTAL;
  return (
    <div className="card border border-sprint-orange/40 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className={`rounded-xl bg-gradient-to-br ${style.bg} ${style.text}
                          px-6 py-5 text-center shrink-0 min-w-[200px]`}>
          <p className="text-xs uppercase tracking-[0.2em] opacity-80">Athlete tier</p>
          <p className="font-display text-3xl mt-1 leading-none">{style.label}</p>
          {tier.predicted_100m_s != null && (
            <p className="text-sm mt-3 opacity-90">
              Predicted 100m{' '}
              <span className="font-display text-2xl">
                {tier.predicted_100m_s.toFixed(2)}
              </span>
              s
            </p>
          )}
        </div>
        <div className="flex-1">
          <p className="section-eyebrow">Coach summary</p>
          <h2 className="font-display text-2xl text-white mt-1 mb-3 leading-snug">
            {tier.description}
          </h2>
          <p className="text-sm text-slate-400">
            Composite Sprint Score:{' '}
            <span className="text-sprint-orange font-display text-xl">
              {Math.round(tier.score)}
            </span>{' '}
            / 100
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Peak comparison table                                                      */
/* -------------------------------------------------------------------------- */

const STATUS_STYLE = {
  at_or_above_target: { color: 'text-sprint-green', label: 'At / above target' },
  near_target:        { color: 'text-sprint-teal',  label: 'Near target' },
  below_target:       { color: 'text-sprint-orange',label: 'Below target' },
  far_below_target:   { color: 'text-sprint-coral', label: 'Far below target' },
};

function PeakComparison({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="card">
      <p className="section-eyebrow">Peak-sprinter comparison</p>
      <h3 className="font-display text-2xl text-white mt-1 mb-4">VS THE WORLD'S BEST</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left pb-2">Metric</th>
              <th className="text-right pb-2">Athlete</th>
              <th className="text-right pb-2">Olympic mean</th>
              <th className="text-right pb-2">Bolt peak</th>
              <th className="text-right pb-2">National elite</th>
              <th className="text-right pb-2">Δ vs Olympic</th>
              <th className="text-right pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => {
              const status = STATUS_STYLE[r.status] ?? { color: 'text-slate-400', label: r.status };
              return (
                <tr key={r.metric}>
                  <td className="py-2 text-slate-200">{r.label}</td>
                  <td className="text-right text-sprint-orange tabular-nums">
                    {fmt(r.value, r.unit)}
                  </td>
                  <td className="text-right text-slate-300 tabular-nums">{fmt(r.olympic_mean, r.unit)}</td>
                  <td className="text-right text-slate-300 tabular-nums">{fmt(r.bolt_peak, r.unit)}</td>
                  <td className="text-right text-slate-300 tabular-nums">{fmt(r.national, r.unit)}</td>
                  <td className={`text-right tabular-nums ${r.delta_pct >= 0 ? 'text-sprint-green' : 'text-sprint-coral'}`}>
                    {r.delta_pct >= 0 ? '+' : ''}{r.delta_pct.toFixed(1)}%
                  </td>
                  <td className={`text-right ${status.color} text-xs`}>{status.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 mt-3">
        Sources: Bolt 2009 Berlin WR (Graubner & Nixdorf 2011), Olympic finalist means
        (Mann 2011; Weyand et al. 2000), Mero & Komi (1986).
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                            */
/* -------------------------------------------------------------------------- */

const PRIORITY_STYLE = {
  1: { ribbon: 'border-l-sprint-coral',  badge: 'bg-sprint-coral text-white',    label: 'P1 · Top priority' },
  2: { ribbon: 'border-l-sprint-orange', badge: 'bg-sprint-orange text-navy-900',label: 'P2 · High' },
  3: { ribbon: 'border-l-sprint-teal',   badge: 'bg-sprint-teal text-navy-900',  label: 'P3 · Medium' },
  4: { ribbon: 'border-l-sprint-green',  badge: 'bg-sprint-green text-navy-900', label: 'P4 · Maintenance' },
  5: { ribbon: 'border-l-slate-500',     badge: 'bg-slate-500 text-white',       label: 'P5 · Low' },
};

function Recommendations({ items }) {
  if (!items?.length) {
    return (
      <div className="card">
        <p className="section-eyebrow">Coaching recommendations</p>
        <h3 className="font-display text-2xl text-white mt-1 mb-2">DRILLS TO PRESCRIBE</h3>
        <p className="text-slate-400 text-sm">
          Mechanics are within or above elite benchmarks across the board. Continue current
          training; focus on volume + race tactics rather than technical drills.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="section-eyebrow">Coaching recommendations</p>
      <h3 className="font-display text-2xl text-white mt-1 mb-4">DRILLS TO PRESCRIBE</h3>
      <ol className="space-y-3">
        {items.map((rec, i) => {
          const style = PRIORITY_STYLE[rec.priority] ?? PRIORITY_STYLE[5];
          return (
            <li key={`${rec.title}-${i}`} className={`card border-l-4 ${style.ribbon}`}>
              <div className="flex flex-wrap items-baseline gap-3 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.badge}`}>
                  {style.label}
                </span>
                <h4 className="font-display text-xl text-white">{rec.title}</h4>
                {rec.source === 'fault' && rec.count != null && (
                  <span className="text-xs text-slate-500">
                    {rec.count} occurrence{rec.count === 1 ? '' : 's'} in this run
                  </span>
                )}
                {rec.source === 'metric_gap' && rec.current != null && rec.target != null && (
                  <span className="text-xs text-slate-500">
                    {fmt(rec.current)} → target {fmt(rec.target)}
                  </span>
                )}
              </div>
              <p className="text-slate-200 italic">"{rec.cue}"</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                {rec.drills?.map((d, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="text-sprint-orange shrink-0">▸</span>
                    <span>
                      <span className="text-white font-medium">{d.name}</span>
                      <span className="text-slate-400"> — {d.instructions}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- helpers */

function fmt(value, unit = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const places = unit === 'ms' || unit === '°' ? 0 : 2;
  return `${value.toFixed(places)}${unit ? ' ' + unit : ''}`;
}
