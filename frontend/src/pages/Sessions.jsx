import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions')
      .then(({ data }) => setSessions(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">All Recordings</p>
        <h1 className="font-display text-5xl text-white mt-2">SESSIONS</h1>
      </header>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-300 mb-4">No sessions recorded yet.</p>
          <Link to="/capture" className="btn-primary">Record your first sprint →</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
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
                  <td className="p-4 text-slate-300">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
