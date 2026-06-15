import { motion } from 'framer-motion';

// Shared immersive page header: an accent icon chip, eyebrow, display title,
// optional subtitle, and an actions slot — with a subtle entrance.
const RINGS = {
  orange: 'bg-sprint-orange/15 text-sprint-orange ring-sprint-orange/30',
  teal: 'bg-sprint-teal/15 text-sprint-teal ring-sprint-teal/30',
  coral: 'bg-sprint-coral/15 text-sprint-coral ring-sprint-coral/30',
  green: 'bg-sprint-green/15 text-sprint-green ring-sprint-green/30',
  purple: 'bg-sprint-purple/15 text-sprint-purple ring-sprint-purple/30',
};

export default function PageHeader({ icon: Icon, eyebrow, title, subtitle, accent = 'orange', children }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <span className={`grid place-items-center h-12 w-12 rounded-2xl ring-1 shrink-0 ${RINGS[accent]}`}>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </span>
        )}
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h1 className="font-display text-4xl sm:text-5xl text-white leading-none mt-1">{title}</h1>
          {subtitle && <p className="text-slate-300 mt-2 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </motion.header>
  );
}
