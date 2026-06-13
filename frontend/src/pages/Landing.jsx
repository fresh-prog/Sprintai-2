import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import {
  Globe2, Wallet, Eye, Hourglass, Video, ScanLine, Gauge, MessageSquareText,
  MapPinned, Smartphone, UploadCloud, Cpu, BarChart3, Trophy, Rocket, Scale as ScaleIcon,
  Building2, DraftingCompass, Medal, ChevronDown, ArrowRight, Sparkles,
} from 'lucide-react';
import { img } from '../lib/images.js';
import { Reveal, Stagger, staggerItem, Tilt, CountUp, Magnetic } from '../components/Motion.jsx';

export default function Landing() {
  return (
    <div className="text-slate-100 overflow-clip">
      <Hero />
      <Marquee />
      <Problem />
      <Scale />
      <Solution />
      <HowItWorks />
      <Impact />
      <Conclusion />
    </div>
  );
}

/* ========================================================================== */
/* HERO — full-bleed cinematic                                                 */
/* ========================================================================== */
function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-end overflow-hidden grain">
      {/* Parallax background photo */}
      <motion.div
        style={{ y: reduce ? 0 : bgY, scale: reduce ? 1.05 : bgScale }}
        className="absolute inset-0 -z-10"
      >
        <img
          src={img('heroGolden', { w: 2200, q: 82 })}
          alt="A sprinter accelerating through golden evening light on a track"
          className="h-full w-full object-cover object-center"
          fetchpriority="high"
        />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="absolute inset-0 scrim-left" />
      </motion.div>

      {/* Ambient aurora */}
      <div className="aurora -z-10 top-[-10%] left-[-5%] h-72 w-72 bg-sprint-orange/30" aria-hidden />

      <motion.div style={{ opacity: reduce ? 1 : fade }} className="relative w-full max-w-7xl mx-auto px-6 pb-20 md:pb-28">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="section-eyebrow mb-5"
        >
          <Sparkles className="h-4 w-4" /> AI-Powered Talent Discovery
        </motion.p>

        <h1 className="font-display leading-[0.82] text-white drop-shadow-2xl">
          <motion.span
            className="block text-[22vw] md:text-[15rem]"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            SPRINT
          </motion.span>
          <motion.span
            className="block text-[22vw] md:text-[15rem] text-gradient"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            AI
          </motion.span>
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 max-w-2xl text-lg md:text-2xl text-slate-200 font-medium"
        >
          Every champion starts somewhere. We use computer vision to find world-class
          100m–200m talent — anywhere on earth, from a single phone video.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Magnetic>
            <Link to="/register" className="btn-primary text-base">
              Get assessed <ArrowRight className="h-5 w-5" />
            </Link>
          </Magnetic>
          <a href="#problem" className="btn-secondary text-base">See how it works</a>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1], y: [0, 8, 0] }}
          transition={{ delay: 1, duration: 1.8, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-300"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      )}
    </section>
  );
}

/* ========================================================================== */
/* Marquee — animated record band                                              */
/* ========================================================================== */
function Marquee() {
  const reduce = useReducedMotion();
  const items = ['9.58s · 100M WR', 'STRIDE MECHANICS', '33 BODY LANDMARKS', '19.19s · 200M WR',
    'GROUND CONTACT TIME', 'ELITE COMPARISON', 'ANYWHERE ON EARTH'];
  const row = [...items, ...items];
  return (
    <div className="relative border-y border-white/10 bg-navy-900/60 py-4 overflow-hidden">
      <motion.div
        className="flex gap-10 whitespace-nowrap font-display text-2xl tracking-wider text-slate-400"
        animate={reduce ? {} : { x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t} <span className="text-sprint-orange">/</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ========================================================================== */
/* Problem                                                                     */
/* ========================================================================== */
function Problem() {
  const items = [
    { Icon: Globe2, title: 'Geographic Bias',
      body: 'Scouts concentrate on wealthy urban areas. Rural and developing regions are almost entirely ignored.' },
    { Icon: Wallet, title: 'Cost Barrier',
      body: 'Formal talent programs are expensive. Only families with resources can access proper training & exposure.' },
    { Icon: Eye, title: 'Human Subjectivity',
      body: 'Coaches rely on gut feeling and visual cues. Many bio-mechanical gifts are invisible to the naked eye.' },
    { Icon: Hourglass, title: 'Late Detection',
      body: "Most athletes are only 'discovered' at 16–18. Prime development windows at age 10–14 are lost forever." },
  ];
  return (
    <section id="problem" className="section relative">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Problem" title="TALENT GOES UNSEEN" accent="coral" />
        <Reveal delay={0.1}>
          <p className="mt-5 text-slate-300 text-lg max-w-3xl">
            Every year, thousands of potential sprint champions go undiscovered — not because they
            lack talent, but because the traditional scouting system is broken.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid md:grid-cols-2 gap-5">
          {items.map(({ Icon, title, body }) => (
            <motion.div key={title} variants={staggerItem}>
              <Tilt className="card-bordered-coral h-full">
                <div className="flex items-center gap-4 mb-3">
                  <span className="grid place-items-center h-12 w-12 rounded-xl bg-sprint-coral/15 text-sprint-coral ring-1 ring-sprint-coral/30">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-2xl text-white tracking-wide">{title}</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{body}</p>
              </Tilt>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Scale — metrics + image + quote                                             */
/* ========================================================================== */
function Scale() {
  const metrics = [
    { v: '97%', l: 'of sprint talent in Africa, Asia & South America never reaches a professional coach' },
    { v: '10K', l: 'certified sprint scouts exist globally, yet 8 billion people live on Earth' },
    { v: '4 yrs', l: "average delay between an athlete's peak window and their first formal assessment" },
  ];
  return (
    <section className="section relative bg-navy-800/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Scale" title="A WORLD OF MISSED POTENTIAL" accent="teal" />
        <div className="mt-12 grid lg:grid-cols-2 gap-8 items-center">
          <Stagger className="grid sm:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <motion.div key={m.v} variants={staggerItem} className="card-stat min-h-[200px]">
                <div className="stat-number"><CountUp value={m.v} /></div>
                <div className="w-12 h-px bg-sprint-teal mt-3 mb-4" />
                <div className="stat-label">{m.l}</div>
              </motion.div>
            ))}
          </Stagger>
          <Reveal delay={0.15}>
            <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 aspect-[4/5] sm:aspect-video lg:aspect-[4/5]">
              <img src={img('blurSide', { w: 1100 })} alt="A sprinter in full motion, captured with a panning blur"
                   loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 scrim-bottom" />
              <blockquote className="absolute bottom-0 p-6 md:p-8">
                <p className="font-display text-2xl md:text-3xl text-white leading-tight">
                  “The next Usain Bolt may be running barefoot in a village — and nobody will ever know.”
                </p>
                <footer className="mt-3 text-sprint-orange text-sm tracking-wide">
                  The Untapped Potential Crisis
                </footer>
              </blockquote>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Solution                                                                    */
/* ========================================================================== */
function Solution() {
  const steps = [
    { n: '01', Icon: Video, title: 'Video Capture', accent: 'teal',
      body: 'Film a 40m run on any smartphone. No lab, no markers, no special equipment needed.' },
    { n: '02', Icon: ScanLine, title: 'Pose Estimation', accent: 'orange',
      body: 'Computer vision extracts 33 body landmarks per frame — stride, cadence, arm drive, contact time.' },
    { n: '03', Icon: Gauge, title: 'Talent Score', accent: 'coral',
      body: 'An ML model compares your biomechanical signature against elite athlete profiles.' },
    { n: '04', Icon: MessageSquareText, title: 'Personalized Feedback', accent: 'purple',
      body: 'Receive specific coaching cues, training plans, and drill recommendations instantly.' },
    { n: '05', Icon: MapPinned, title: 'Global Talent Map', accent: 'green',
      body: 'Anonymized data builds a live world map of potential, connecting athletes to programs.' },
  ];
  return (
    <section className="section relative">
      <div className="aurora -z-10 right-[-5%] top-[20%] h-80 w-80 bg-sprint-teal/15" aria-hidden />
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Solution" title="HOW SPRINT AI WORKS" accent="orange" />
        <Reveal delay={0.1}>
          <p className="mt-5 text-slate-300 text-lg max-w-3xl">
            A platform that turns any phone into a biomechanics lab — computer vision, ML, and
            elite benchmarking, working together to surface talent anywhere.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map(({ n, Icon, title, body, accent }) => (
            <motion.div key={n} variants={staggerItem}>
              <Tilt className={`card-bordered-${accent} h-full`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`grid place-items-center h-12 w-12 rounded-xl bg-sprint-${accent}/15 text-sprint-${accent} ring-1 ring-sprint-${accent}/30`}>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className={`font-display text-5xl text-sprint-${accent}/40 tnum`}>{n}</span>
                </div>
                <h3 className="font-display text-2xl text-white tracking-wide">{title}</h3>
                <p className="text-slate-300 mt-2 leading-relaxed">{body}</p>
              </Tilt>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* How it works — flow + measures                                              */
/* ========================================================================== */
function HowItWorks() {
  const flow = [
    { Icon: Smartphone, label: 'Record', body: 'Film a short sprint on any phone' },
    { Icon: UploadCloud, label: 'Upload', body: 'Securely sent to the AI engine' },
    { Icon: Cpu, label: 'Analyze', body: 'Pose AI extracts 33 keypoints' },
    { Icon: BarChart3, label: 'Score', body: 'ML produces a talent score' },
    { Icon: Trophy, label: 'Connect', body: 'Top athletes linked to coaches' },
  ];
  const measures = [
    'Stride length & frequency', 'Ground contact time', 'Hip extension angle',
    'Arm drive mechanics', 'Acceleration curve', 'Reaction time patterns',
  ];
  return (
    <section className="section relative bg-gradient-to-b from-sprint-orange/[0.05] to-transparent border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Pipeline" title="FROM PHONE TO POTENTIAL" accent="orange" />
        <Stagger className="mt-14 grid grid-cols-2 md:grid-cols-5 gap-6">
          {flow.map(({ Icon, label, body }, i) => (
            <motion.div key={label} variants={staggerItem} className="relative flex flex-col items-center text-center">
              <div className="relative grid place-items-center h-20 w-20 rounded-2xl bg-navy-700 ring-1 ring-white/10 text-sprint-orange glow-orange">
                <Icon className="h-9 w-9" strokeWidth={1.5} />
                <span className="absolute -top-2 -right-2 grid place-items-center h-6 w-6 rounded-full bg-sprint-orange text-navy-900 text-xs font-bold tnum">{i + 1}</span>
              </div>
              <h4 className="font-display text-2xl text-white mt-4 tracking-wide">{label}</h4>
              <p className="text-slate-400 text-sm mt-1">{body}</p>
            </motion.div>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <div className="mt-14 card ring-1 ring-sprint-teal/25">
            <h3 className="font-display text-2xl text-sprint-teal mb-5 tracking-wider flex items-center gap-2">
              <ScanLine className="h-6 w-6" /> WHAT THE AI MEASURES
            </h3>
            <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {measures.map((m) => (
                <li key={m} className="flex items-center gap-3 text-slate-200">
                  <span className="grid place-items-center h-8 w-8 rounded-lg bg-sprint-orange/15 text-sprint-orange shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Impact                                                                      */
/* ========================================================================== */
function Impact() {
  const outcomes = [
    { Icon: Globe2, t: 'Democratize Access', b: 'Any child, anywhere on earth, can be evaluated fairly using only a phone.' },
    { Icon: Rocket, t: 'Accelerate Development', b: 'Early identification at age 10–12 means years of proper coaching before peak age.' },
    { Icon: ScaleIcon, t: 'Eliminate Bias', b: 'AI evaluates biomechanics — not appearance, background, or coach relationships.' },
    { Icon: Building2, t: 'Build National Programs', b: 'Federations gain a data-driven pipeline for national squads.' },
  ];
  const stats = [
    { v: '1M+', l: 'Athletes assessed in year one' },
    { v: '80%', l: 'Cost reduction vs traditional scouting' },
    { v: '3x', l: 'More diverse athlete pipeline' },
  ];
  return (
    <section className="section relative bg-sprint-green/[0.05] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Impact" title="WHAT CHANGES" accent="green" />
        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          <Stagger className="space-y-4">
            {outcomes.map(({ Icon, t, b }) => (
              <motion.div key={t} variants={staggerItem}>
                <Tilt max={5} className="card-bordered-green flex items-start gap-4">
                  <span className="grid place-items-center h-12 w-12 rounded-xl bg-sprint-green/15 text-sprint-green ring-1 ring-sprint-green/30 shrink-0">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h4 className="font-display text-2xl text-white tracking-wide">{t}</h4>
                    <p className="text-slate-300 mt-1">{b}</p>
                  </div>
                </Tilt>
              </motion.div>
            ))}
          </Stagger>
          <Stagger className="grid sm:grid-cols-1 gap-4 content-start">
            {stats.map((s) => (
              <motion.div key={s.v} variants={staggerItem} className="card-stat flex-row gap-6 min-h-[120px] justify-start text-left">
                <div className="stat-number"><CountUp value={s.v} /></div>
                <div className="stat-label mt-0">{s.l}</div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Conclusion / CTA                                                            */
/* ========================================================================== */
function Conclusion() {
  const phases = [
    { Icon: DraftingCompass, t: 'Phase 1', b: 'Train the pose model on sprint video datasets' },
    { Icon: Smartphone, t: 'Phase 2', b: 'Ship the mobile MVP, test with a local club' },
    { Icon: Globe2, t: 'Phase 3', b: 'Launch a pilot in 3 countries, collect real data' },
    { Icon: Medal, t: 'Phase 4', b: 'Partner with national federations for rollout' },
  ];
  return (
    <section className="relative">
      {/* CTA hero band with image */}
      <div className="relative isolate overflow-hidden grain">
        <img src={img('blurPan', { w: 2000 })} alt="A sprinter at top speed, panned against a blurred background"
             loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-navy-900/80" />
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <Reveal>
            <h2 className="font-display text-5xl md:text-8xl text-white leading-[0.9]">
              FIND CHAMPIONS<br /><span className="text-gradient">EVERYWHERE</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-slate-200 text-lg max-w-2xl mx-auto">
              Give every athlete — regardless of where they were born — a fair chance to be seen.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-9 flex justify-center">
              <Magnetic>
                <Link to="/register" className="btn-primary text-lg">
                  Start your assessment <ArrowRight className="h-5 w-5" />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Roadmap */}
      <div className="section max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="The Roadmap" title="WHAT'S NEXT" accent="orange" />
        <Stagger className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {phases.map(({ Icon, t, b }) => (
            <motion.div key={t} variants={staggerItem}>
              <Tilt className="card card-hover text-center h-full">
                <span className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-sprint-orange/15 text-sprint-orange ring-1 ring-sprint-orange/30 mx-auto">
                  <Icon className="h-7 w-7" strokeWidth={1.5} />
                </span>
                <h4 className="font-display text-2xl text-sprint-orange mt-4 tracking-wide">{t}</h4>
                <p className="text-slate-300 text-sm mt-2">{b}</p>
              </Tilt>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ========================================================================== */
function SectionHeader({ eyebrow, title, accent = 'orange' }) {
  const bar = {
    coral: 'bg-sprint-coral', teal: 'bg-sprint-teal', orange: 'bg-sprint-orange',
    green: 'bg-sprint-green', purple: 'bg-sprint-purple',
  }[accent];
  return (
    <Reveal>
      <p className="section-eyebrow"><span className={`inline-block h-2 w-2 rounded-full ${bar}`} />{eyebrow}</p>
      <h2 className="section-title mt-3">{title}</h2>
      <div className={`h-1 w-24 mt-5 rounded-full ${bar}`} />
    </Reveal>
  );
}
