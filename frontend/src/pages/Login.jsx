import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Globe2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { img } from '../lib/images.js';

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
        <Field id="email" label="Email" type="email" autoComplete="email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField id="password" label="Password" autoComplete="current-password"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="text-sprint-coral text-sm" role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : <>Sign in <ArrowRight className="h-5 w-5" /></>}
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

/* ---------- Shared immersive auth layout ---------- */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100dvh-9rem)]">
      {/* Brand panel */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={img('heroGolden', { w: 1400, q: 80 })} alt="" aria-hidden
             className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 scrim-left" />
        <div className="absolute inset-0 grain" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <p className="section-eyebrow mb-4">AI Talent Discovery</p>
          <h2 className="font-display text-5xl xl:text-6xl text-white leading-[0.95]">
            FIND CHAMPIONS<br /><span className="text-gradient">EVERYWHERE</span>
          </h2>
          <ul className="mt-8 space-y-3 max-w-sm">
            {[[Zap,'A full biomechanics report in under a minute'],
              [Globe2,'Works on any phone, anywhere on earth'],
              [ShieldCheck,'Your data stays private — no paid cloud APIs']].map(([Icon,t]) => (
              <li key={t} className="flex items-center gap-3 text-slate-200">
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/10 text-sprint-orange ring-1 ring-white/15 shrink-0">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md card"
        >
          <p className="section-eyebrow mb-2">Sprint AI</p>
          <h1 className="font-display text-4xl text-white">{title}</h1>
          <p className="text-slate-400 mt-2 mb-6">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Labeled field ---------- */
export function Field({ id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input id={id} className="input" required {...props} />
    </div>
  );
}

export function PasswordField({ id, label, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} className="input pr-11" type={show ? 'text' : 'password'} required {...props} />
        <button type="button" onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
