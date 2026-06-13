import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Upload as UploadIcon, Users, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sessions?limit=5')
      .then(({ data }) => setRecent(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <header>
        <p className="section-eyebrow">Athlete Dashboard</p>
        <h1 className="font-display text-5xl md:text-6xl text-white mt-2">
          Welcome, <span className="text-sprint-orange">{user?.displayName || 'Athlete'}</span>
        </h1>
        <p className="text-slate-300 mt-3 max-w-2xl">
          Record a sprint, get a biomechanical talent score, and see how your form stacks up
          against elite profiles.
        </p>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <ActionCard
          to="/capture" Icon={Camera}
          eyebrow="01 · Record live"
          title="Webcam capture"
          body="Stream from any webcam — 33 body landmarks per frame, real-time scoring."
          accent="teal"
        />
        <ActionCard
          to="/upload" Icon={UploadIcon}
          eyebrow="02 · Upload"
          title="Sprint video"
          body="Drop a 100m or 200m MP4. Returns stride mechanics, phase timeline, and a sprint score."
          accent="orange"
        />
        <ActionCard
          to="/athletes" Icon={Users}
          eyebrow="03 · Roster"
          title="Athletes"
          body="Coach view of every athlete on your roster — primary event, stats, history."
          accent="coral"
        />
        <div className="card-stat min-h-[200px]">
          <div className="stat-number">{recent.length}</div>
          <div className="stat-label">
            recent {recent.length === 1 ? 'session' : 'sessions'} on file
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-3xl text-white tracking-wide">RECENT SESSIONS</h2>
          {recent.length > 0 && (
            <Link to="/sessions" className="text-sprint-teal hover:text-white text-sm">
              View all →
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-300 mb-4">No sessions yet — record your first sprint.</p>
            <Link to="/capture" className="btn-primary">Start a capture →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-navy-700/40 overflow-hidden">
            {recent.map((s) => (
              <li key={s.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                <div>
                  <Link to={`/sessions/${s.id}`} className="font-semibold text-white hover:text-sprint-orange">
                    {s.label}
                  </Link>
                  <p className="text-sm text-slate-400">
                    {new Date(s.startedAt).toLocaleString()} · {s.status}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-sprint-teal/15 text-sprint-teal border border-sprint-teal/30">
                  {s.source}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WhatWeMeasure />
    </div>
  );
}

function ActionCard({ to, eyebrow, title, body, accent, Icon }) {
  const accentClass = {
    teal: 'border-sprint-teal/40 hover:border-sprint-teal',
    orange: 'border-sprint-orange/40 hover:border-sprint-orange',
    coral: 'border-sprint-coral/40 hover:border-sprint-coral',
  }[accent];
  const iconWrap = {
    teal: 'bg-sprint-teal/15 text-sprint-teal ring-sprint-teal/30',
    orange: 'bg-sprint-orange/15 text-sprint-orange ring-sprint-orange/30',
    coral: 'bg-sprint-coral/15 text-sprint-coral ring-sprint-coral/30',
  }[accent];
  return (
    <Link
      to={to}
      className={`card card-hover ${accentClass} group block`}
    >
      {Icon && (
        <span className={`inline-grid place-items-center h-11 w-11 rounded-xl ring-1 mb-4 ${iconWrap}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <p className="section-eyebrow">{eyebrow}</p>
      <h3 className="font-display text-3xl text-white mt-2 group-hover:text-sprint-orange transition flex items-center gap-2">
        {title}
        <ArrowRight className="h-5 w-5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </h3>
      <p className="text-slate-300 mt-2">{body}</p>
    </Link>
  );
}

function WhatWeMeasure() {
  const items = [
    'Stride length & frequency', 'Ground contact time', 'Hip extension angle',
    'Arm drive mechanics',       'Acceleration curve',  'Reaction time patterns',
  ];
  return (
    <section className="card border border-sprint-teal/30">
      <p className="section-eyebrow">What we measure</p>
      <h3 className="font-display text-3xl text-white mt-2 mb-4">YOUR BIOMECHANICAL SIGNATURE</h3>
      <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((m) => (
          <li key={m} className="flex items-center gap-3 text-slate-200">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-sprint-orange/15 text-sprint-orange shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            {m}
          </li>
        ))}
      </ul>
    </section>
  );
}
