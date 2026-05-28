import { Link } from 'react-router-dom';

/**
 * Landing page — mirrors the Sprint AI deck slide-for-slide.
 *
 * Sections (one per slide):
 *  1. Hero            — title, tagline, 9.58s / 19.19s / 200M+ stats
 *  2. The Problem     — 4 problem cards
 *  3. Scale of Missed Talent — 3 metrics + Bolt quote
 *  4. The Solution    — 5 numbered steps
 *  5. How It Works    — 5-step flow + "What the AI measures"
 *  6. Expected Impact — 4 outcome cards + 3 stat cards
 *  7. Conclusion      — 4 roadmap phases + CTA
 */
export default function Landing() {
  return (
    <div className="text-slate-100">
      <Hero />
      <Problem />
      <Scale />
      <Solution />
      <HowItWorks />
      <Impact />
      <Conclusion />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 1 — Hero                                                              */
/* -------------------------------------------------------------------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sprint-coral via-sprint-orange to-sprint-teal" />
      <div className="max-w-7xl mx-auto px-6 pt-20 md:pt-28 pb-16">
        <p className="section-eyebrow mb-6">Class Presentation · AI Project Proposal</p>
        <h1 className="font-display text-7xl sm:text-8xl md:text-[10rem] text-white leading-[0.85]">
          SPRINT AI
        </h1>
        <p className="mt-6 text-sprint-orange text-lg md:text-2xl italic font-medium max-w-3xl">
          Discovering World-Class 100m – 200m Talent with Artificial Intelligence
        </p>
        <div className="mt-6 h-px w-64 bg-sprint-teal/70" />
        <p className="mt-6 text-slate-300 text-lg">The Problem. The Solution. The Future.</p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
          <StatCard value="9.58s" label="World Record 100m" />
          <StatCard value="19.19s" label="World Record 200m" />
          <StatCard value="200M+" label="Untapped Athletes" />
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary">Get assessed →</Link>
          <a href="#problem" className="btn-secondary">See the problem</a>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="card-stat">
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 2 — The Problem                                                       */
/* -------------------------------------------------------------------------- */
function Problem() {
  const items = [
    { icon: '🌍', title: 'Geographic Bias',
      body: 'Scouts concentrate on wealthy urban areas. Rural and developing regions are almost entirely ignored.' },
    { icon: '💰', title: 'Cost Barrier',
      body: 'Formal talent programs are expensive. Only families with resources can access proper training & exposure.' },
    { icon: '👁', title: 'Human Subjectivity',
      body: 'Coaches rely on gut feeling and visual cues. Many bio-mechanical gifts are invisible to the naked eye.' },
    { icon: '⏳', title: 'Late Detection',
      body: "Most athletes are only 'discovered' at 16–18. Prime development windows at age 10–14 are lost forever." },
  ];
  return (
    <section id="problem" className="section bg-navy-800/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Slide 02 / 07" title="THE PROBLEM" accent="coral" />
        <p className="mt-4 text-slate-300 italic max-w-3xl">
          Every year, thousands of potential sprint champions go undiscovered — not because they
          lack talent, but because the traditional scouting system is broken.
        </p>
        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {items.map((it) => (
            <div key={it.title} className="card-bordered-coral">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{it.icon}</span>
                <h3 className="font-display text-2xl text-white">{it.title}</h3>
              </div>
              <p className="text-slate-300">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 3 — The Scale of Missed Talent                                        */
/* -------------------------------------------------------------------------- */
function Scale() {
  const metrics = [
    { v: '97%',     l: 'of sprint talent in Africa, Asia & South America never reaches a professional coach' },
    { v: '~10K',    l: 'certified sprint scouts exist globally, yet 8 billion people live on Earth' },
    { v: '4 Years', l: "average delay between an athlete's peak potential window and their first formal assessment" },
  ];
  return (
    <section className="section">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Slide 03 / 07" title="THE SCALE OF MISSED TALENT" accent="teal" />
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {metrics.map((m) => (
            <div key={m.v} className="card-stat min-h-[220px]">
              <div className="stat-number">{m.v}</div>
              <div className="w-12 h-px bg-sprint-teal mt-3 mb-4" />
              <div className="stat-label">{m.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 card border-l-4 border-l-sprint-orange">
          <p className="text-lg md:text-xl italic text-slate-100 text-center">
            “The next Usain Bolt may be running barefoot in a village somewhere — and nobody will ever know.”
          </p>
          <p className="mt-3 text-center text-sprint-orange text-sm">— The Untapped Athletic Potential Crisis</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 4 — The Solution                                                      */
/* -------------------------------------------------------------------------- */
function Solution() {
  const steps = [
    { n: '01', title: 'Video Capture',       accent: 'teal',
      body: 'Athlete films a 40m run on any smartphone. No lab or special equipment needed.' },
    { n: '02', title: 'Pose Estimation AI',  accent: 'orange',
      body: 'Computer vision extracts 33 body landmarks per frame — stride length, cadence, arm drive, ground contact time.' },
    { n: '03', title: 'Talent Score',        accent: 'coral',
      body: 'ML model compares biomechanical signature against elite athlete profiles to produce a potential score.' },
    { n: '04', title: 'Personalized Feedback', accent: 'purple',
      body: 'Athlete receives specific coaching tips, training plans, and drill recommendations instantly.' },
    { n: '05', title: 'Global Talent Map',   accent: 'green',
      body: 'Anonymized data builds a live world map of sprint potential, connecting athletes to scouts and programs.' },
  ];
  return (
    <section className="section bg-gradient-to-b from-sprint-orange/[0.06] to-transparent border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Slide 04 / 07" title="THE SOLUTION · SPRINT AI" accent="orange" />
        <p className="mt-4 text-slate-300 max-w-3xl">
          An AI-powered platform that uses computer vision, biomechanical analysis, and machine
          learning to identify sprint potential anywhere in the world.
        </p>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className={`card-bordered-${s.accent}`}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className={`font-display text-4xl text-sprint-${s.accent}`}>{s.n}</span>
                <h3 className="font-display text-2xl text-white">{s.title}</h3>
              </div>
              <p className="text-slate-300">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 5 — How It Works                                                      */
/* -------------------------------------------------------------------------- */
function HowItWorks() {
  const flow = [
    { icon: '📱', label: 'Record',  body: 'Film a short sprint on any phone',     color: 'orange' },
    { icon: '☁️', label: 'Upload',  body: 'Video sent to AI cloud server',        color: 'teal'   },
    { icon: '🤖', label: 'Analyze', body: 'Pose AI extracts 33 body keypoints',   color: 'orange' },
    { icon: '📊', label: 'Score',   body: 'ML model produces talent score',       color: 'teal'   },
    { icon: '🏆', label: 'Connect', body: 'Top athletes linked to coaches',       color: 'orange' },
  ];
  const measures = [
    'Stride length & frequency', 'Ground contact time', 'Hip extension angle',
    'Arm drive mechanics',       'Acceleration curve',  'Reaction time patterns',
  ];
  return (
    <section className="section">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Slide 05 / 07" title="HOW IT WORKS" accent="orange" />
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-6">
          {flow.map((f, i) => (
            <div key={f.label} className="flex flex-col items-center text-center">
              <div className={`w-24 h-24 rounded-full bg-sprint-${f.color} flex items-center justify-center text-4xl shadow-xl`}>
                {f.icon}
              </div>
              <h4 className="font-display text-2xl text-white mt-4">{f.label}</h4>
              <p className="text-slate-400 text-sm mt-1">{f.body}</p>
              {i < flow.length - 1 && (
                <div className="hidden md:block absolute" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 card border border-sprint-teal/40">
          <h3 className="font-display text-2xl text-sprint-teal mb-4 tracking-wider">
            WHAT THE AI MEASURES
          </h3>
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {measures.map((m) => (
              <li key={m} className="flex items-center gap-2 text-slate-200">
                <span className="text-sprint-orange">✦</span> {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 6 — Expected Impact & Outcomes                                        */
/* -------------------------------------------------------------------------- */
function Impact() {
  const outcomes = [
    { t: 'Democratize Talent Access',  b: 'Any child, anywhere on earth, can be evaluated fairly using only a phone.' },
    { t: 'Accelerate Development',     b: 'Early identification at age 10–12 allows years of proper coaching before peak performance age.' },
    { t: 'Eliminate Bias',             b: 'AI evaluates biomechanics, not appearance, background, or coach relationships.' },
    { t: 'Build National Programs',    b: 'Governments & athletics federations gain a data-driven pipeline for national squads.' },
  ];
  const stats = [
    { v: '1M+', l: 'Athletes Assessed in Year One' },
    { v: '80%', l: 'Cost Reduction vs Traditional Scouting' },
    { v: '3×',  l: 'More Diverse Athlete Pipeline' },
  ];
  return (
    <section className="section bg-sprint-green/[0.06] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Slide 06 / 07" title="EXPECTED IMPACT & OUTCOMES" accent="green" />
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {outcomes.map((o) => (
              <div key={o.t} className="card-bordered-green">
                <h4 className="font-display text-2xl text-white">{o.t}</h4>
                <p className="text-slate-300 mt-2">{o.b}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {stats.map((s) => (
              <div key={s.v} className="card-stat min-h-[160px]">
                <div className="stat-number">{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 7 — Conclusion & Next Steps                                           */
/* -------------------------------------------------------------------------- */
function Conclusion() {
  const phases = [
    { icon: '📐', t: 'Phase 1', b: 'Build & train the pose estimation model on sprint video datasets' },
    { icon: '📱', t: 'Phase 2', b: 'Develop mobile app MVP and test with local athletics club' },
    { icon: '🌍', t: 'Phase 3', b: 'Launch pilot in 3 countries, collect real athlete data' },
    { icon: '🥇', t: 'Phase 4', b: 'Partner with national athletics federations for full rollout' },
  ];
  return (
    <section className="section relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sprint-coral via-sprint-orange to-sprint-teal" />
      <div className="max-w-7xl mx-auto px-6">
        <p className="section-eyebrow">Slide 07 / 07</p>
        <h2 className="font-display text-5xl md:text-7xl text-white leading-none mt-3">
          CONCLUSION &<br/>NEXT STEPS
        </h2>
        <div className="h-1 w-48 bg-sprint-orange mt-6" />
        <p className="mt-6 text-slate-200 italic max-w-3xl">
          Sprint AI tackles a real global problem: the systematic failure to discover athletic
          talent. By combining computer vision and machine learning, we give every athlete —
          regardless of where they were born — a fair chance to be seen.
        </p>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {phases.map((p) => (
            <div key={p.t} className="card text-center">
              <div className="text-4xl">{p.icon}</div>
              <h4 className="font-display text-2xl text-sprint-orange mt-2">{p.t}</h4>
              <p className="text-slate-300 text-sm mt-2">{p.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sprint-teal text-sm tracking-[0.25em] uppercase mb-4">
            Sprint AI — Finding Champions Everywhere
          </p>
          <Link to="/register" className="btn-primary text-lg">
            Start your assessment →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared header                                                               */
/* -------------------------------------------------------------------------- */
function SectionHeader({ eyebrow, title, accent = 'orange' }) {
  const bar = {
    coral:  'bg-sprint-coral',
    teal:   'bg-sprint-teal',
    orange: 'bg-sprint-orange',
    green:  'bg-sprint-green',
    purple: 'bg-sprint-purple',
  }[accent];
  return (
    <div>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-2">{title}</h2>
      <div className={`h-1 w-24 mt-4 ${bar}`} />
    </div>
  );
}
