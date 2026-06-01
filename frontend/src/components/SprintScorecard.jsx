/**
 * Hero scorecard for a finalized sprint session. Shows the composite Sprint
 * Score + Technique Score and the six elite-benchmarked sub-metrics that
 * feed into the technique score.
 *
 * The `sprint` prop comes from GET /sessions/:id/summary → `sprint`, which is
 * the pivoted version of the `sprint.*` Metric rows the finalizer writes.
 */
export default function SprintScorecard({ sprint }) {
  if (!sprint) return null;

  const score = num(sprint.sprint_score);
  const tech = num(sprint.technique_score);

  return (
    <section className="card border border-sprint-orange/30 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <ScoreRing label="Sprint Score" value={score} color="sprint-orange" />
        <ScoreRing label="Technique" value={tech} color="sprint-teal" />
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Metric label="Stride freq" v={sprint.stride_freq_hz} unit="Hz" target={4.7} sigma={0.8} />
          <Metric label="Stride len"  v={sprint.stride_len_norm} unit="× leg" target={2.6} sigma={0.5} />
          <Metric label="GCT"          v={sprint.gct_ms} unit="ms" target={92} sigma={25} invert />
          <Metric label="Trunk lean"   v={sprint.trunk_lean_deg} unit="°" target={7.5} sigma={5} />
          <Metric label="Knee drive"   v={sprint.knee_drive_deg} unit="°" target={95} sigma={20} />
          <Metric label="Arm swing"    v={sprint.arm_swing_deg} unit="°" target={85} sigma={25} />
        </div>
      </div>
    </section>
  );
}

function ScoreRing({ label, value, color }) {
  const pct = Math.max(0, Math.min(value, 100));
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const ringClass = color === 'sprint-orange' ? 'stroke-sprint-orange' : 'stroke-sprint-teal';
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} className="stroke-white/10" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={r}
          className={ringClass}
          strokeWidth="10" strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60" y="65"
          textAnchor="middle"
          className="fill-white font-display"
          style={{ fontSize: 32 }}
        >
          {Math.round(pct)}
        </text>
      </svg>
      <p className="text-sm text-slate-400 mt-2">{label}</p>
    </div>
  );
}

function Metric({ label, v, unit, target, sigma, invert = false }) {
  const valueStr = v == null ? '—' : Number(v).toFixed(unit === 'ms' || unit === '°' ? 0 : 2);
  // Color the value based on proximity to target (Gaussian on Δ/σ).
  let tone = 'text-slate-200';
  if (typeof v === 'number' && target) {
    const z = Math.abs(v - target) / sigma;
    const score = Math.exp(-0.5 * z * z);
    if (score > 0.85) tone = 'text-sprint-green';
    else if (score > 0.55) tone = 'text-sprint-orange';
    else tone = 'text-sprint-coral';
  }
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`font-display text-xl ${tone}`}>
        {valueStr}
        <span className="text-xs text-slate-500 ml-1">{unit}</span>
      </p>
      <p className="text-[10px] text-slate-600">
        elite {invert ? '≤' : '≈'} {target} {unit}
      </p>
    </div>
  );
}

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }
