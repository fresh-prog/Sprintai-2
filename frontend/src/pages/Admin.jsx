import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Admin() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/admin/overview').then(({ data }) => setData(data)).catch(() => setData(null));
  }, []);
  if (!data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin overview</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Users" value={data.users} />
        <Stat label="Sessions" value={data.sessions} />
        <Stat label="Pose frames" value={data.frames} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
