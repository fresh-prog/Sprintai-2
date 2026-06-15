import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Activity, ScanLine } from 'lucide-react';
import api from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { CountUp, Stagger, staggerItem } from '../components/Motion.jsx';

export default function Admin() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.get('/admin/overview').then(({ data }) => setData(data)).catch(() => setErr(true));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader icon={ShieldCheck} eyebrow="Administration" title="MONITORING" accent="teal"
        subtitle="Platform-wide usage at a glance." />

      {err ? (
        <p className="text-sprint-coral">Could not load overview — admin access required.</p>
      ) : !data ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <Stagger className="grid sm:grid-cols-3 gap-5">
          <StatCard icon={Users} label="Registered users" value={data.users} accent="orange" />
          <StatCard icon={Activity} label="Sessions recorded" value={data.sessions} accent="teal" />
          <StatCard icon={ScanLine} label="Pose frames processed" value={data.frames} accent="purple" />
        </Stagger>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const ring = {
    orange: 'bg-sprint-orange/15 text-sprint-orange ring-sprint-orange/30',
    teal: 'bg-sprint-teal/15 text-sprint-teal ring-sprint-teal/30',
    purple: 'bg-sprint-purple/15 text-sprint-purple ring-sprint-purple/30',
  }[accent];
  return (
    <motion.div variants={staggerItem} className="card card-hover">
      <span className={`inline-grid place-items-center h-11 w-11 rounded-xl ring-1 mb-4 ${ring}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="stat-number"><CountUp value={String(value ?? 0)} /></div>
      <p className="text-slate-400 mt-1">{label}</p>
    </motion.div>
  );
}
