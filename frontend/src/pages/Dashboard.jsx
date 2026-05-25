import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

export default function Dashboard() {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    api.get('/sessions?limit=5').then(({ data }) => setRecent(data.data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/capture" className="card hover:shadow-md transition">
          <p className="text-sm text-slate-500">Start a session</p>
          <p className="text-xl font-semibold">Live webcam capture</p>
        </Link>
        <Link to="/sessions" className="card hover:shadow-md transition">
          <p className="text-sm text-slate-500">Browse</p>
          <p className="text-xl font-semibold">All sessions</p>
        </Link>
        <div className="card">
          <p className="text-sm text-slate-500">Recent</p>
          <p className="text-xl font-semibold">{recent.length} session{recent.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-2">Recent sessions</h2>
        <ul className="divide-y border rounded-2xl bg-white">
          {recent.length === 0 && <li className="p-4 text-slate-500">No sessions yet — start one!</li>}
          {recent.map((s) => (
            <li key={s.id} className="p-4 flex items-center justify-between">
              <div>
                <Link to={`/sessions/${s.id}`} className="font-medium text-brand-700 hover:underline">
                  {s.label}
                </Link>
                <p className="text-sm text-slate-500">{new Date(s.startedAt).toLocaleString()} · {s.status}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">{s.source}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
