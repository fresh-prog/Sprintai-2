"""Coach-facing report generator.

Turns the raw sprint metrics + detected faults + predicted time into the
three things a coach actually wants to see:

  1. Tier — what level is this athlete?
       ELITE | HIGH_PERFORMANCE | DEVELOPING | HIGH_POTENTIAL | DEVELOPMENTAL
  2. Comparison — how do they stack up against published peak-sprinter data,
     metric by metric, with a clear status flag per row.
  3. Recommendations — prioritized list of coaching cues + drills, derived
     from the weakest metrics + any detected technique faults.

The numbers below are sourced from peer-reviewed sprint biomechanics
literature (see citations next to each block) — they're public-domain
benchmarks, no API or proprietary dataset required.
"""
from __future__ import annotations

from typing import Literal

Tier = Literal[
    "ELITE",
    "HIGH_PERFORMANCE",
    "DEVELOPING",
    "HIGH_POTENTIAL",
    "DEVELOPMENTAL",
]

# Peak-sprinter benchmarks at max-velocity phase, men's 100m.
#
# Sources:
#   - Bolt 2009 Berlin WR — IAAF biomechanical report (Graubner & Nixdorf 2011)
#   - Olympic finalist means — Mann (2011), Weyand et al. (2000)
#   - National elite + sub-elite — Bushnell & Hunter (2007), Mero & Komi (1986)
PEAK_BENCHMARKS = {
    "stride_freq_hz": {
        "bolt_peak":      4.49,   # Bolt 60–80m segment
        "olympic_mean":   4.70,
        "national":       4.40,
        "sub_elite":      4.00,
        "higher_is_better": True,
    },
    "stride_len_norm": {
        "bolt_peak":      2.85,   # 2.73 m / 0.96 m leg length
        "olympic_mean":   2.60,
        "national":       2.40,
        "sub_elite":      2.20,
        "higher_is_better": True,
    },
    "gct_ms": {
        "bolt_peak":      83.0,
        "olympic_mean":   92.0,
        "national":       105.0,
        "sub_elite":      130.0,
        "higher_is_better": False,
    },
    "trunk_lean_deg": {
        # Forward lean at max-velocity, not start.
        "bolt_peak":      6.5,
        "olympic_mean":   7.5,
        "national":       10.0,
        "sub_elite":      14.0,
        "higher_is_better": False,  # closer to target is better; lower bound matters
    },
    "knee_drive_deg": {
        # Mean knee flexion across the gait cycle.
        "bolt_peak":      99.0,
        "olympic_mean":   95.0,
        "national":       88.0,
        "sub_elite":      78.0,
        "higher_is_better": True,
    },
    "arm_swing_deg": {
        "bolt_peak":      90.0,
        "olympic_mean":   85.0,
        "national":       72.0,
        "sub_elite":      55.0,
        "higher_is_better": True,
    },
}

METRIC_LABEL = {
    "stride_freq_hz":  "Stride frequency",
    "stride_len_norm": "Stride length (× leg)",
    "gct_ms":          "Ground contact time",
    "trunk_lean_deg":  "Trunk lean",
    "knee_drive_deg":  "Knee drive",
    "arm_swing_deg":   "Arm swing amplitude",
}

METRIC_UNIT = {
    "stride_freq_hz":  "Hz",
    "stride_len_norm": "× leg",
    "gct_ms":          "ms",
    "trunk_lean_deg":  "°",
    "knee_drive_deg":  "°",
    "arm_swing_deg":   "°",
}


# Tier thresholds. Sprint score is the composite (0–100) from sprint.py.
# Predicted time tightens the tier — an athlete with score=82 but predicted
# 11.5s isn't elite, they're high-performance with explosive form.
def classify_tier(*, sprint_score: float, predicted_100m_s: float | None = None) -> dict:
    """Return tier + a coach-readable description."""
    score = float(sprint_score or 0)
    t100 = predicted_100m_s

    if score >= 80 and (t100 is None or t100 <= 10.5):
        tier: Tier = "ELITE"
        desc = (
            "Olympic-finalist mechanics. This athlete's stride and ground contact "
            "profile reads at the top of the global distribution."
        )
    elif score >= 65 or (t100 is not None and t100 <= 10.9):
        tier = "HIGH_PERFORMANCE"
        desc = (
            "National-elite mechanics. Polished sprint technique with room to "
            "improve specific phases before reaching Olympic-finalist territory."
        )
    elif score >= 50 or (t100 is not None and t100 <= 11.4):
        tier = "DEVELOPING"
        desc = (
            "Collegiate-level mechanics. Foundation is there; focus on the "
            "highest-leverage gaps to break into national class."
        )
    elif score >= 35:
        tier = "HIGH_POTENTIAL"
        desc = (
            "Clear sprint potential. Mechanics show the building blocks but "
            "need consistent technical work before max-velocity phase locks in."
        )
    else:
        tier = "DEVELOPMENTAL"
        desc = (
            "Early-stage sprint development. Coaching priorities are basic "
            "running mechanics and posture before specialized sprint drills."
        )

    return {"tier": tier, "score": score, "predicted_100m_s": t100, "description": desc}


# Per-metric comparison row.
def comparison_row(name: str, value: float | None) -> dict | None:
    cfg = PEAK_BENCHMARKS.get(name)
    if not cfg or value is None:
        return None

    higher_better = cfg["higher_is_better"]
    olympic = cfg["olympic_mean"]
    delta_pct = (value - olympic) / olympic * 100 if olympic else 0
    if not higher_better:
        delta_pct = -delta_pct

    if delta_pct >= 0:
        status = "at_or_above_target"
    elif delta_pct >= -8:
        status = "near_target"
    elif delta_pct >= -20:
        status = "below_target"
    else:
        status = "far_below_target"

    return {
        "metric": name,
        "label":  METRIC_LABEL.get(name, name),
        "unit":   METRIC_UNIT.get(name, ""),
        "value":  float(value),
        "bolt_peak":    cfg["bolt_peak"],
        "olympic_mean": cfg["olympic_mean"],
        "national":     cfg["national"],
        "sub_elite":    cfg["sub_elite"],
        "delta_pct":    float(delta_pct),
        "status":       status,
    }


def comparison_table(metrics: dict) -> list[dict]:
    out = []
    for name in PEAK_BENCHMARKS:
        row = comparison_row(name, metrics.get(name))
        if row is not None:
            out.append(row)
    return out


# Coaching recommendations: keyed by (metric, status) so we can show
# the right cue + drill no matter where the athlete is.
#
# Each recommendation has:
#   priority: 1 (highest, do this first) ... 5
#   metric: which dimension it addresses
#   title:  short headline
#   cue:    one-liner the coach can yell during the rep
#   drills: list of named drills with short descriptions
COACHING_LIBRARY = {
    ("stride_freq_hz", "below_target"): {
        "priority": 2,
        "title": "Increase stride frequency",
        "cue": "Quicker feet — think 'hot pavement'.",
        "drills": [
            ("A-skip + B-skip cycles", "3 × 20m, focus on snap return of the ankle."),
            ("Wall sprint drill", "4 × 15s at high cadence against a wall lean."),
            ("Fast feet ladder", "5 × through ladder, one foot per square, then sprint 10m out."),
        ],
    },
    ("stride_freq_hz", "far_below_target"): {
        "priority": 1,
        "title": "Cadence is the bottleneck",
        "cue": "Frequency before length — never reach with the foot.",
        "drills": [
            ("Metronome runs", "4 × 30m at 4.5 Hz cadence — count strikes."),
            ("Downhill stride frequency", "3 × 40m on a 2–3° decline."),
            ("Tempo runs with cadence target", "6 × 100m @ 70% holding 4.3+ Hz."),
        ],
    },
    ("stride_len_norm", "below_target"): {
        "priority": 3,
        "title": "Extend hip drive to add length",
        "cue": "Push the ground behind you — don't reach in front.",
        "drills": [
            ("Single-leg bounds", "4 × 20m, focus on triple extension."),
            ("Hill sprints", "6 × 30m on 6–8% gradient, full hip drive."),
            ("Resisted sled push", "5 × 20m @ 10% bodyweight."),
        ],
    },
    ("stride_len_norm", "far_below_target"): {
        "priority": 1,
        "title": "Stride length is severely short — strength + flexibility deficit",
        "cue": "Powerful push, then relax.",
        "drills": [
            ("Bulgarian split squats", "4 × 8 each leg, weighted."),
            ("Hip flexor mobility series", "Daily, 3 × 30s per position."),
            ("Bounding into sprint", "4 × (5 bounds + 20m sprint)."),
        ],
    },
    ("gct_ms", "below_target"): {
        "priority": 2,
        "title": "Reduce ground contact time",
        "cue": "Land, react, leave — don't sit in the contact.",
        "drills": [
            ("Pogo hops", "5 × 20 reps, minimum ground time."),
            ("Depth jumps", "4 × 6 reps from 30cm box."),
            ("Sprint drills with sound cue", "Coach claps on each strike — keep up."),
        ],
    },
    ("gct_ms", "far_below_target"): {
        "priority": 1,
        "title": "Ground contact is far too long — reactive strength deficit",
        "cue": "Stiff ankle, stiff calf — the ground is hot.",
        "drills": [
            ("Ankle stiffness pogos", "5 × 30s continuous, max height min time."),
            ("Plyo box drops", "4 × 5 from 40cm, immediate vertical jump."),
            ("Cluster sprint sets", "5 × (3 × 30m, 30s recovery between)."),
        ],
    },
    ("trunk_lean_deg", "below_target"): {
        "priority": 4,
        "title": "Slightly upright at max velocity",
        "cue": "Hips ahead of shoulders, ribs down.",
        "drills": [
            ("Wall fall starts", "6 reps, fall and explode into 10m sprint."),
            ("Resisted lean runs", "Coach holds a band at the chest; athlete leans."),
        ],
    },
    ("trunk_lean_deg", "far_below_target"): {
        "priority": 2,
        "title": "Posture collapse — work core + acceleration shape",
        "cue": "Long spine, eyes 5m ahead — not down.",
        "drills": [
            ("Plank + dead bug 3× weekly", "3 × 45s plank + 3 × 10 dead bugs."),
            ("Acceleration ladder", "Start in 4-point stance, hold lean angle for first 15m."),
            ("Video review drill", "Film each rep; coach reviews trunk angle vs goal."),
        ],
    },
    ("knee_drive_deg", "below_target"): {
        "priority": 3,
        "title": "Drive the knee higher",
        "cue": "Thigh parallel — knee to the sky.",
        "drills": [
            ("High knees with arm action", "4 × 30m, exaggerate knee height."),
            ("Bound + sprint combo", "3 × (5 bounds + 25m sprint)."),
        ],
    },
    ("knee_drive_deg", "far_below_target"): {
        "priority": 2,
        "title": "Knee drive deficit — likely hip flexor + glute strength",
        "cue": "Pull the knee up and through, not just forward.",
        "drills": [
            ("Standing knee drives", "3 × 10 each leg, weighted."),
            ("Cable hip flexor pulls", "3 × 12 each leg @ moderate load."),
            ("Glute bridge complex", "Bridge + march + single-leg progression."),
        ],
    },
    ("arm_swing_deg", "below_target"): {
        "priority": 4,
        "title": "Increase arm range of motion",
        "cue": "Hand to hip, hand to chin — full swing.",
        "drills": [
            ("Seated arm action", "3 × 30s at race tempo on a bench."),
            ("Mirror drill", "Practice arm action in front of a mirror, no running."),
        ],
    },
    ("arm_swing_deg", "far_below_target"): {
        "priority": 3,
        "title": "Arm action severely restricted — upper-body mobility",
        "cue": "Long arms, loose shoulders.",
        "drills": [
            ("Shoulder mobility series", "5 × per side, daily."),
            ("Sprint arms (seated)", "5 × 20s sets at race tempo."),
            ("Resistance band arm drill", "3 × 30s at race tempo."),
        ],
    },
}

# Map fault tags → coaching response. Same shape as COACHING_LIBRARY values.
FAULT_LIBRARY = {
    "overstride": {
        "priority": 1,
        "title": "Overstride detected — heel landing ahead of hip",
        "cue": "Land under the hip, not in front.",
        "drills": [
            ("A-march into A-skip progression", "Focus on knee under hip at impact."),
            ("Wall drill — single foot strike", "6 reps each foot."),
        ],
    },
    "knee_collapse": {
        "priority": 1,
        "title": "Knee collapses inward at stance",
        "cue": "Knee stacked over the foot.",
        "drills": [
            ("Banded lateral walks", "3 × 20 steps each direction."),
            ("Single-leg RDL", "3 × 8 each leg, focus on hip stability."),
            ("Mini-band knee tracking sprints", "3 × 20m with band above knees."),
        ],
    },
    "heel_strike": {
        "priority": 2,
        "title": "Heel-striking at contact — braking force",
        "cue": "Forefoot first — ball of the foot.",
        "drills": [
            ("Barefoot strides on turf", "4 × 60m at 70% effort."),
            ("Ankle stiffness pogos", "5 × 20 reps."),
        ],
    },
    "arm_cross_body": {
        "priority": 3,
        "title": "Arms crossing midline — rotational energy leak",
        "cue": "Arms straight back, straight forward — no crossover.",
        "drills": [
            ("Seated arm action with cue", "Coach taps the offending hand."),
            ("Sprint arms in front of a wall", "Hands stay in their lane."),
        ],
    },
    "excessive_trunk_lean": {
        "priority": 2,
        "title": "Trunk over-leaning late in the run — fatigue posture",
        "cue": "Tall and proud — finish the race upright.",
        "drills": [
            ("Speed endurance reps", "3 × 150m, focus on posture at 100m+."),
            ("Core endurance circuit", "Plank-based, 2× weekly."),
        ],
    },
}


def recommendations(metrics: dict, faults_counts: dict | None = None) -> list[dict]:
    """Produce a prioritized, deduplicated list of recommendations from the
    metric statuses + detected fault counts.

    `faults_counts` is the `counts` block from biomech `/technique-errors`,
    e.g. {"overstride": 12, "knee_collapse": 4, ...}.
    """
    recs: list[dict] = []
    seen: set[str] = set()

    # Metric-driven recommendations (worst gaps first).
    rows = comparison_table(metrics)
    rows.sort(key=lambda r: r["delta_pct"])  # most negative first
    for r in rows:
        key = (r["metric"], r["status"])
        if key in COACHING_LIBRARY and r["status"] in ("below_target", "far_below_target"):
            base = COACHING_LIBRARY[key]
            tag = f"metric:{r['metric']}"
            if tag in seen:
                continue
            seen.add(tag)
            recs.append({
                **base,
                "source": "metric_gap",
                "metric": r["metric"],
                "current": r["value"],
                "target":  r["olympic_mean"],
                "drills":  [{"name": n, "instructions": d} for n, d in base["drills"]],
            })

    # Fault-driven recommendations (only if the fault was meaningfully frequent).
    for fault, count in (faults_counts or {}).items():
        if count < 3:
            continue
        cfg = FAULT_LIBRARY.get(fault)
        if not cfg:
            continue
        tag = f"fault:{fault}"
        if tag in seen:
            continue
        seen.add(tag)
        recs.append({
            **cfg,
            "source": "fault",
            "fault": fault,
            "count": int(count),
            "drills": [{"name": n, "instructions": d} for n, d in cfg["drills"]],
        })

    recs.sort(key=lambda r: r["priority"])
    return recs


def build_report(
    *,
    metrics: dict,
    sprint_score: float,
    predicted_100m_s: float | None = None,
    faults_counts: dict | None = None,
) -> dict:
    """Top-level entry point: tier + comparison + recommendations in one shot."""
    return {
        "tier": classify_tier(sprint_score=sprint_score, predicted_100m_s=predicted_100m_s),
        "comparison": comparison_table(metrics),
        "recommendations": recommendations(metrics, faults_counts),
    }
