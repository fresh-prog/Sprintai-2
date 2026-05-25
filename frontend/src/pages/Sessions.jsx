import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions').then(({ data }) => setSessions(data.data ?? [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <div className="card p-0 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Label</th>
              <th className="text-left p-3">Started</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">
                  <Link to={`/sessions/${s.id}`} className="text-brand-700 hover:underline">{s.label}</Link>
                </td>
                <td className="p-3">{new Date(s.startedAt).toLocaleString()}</td>
                <td className="p-3">{s.source}</td>
                <td className="p-3">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
