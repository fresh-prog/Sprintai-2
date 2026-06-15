import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListVideo, ArrowRight, CheckCircle2, Loader2, AlertCircle, Circle } from 'lucide-react';
import api from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { Reveal } from '../components/Motion.jsx';

const STATUS = {
  COMPLETED:  { icon: CheckCircle2, cls: 'bg-sprint-green/15 text-sprint-green border-sprint-green/30' },
  PROCESSING: { icon: Loader2,      cls: 'bg-sprint-orange/15 text-sprint-orange border-sprint-orange/30', spin: true },
  FAILED:     { icon: AlertCircle,  cls: 'bg-sprint-coral/15 text-sprint-coral border-sprint-coral/30' },
  ACTIVE:     { icon: Circle,       cls: 'bg-sprint-teal/15 text-sprint-teal border-sprint-teal/30' },
};

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.ACTIVE;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${s.cls}`}>
      <Icon className={`h-3.5 w-3.5 ${s.spin ? 'animate-spin' : ''}`} /> {status}
    </span>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions')
      .then(({ data }) => setSessions(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader icon={ListVideo} eyebrow="All Recordings" title="SESSIONS"
        subtitle="Every sprint you have captured or uploaded, newest first." />

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : sessions.length === 0 ? (
        <Reveal><div className="card text-center py-12">
          <p className="text-slate-300 mb-4">No sessions recorded yet.</p>
          <Link to="/capture" className="btn-primary inline-flex">Record your first sprint <ArrowRight className="h-5 w-5" /></Link>
        </div></Reveal>
      ) : (
        <Reveal className="card p-0 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-800/60 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left p-4">Label</th>
                <th className="text-left p-4">Started</th>
                <th className="text-left p-4">Source</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition">
                  <td className="p-4">
                    <Link to={`/sessions/${s.id}`}
                          className="text-sprint-orange hover:text-sprint-orange-bright font-semibold">
                      {s.label}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-300">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded bg-sprint-teal/15 text-sprint-teal border border-sprint-teal/30">
                      {s.source}
                    </span>
                  </td>
                  <td className="p-4"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      )}
    </div>
  );
}
