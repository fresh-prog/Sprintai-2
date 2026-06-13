// Reusable motion primitives built on framer-motion. Every one respects
// prefers-reduced-motion (via useReducedMotion) so the experience stays
// accessible and never causes disorientation.
import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  animate,
} from 'framer-motion';
import { useEffect, useState } from 'react';

/* Scroll-reveal: fades + lifts children into view once. Stagger via `delay`. */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const M = motion[as] ?? motion.div;
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/* Stagger container — children using <Reveal> or motion get sequenced. */
export function Stagger({ children, className = '', gap = 0.08 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/* 3D tilt card — follows the cursor with a subtle perspective rotation. */
export function Tilt({ children, className = '', max = 8 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const rx = useSpring(0, { stiffness: 200, damping: 18 });
  const ry = useSpring(0, { stiffness: 200, damping: 18 });

  function onMove(e) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  }
  function reset() { rx.set(0); ry.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Parallax — translates an element as the page scrolls past it. */
export function Parallax({ children, speed = 0.2, className = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  return (
    <motion.div ref={ref} style={{ y: reduce ? 0 : y }} className={className}>
      {children}
    </motion.div>
  );
}

/* Count-up number — animates from 0 to target when scrolled into view.
   Preserves any prefix/suffix (e.g. "9.58s", "200M+"). */
export function CountUp({ value, className = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [display, setDisplay] = useState(reduce ? value : seed(value));

  useEffect(() => {
    if (!inView || reduce) { setDisplay(value); return; }
    const m = String(value).match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m) { setDisplay(value); return; }
    const [, pre, num, suf] = m;
    const target = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] || '').length;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const formatted = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
        setDisplay(`${pre}${formatted}${suf}`);
      },
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref} className={className}>{display}</span>;
}

function seed(value) {
  // Start visually at zero but keep prefix/suffix so layout doesn't shift.
  const m = String(value).match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!m) return value;
  const [, pre, num, suf] = m;
  const decimals = (num.split('.')[1] || '').length;
  return `${pre}${decimals ? (0).toFixed(decimals) : '0'}${suf}`;
}

/* Magnetic wrapper — element drifts toward the cursor, snaps back on leave. */
export function Magnetic({ children, className = '', strength = 0.35 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 250, damping: 15 });
  const y = useSpring(0, { stiffness: 250, damping: 15 });
  function onMove(e) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
