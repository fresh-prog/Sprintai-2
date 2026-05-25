import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

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
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card mt-10">
      <h1 className="text-2xl font-bold mb-4">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input" placeholder="Display name" value={form.displayName} onChange={update('displayName')} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
        <input className="input" type="password" placeholder="Password (min 8 chars)" minLength={8} value={form.password} onChange={update('password')} required />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-sm text-slate-600 mt-4">
        Already have one? <Link to="/login" className="text-brand-600">Sign in</Link>
      </p>
    </div>
  );
}
