import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Radar / "fan" chart comparing an athlete's six technique metrics to
 * published elite benchmarks. Each axis runs 0..1 in normalized space
 * where 1 = elite target; the athlete polygon is drawn on top of an
 * elite reference polygon.
 *
 * Renders as inline SVG via D3 — no separate canvas, no Three.js.
 *
 * Props:
 *   sprint: pivoted sprint metrics from /sessions/:id/summary
 *   benchmarks: optional override of the elite values
 */
const ELITE = {
  stride_freq_hz:  { target: 4.7,  scale: 5.0  },
  stride_len_norm: { target: 2.6,  scale: 3.0  },
  gct_ms:          { target: 92.0, scale: 150.0, invert: true }, // lower is better
  trunk_lean_deg:  { target: 7.5,  scale: 25.0 },
  knee_drive_deg:  { target: 95.0, scale: 130.0 },
  arm_swing_deg:   { target: 85.0, scale: 120.0 },
};

const AXIS_LABEL = {
  stride_freq_hz:  'Stride freq',
  stride_len_norm: 'Stride len',
  gct_ms:          'Ground contact',
  trunk_lean_deg:  'Trunk lean',
  knee_drive_deg:  'Knee drive',
  arm_swing_deg:   'Arm swing',
};

export default function EliteFan({ sprint }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!sprint) return;
    const W = 360, H = 360, R = 130, cx = W / 2, cy = H / 2;
    const axes = Object.keys(ELITE);
    const angleStep = (2 * Math.PI) / axes.length;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%');

    const g = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);

    // Radial grid rings — every 25% of the way out.
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      g.append('circle')
        .attr('r', R * r)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.08)')
        .attr('stroke-dasharray', r === 1 ? '0' : '2 3');
    }

    // Axis spokes + labels.
    axes.forEach((key, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * R;
      const y = Math.sin(angle) * R;
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', x).attr('y2', y)
        .attr('stroke', 'rgba(255,255,255,0.12)');
      g.append('text')
        .attr('x', Math.cos(angle) * (R + 16))
        .attr('y', Math.sin(angle) * (R + 16))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', 11)
        .text(AXIS_LABEL[key]);
    });

    // Elite reference polygon (target value on every axis).
    const eliteRing = d3.line().curve(d3.curveLinearClosed)(
      axes.map((_, i) => {
        const a = i * angleStep - Math.PI / 2;
        return [Math.cos(a) * R, Math.sin(a) * R];
      }),
    );
    g.append('path')
      .attr('d', eliteRing)
      .attr('fill', 'rgba(30,197,197,0.10)')
      .attr('stroke', '#1ec5c5')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 3');

    // Athlete polygon: each axis = score (0..1) of proximity to target.
    const athletePoints = axes.map((key, i) => {
      const cfg = ELITE[key];
      const v = Number(sprint[key]);
      if (!Number.isFinite(v)) return [0, 0];
      // Convert value → 0..1 score: 1 at target, decays to 0 at ±scale.
      const ratio = cfg.invert
        ? Math.max(0, 1 - Math.abs(v - cfg.target) / cfg.scale)
        : Math.min(1, v / cfg.target);
      const a = i * angleStep - Math.PI / 2;
      return [Math.cos(a) * R * ratio, Math.sin(a) * R * ratio];
    });
    const athleteRing = d3.line().curve(d3.curveLinearClosed)(athletePoints);
    g.append('path')
      .attr('d', athleteRing)
      .attr('fill', 'rgba(245,166,35,0.25)')
      .attr('stroke', '#f5a623')
      .attr('stroke-width', 2.5);
    g.selectAll('.athlete-dot')
      .data(athletePoints)
      .enter()
      .append('circle')
      .attr('class', 'athlete-dot')
      .attr('cx', (d) => d[0])
      .attr('cy', (d) => d[1])
      .attr('r', 4)
      .attr('fill', '#f5a623');

    // Center "you vs elite" label.
    g.append('text')
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.25)')
      .attr('font-family', 'Bebas Neue')
      .attr('font-size', 14)
      .text('YOU vs ELITE');
  }, [sprint]);

  if (!sprint) return null;
  return (
    <div className="card">
      <p className="section-eyebrow">Comparison</p>
      <h3 className="font-display text-2xl text-white mt-2 mb-2">ELITE FAN</h3>
      <svg ref={ref} />
      <div className="flex gap-4 text-xs text-slate-400 justify-center mt-2">
        <span><span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ background: '#1ec5c5' }} /> Elite target</span>
        <span><span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ background: '#f5a623' }} /> This athlete</span>
      </div>
    </div>
  );
}
