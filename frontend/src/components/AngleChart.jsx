import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AngleChart({ data, dataKey, label, color = '#2563eb' }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tsMs" tickFormatter={(v) => `${(v / 1000).toFixed(1)}s`} />
            <YAxis domain={[0, 180]} unit="°" />
            <Tooltip formatter={(v) => `${v.toFixed(1)}°`} />
            <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
