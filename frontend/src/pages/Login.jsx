import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your assessment.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input" type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password"
               value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="text-sprint-coral text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-slate-400 mt-6 text-center">
        No account?{' '}
        <Link to="/register" className="text-sprint-orange hover:text-sprint-orange-bright font-semibold">
          Get started
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md card border border-sprint-teal/30">
        <p className="section-eyebrow mb-2">Sprint AI</p>
        <h1 className="font-display text-4xl text-white">{title}</h1>
        <p className="text-slate-400 mt-2 mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
