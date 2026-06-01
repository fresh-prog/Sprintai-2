/**
 * Renders the six sprint phases as a stacked horizontal bar — coach-friendly
 * view of how much of the run was spent in each phase. Colors come from the
 * Sprint AI deck so the same palette is used everywhere.
 */
const PHASE_COLORS = {
  acceleration:     '#ef4444', // coral
  drive:            '#f5a623', // orange
  transition:       '#8b5cf6', // purple
  max_velocity:     '#22c55e', // green
  speed_endurance:  '#1ec5c5', // teal
  finish:           '#ffb330', // bright orange
};

const PHASE_LABEL = {
  acceleration: 'Acceleration',
  drive: 'Drive',
  transition: 'Transition',
  max_velocity: 'Max velocity',
  speed_endurance: 'Speed endurance',
  finish: 'Finish',
};

export default function PhaseTimeline({ phases }) {
  if (!phases?.length) return null;
  const total = phases.reduce((acc, p) => acc + (p.durationMs || 0), 0);
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex h-10 rounded-xl overflow-hidden border border-white/10">
        {phases.map((p, i) => {
          const pct = ((p.durationMs || 0) / total) * 100;
          return (
            <div
              key={`${p.phase}-${i}`}
              style={{ width: `${pct}%`, background: PHASE_COLORS[p.phase] ?? '#475569' }}
              className="relative group transition hover:brightness-110"
              title={`${PHASE_LABEL[p.phase] ?? p.phase} · ${(p.durationMs / 1000).toFixed(2)} s`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-navy-900 opacity-0 group-hover:opacity-100 transition">
                {(p.durationMs / 1000).toFixed(2)}s
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {phases.map((p, i) => (
          <div key={`legend-${p.phase}-${i}`} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: PHASE_COLORS[p.phase] ?? '#475569' }}
            />
            <span className="text-slate-300">{PHASE_LABEL[p.phase] ?? p.phase}</span>
            <span className="text-slate-500">{(p.durationMs / 1000).toFixed(2)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
