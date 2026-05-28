import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { AuthShell } from './Login.jsx';

export default function Register() {
  const register = useAuthStore((s) => s.register);
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await register(form.email, form.password, form.displayName);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Join Sprint AI" subtitle="Discover your sprint potential — anywhere, with just a phone.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input" placeholder="Display name"
               value={form.displayName} onChange={update('displayName')} required />
        <input className="input" type="email" placeholder="Email"
               value={form.email} onChange={update('email')} required />
        <input className="input" type="password" placeholder="Password (min 8 chars)"
               minLength={8} value={form.password} onChange={update('password')} required />
        {err && <p className="text-sprint-coral text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account →'}
        </button>
      </form>
      <p className="text-sm text-slate-400 mt-6 text-center">
        Already have one?{' '}
        <Link to="/login" className="text-sprint-orange hover:text-sprint-orange-bright font-semibold">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
