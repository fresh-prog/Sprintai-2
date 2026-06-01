import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const EVENTS = [
  { id: 'S100M', label: '100m' },
  { id: 'S200M', label: '200m' },
  { id: 'S400M', label: '400m' },
  { id: 'RELAY', label: 'Relay' },
  { id: 'PRACTICE', label: 'Practice' },
];

const FLAG = (cc) => cc ? cc.toUpperCase() : '';

export default function Athletes() {
  const user = useAuthStore((s) => s.user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/athletes');
      setList(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const canAdd = user?.role === 'COACH' || user?.role === 'ADMIN' || user?.role === 'ATHLETE';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">{roleLabel(user?.role)}</p>
          <h1 className="font-display text-5xl text-white mt-2">ATHLETES</h1>
          <p className="text-slate-300 mt-2 max-w-2xl">
            {user?.role === 'COACH' ? 'Your roster of sprinters.'
              : user?.role === 'RESEARCHER' ? 'Anonymized athlete records you have access to.'
              : 'Manage your athlete profile and sprint history.'}
          </p>
        </div>
        {canAdd && (
          <button className="btn-primary text-sm" onClick={() => setShowNew(true)}>
            + Add athlete
          </button>
        )}
      </header>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : list.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-300 mb-4">No athletes yet.</p>
          {canAdd && (
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              Add your first athlete
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((a) => <AthleteCard key={a.id} athlete={a} />)}
        </div>
      )}

      {showNew && <NewAthleteModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function AthleteCard({ athlete }) {
  const age = athlete.dateOfBirth
    ? Math.floor((Date.now() - new Date(athlete.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const ev = EVENTS.find((e) => e.id === athlete.primaryEvent)?.label ?? athlete.primaryEvent;
  return (
    <div className="card hover:border-sprint-orange/40 transition">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-2xl text-white">{athlete.fullName}</div>
        <span className="text-xs px-2 py-0.5 rounded bg-sprint-orange/15 text-sprint-orange border border-sprint-orange/30">
          {ev}
        </span>
      </div>
      <dl className="text-sm text-slate-300 space-y-1">
        {athlete.country && <Row k="Country" v={`${FLAG(athlete.country)}`} />}
        {age != null && <Row k="Age" v={`${age} yr`} />}
        {athlete.sex && <Row k="Sex" v={athlete.sex} />}
        {athlete.heightCm && <Row k="Height" v={`${athlete.heightCm} cm`} />}
        {athlete.weightKg && <Row k="Weight" v={`${athlete.weightKg} kg`} />}
      </dl>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-slate-200">{v}</dd>
    </div>
  );
}

function NewAthleteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: '', primaryEvent: 'S100M',
    country: '', sex: '', heightCm: '', weightKg: '', dateOfBirth: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = {
        fullName: form.fullName,
        primaryEvent: form.primaryEvent,
        country: form.country || undefined,
        sex: form.sex || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      };
      await api.post('/athletes', body);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Failed to save');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="card border border-sprint-teal/30 w-full max-w-lg">
        <h2 className="font-display text-3xl text-white mb-4">Add athlete</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Full name" value={form.fullName}
                 onChange={upd('fullName')} required />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.primaryEvent} onChange={upd('primaryEvent')}>
              {EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.label}</option>)}
            </select>
            <input className="input" placeholder="Country (ISO, e.g. UG)"
                   maxLength={2} value={form.country} onChange={upd('country')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select className="input" value={form.sex} onChange={upd('sex')}>
              <option value="">Sex (—)</option>
              <option value="M">M</option><option value="F">F</option><option value="X">X</option>
            </select>
            <input className="input" type="number" placeholder="Height (cm)"
                   value={form.heightCm} onChange={upd('heightCm')} />
            <input className="input" type="number" placeholder="Weight (kg)"
                   value={form.weightKg} onChange={upd('weightKg')} />
          </div>
          <input className="input" type="date" value={form.dateOfBirth} onChange={upd('dateOfBirth')} />
          {err && <p className="text-sprint-coral text-sm">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Save athlete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function roleLabel(role) {
  return {
    COACH: 'Coach roster', RESEARCHER: 'Research access',
    ATHLETE: 'My profile', ADMIN: 'Admin · All athletes',
    USER: 'Athletes',
  }[role] ?? 'Athletes';
}
