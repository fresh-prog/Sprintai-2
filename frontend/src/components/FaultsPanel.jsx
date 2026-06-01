/**
 * Renders per-frame technique-fault counts + a few representative samples.
 * Backed by `summary.faults` on GET /sessions/:id/summary.
 */
const SEVERITY_COLOR = {
  info: 'text-slate-400',
  minor: 'text-sprint-teal',
  major: 'text-sprint-orange',
  critical: 'text-sprint-coral',
};

const TAG_LABEL = {
  overstride: 'Overstride',
  knee_collapse: 'Knee collapse',
  heel_strike: 'Heel strike',
  arm_cross_body: 'Arm cross-body',
  excessive_trunk_lean: 'Excessive trunk lean',
};

export default function FaultsPanel({ faults }) {
  const counts = faults?.counts ?? {};
  const samples = faults?.samples ?? [];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <section>
      <h2 className="font-display text-2xl text-white mb-3 tracking-wider">TECHNIQUE FAULTS</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="section-eyebrow">Detected</p>
          <ul className="mt-3 space-y-2">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, n]) => (
                <li key={tag} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{TAG_LABEL[tag] ?? tag}</span>
                  <span className="text-sprint-orange font-display text-xl">{n}</span>
                </li>
              ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Counts are per-frame occurrences. A single physical fault that lasts
            10 frames will show 10 here.
          </p>
        </div>

        <div className="card">
          <p className="section-eyebrow">Sample timestamps</p>
          <ul className="mt-3 space-y-2 text-sm">
            {samples.slice(0, 8).map((s, i) => (
              <li key={`${s.tsMs}-${s.tag}-${i}`} className="flex items-start gap-3">
                <span className="text-slate-500 tabular-nums w-14 shrink-0">
                  {(s.tsMs / 1000).toFixed(2)}s
                </span>
                <div>
                  <span className={`${SEVERITY_COLOR[s.severity] ?? 'text-slate-300'} font-medium`}>
                    {TAG_LABEL[s.tag] ?? s.tag}
                  </span>
                  {s.joint && <span className="text-slate-500 text-xs ml-2">{s.joint}</span>}
                  <p className="text-slate-400 text-xs mt-0.5">{s.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
