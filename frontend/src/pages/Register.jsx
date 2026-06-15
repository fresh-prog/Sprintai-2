import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { AuthShell, Field, PasswordField } from './Login.jsx';

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
        <Field id="displayName" label="Display name" autoComplete="name"
               value={form.displayName} onChange={update('displayName')} />
        <Field id="email" label="Email" type="email" autoComplete="email"
               value={form.email} onChange={update('email')} />
        <PasswordField id="password" label="Password" autoComplete="new-password"
               minLength={8} value={form.password} onChange={update('password')} />
        <p className="text-xs text-slate-500">Minimum 8 characters.</p>
        {err && <p className="text-sprint-coral text-sm" role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : <>Create account <ArrowRight className="h-5 w-5" /></>}
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
