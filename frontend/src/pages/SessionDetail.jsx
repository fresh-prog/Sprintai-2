import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api, { downloadAuthed } from '../services/api.js';
import AngleChart from '../components/AngleChart.jsx';
import MovementMap from '../components/MovementMap.jsx';
import SkeletonReplay from '../components/SkeletonReplay.jsx';
import Athlete3D from '../components/Athlete3D.jsx';
import SprintScorecard from '../components/SprintScorecard.jsx';
import PhaseTimeline from '../components/PhaseTimeline.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';
import FaultsPanel from '../components/FaultsPanel.jsx';
import EliteFan from '../components/EliteFan.jsx';
import CoachReport from '../components/CoachReport.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const fromDuplicate = search.get('from') === 'duplicate';
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [frames, setFrames] = useState([]);
  const [reprocessing, setReprocessing] = useState(false);

  async function onReprocess() {
    if (!confirm('Re-run pose extraction + sprint analysis on this video? Existing metrics will be replaced.')) return;
    setReprocessing(true);
    try {
      await api.post(`/sessions/${id}/reprocess`);
      // Force a fresh fetch — the polling loop in useEffect will pick up
      // the PROCESSING status and refresh once it completes.
      const { data } = await api.get(`/sessions/${id}/summary`);
      setSummary(data);
    } catch (err) {
      alert(err.response?.data?.error?.message ?? 'Reprocess failed');
    } finally {
      setReprocessing(false);
    }
  }

  function dismissDuplicate() {
    search.delete('from');
    setSearch(search, { replace: true });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, m, f] = await Promise.all([
        api.get(`/sessions/${id}/summary`),
        api.get(`/sessions/${id}/metrics`),
        api.get(`/sessions/${id}/frames`),
      ]);
      if (cancelled) return;
      setSummary(s.data);
      setMetrics(m.data.metrics ?? []);
      setFrames(f.data.frames ?? []);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Poll every 3s while the session is PROCESSING — covers both the upload
  // pipeline and a reprocess kicked off from this page. Keyed on status so
  // the interval starts/stops exactly when processing does.
  const status = summary?.session?.status;
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    let cancelled = false;
    const tick = setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${id}/summary`);
        if (cancelled) return;
        setSummary(data);
        if (data.session?.status !== 'PROCESSING') {
          const [m, f] = await Promise.all([
            api.get(`/sessions/${id}/metrics`),
            api.get(`/sessions/${id}/frames`),
          ]);
          if (cancelled) return;
          setMetrics(m.data.metrics ?? []);
          setFrames(f.data.frames ?? []);
        }
      } catch { /* network blip — try again next tick */ }
    }, 3000);
    return () => { cancelled = true; clearInterval(tick); };
  }, [status, id]);

  const series = useMemo(() => {
    const byTs = new Map();
    for (const m of metrics) {
      if (!byTs.has(m.tsMs)) byTs.set(m.tsMs, { tsMs: m.tsMs });
      byTs.get(m.tsMs)[m.name] = m.value;
    }
    return [...byTs.values()].sort((a, b) => a.tsMs - b.tsMs);
  }, [metrics]);

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

  if (!summary) return <p className="text-slate-300">Loading…</p>;

  const biomech = summary.biomech ?? { rom: {}, symmetry: {}, gait: {} };
  const sprint = summary.sprint ?? {};
  const phases = summary.phases ?? [];
  const cadence = biomech.gait?.cadence_spm;
  const hasBiomech = Object.keys(biomech.rom).length > 0
                     || Object.keys(biomech.symmetry).length > 0
                     || cadence != null;
  const hasSprint = Object.keys(sprint).length > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">{summary.session.event ?? 'Session'}</p>
          <h1 className="font-display text-4xl text-white mt-1">{summary.session.label}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date(summary.session.startedAt).toLocaleString()} · {summary.frameCount} frames
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {summary.session.source === 'UPLOAD' && (
            <button
              className="btn-secondary text-sm"
              onClick={onReprocess}
              disabled={reprocessing || summary.session.status === 'PROCESSING'}
              title="Re-run pose extraction + sprint analysis on the existing video"
            >
              {reprocessing ? 'Queuing…' : '↻ Reprocess'}
            </button>
          )}
          <button className="btn-secondary text-sm"
                  onClick={() => downloadAuthed(`/sessions/${id}/export?format=json`, `session-${id}.json`)}>
            JSON
          </button>
          <button className="btn-secondary text-sm"
                  onClick={() => downloadAuthed(`/sessions/${id}/export?format=csv`, `session-${id}-metrics.csv`)}>
            CSV
          </button>
          <button className="btn-primary text-sm"
                  onClick={() => downloadAuthed(`/sessions/${id}/report.pdf`, `session-${id}-report.pdf`)}>
            PDF report
          </button>
        </div>
      </header>

      {fromDuplicate && <DuplicateBanner onDismiss={dismissDuplicate} />}
      {summary.session.status === 'PROCESSING' && <ProcessingBanner />}
      {summary.session.status === 'FAILED' && <FailedBanner meta={summary.session.meta} />}

      {hasSprint && <CoachReport sessionId={id} />}
      {hasSprint && <SprintScorecard sprint={sprint} />}
      {hasSprint && <InsightsPanel sessionId={id} />}
      {hasSprint && (
        <div className="grid lg:grid-cols-2 gap-6">
          <EliteFan sprint={sprint} />
          <FaultsPanel faults={summary.faults} />
        </div>
      )}

      {phases.length > 0 && (
        <section>
          <h2 className="font-display text-2xl text-white mb-3 tracking-wider">SPRINT PHASES</h2>
          <PhaseTimeline phases={phases} />
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl text-white mb-3 tracking-wider">3D ATHLETE</h2>
        <Athlete3D frames={frames} />
      </section>

      {hasBiomech && (
        <section className="grid sm:grid-cols-3 gap-4">
          {Object.entries(biomech.rom).map(([joint, range]) => (
            <div className="card" key={`rom-${joint}`}>
              <p className="text-sm text-slate-400">ROM · {joint}</p>
              <p className="font-display text-3xl text-sprint-orange mt-1">{range.toFixed(0)}°</p>
            </div>
          ))}
          {Object.entries(biomech.symmetry).map(([pair, idx]) => (
            <div className="card" key={`sym-${pair}`}>
              <p className="text-sm text-slate-400">Symmetry · {pair}</p>
              <p className="font-display text-3xl text-sprint-teal mt-1">{idx.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">lower is better</p>
            </div>
          ))}
          {cadence != null && (
            <div className="card">
              <p className="text-sm text-slate-400">Cadence</p>
              <p className="font-display text-3xl text-sprint-orange mt-1">{cadence.toFixed(0)} <span className="text-base text-slate-400">spm</span></p>
            </div>
          )}
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <AngleChart data={series} dataKey="left_knee"  label="Left knee angle"  color="#1ec5c5" />
        <AngleChart data={series} dataKey="right_knee" label="Right knee angle" color="#f5a623" />
        <AngleChart data={series} dataKey="left_hip"   label="Left hip angle"   color="#22c55e" />
        <AngleChart data={series} dataKey="right_hip"  label="Right hip angle"  color="#ef4444" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="font-display text-2xl text-white mb-3 tracking-wider">SKELETON REPLAY</h2>
          <SkeletonReplay frames={frames} />
        </section>
        <section>
          <h2 className="font-display text-2xl text-white mb-3 tracking-wider">MOVEMENT MAP</h2>
          <MovementMap points={trajectory} />
        </section>
      </div>
    </div>
  );
}

function ProcessingBanner() {
  return (
    <div className="card border-l-4 border-l-sprint-orange flex items-center gap-4">
      <div className="w-3 h-3 rounded-full bg-sprint-orange animate-pulse" />
      <div>
        <p className="font-display text-xl text-white">Analyzing video…</p>
        <p className="text-slate-400 text-sm">
          Extracting pose frames and running sprint analysis. This usually takes 10–40 seconds
          depending on video length. The page will refresh automatically.
        </p>
      </div>
    </div>
  );
}

function FailedBanner({ meta }) {
  return (
    <div className="card border-l-4 border-l-sprint-coral">
      <p className="font-display text-xl text-white">Analysis failed</p>
      <p className="text-slate-400 text-sm mt-1">
        {meta?.error ?? meta?.reason ?? 'Unknown error during processing.'}
      </p>
      <p className="text-slate-500 text-xs mt-3">
        Common causes: athlete not visible in frame, video too short (&lt; 1 s),
        unsupported codec. Try a side-view clip with the full body visible.
      </p>
    </div>
  );
}

function DuplicateBanner({ onDismiss }) {
  return (
    <div className="card border-l-4 border-l-sprint-teal flex items-start gap-4">
      <div className="flex-1">
        <p className="font-display text-xl text-white">Duplicate upload — opened existing session</p>
        <p className="text-slate-400 text-sm mt-1">
          We detected the exact same video file you'd uploaded before, so we brought you to the
          original session instead of re-processing it. Use <span className="text-sprint-teal">↻ Reprocess</span>
          {' '}above if you want to re-run the analysis with the latest scoring rules.
        </p>
      </div>
      <button onClick={onDismiss} className="btn-ghost text-xs">Dismiss</button>
    </div>
  );
}
