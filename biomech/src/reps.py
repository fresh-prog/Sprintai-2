"""Rep counter + simple exercise-form feedback.

Counts repetitions of common closed-kinetic-chain exercises by looking for
oscillations in the relevant joint angle:

  - squat   : average knee flexion oscillating ≥ 50° between top/bottom
  - pushup  : average elbow flexion oscillating ≥ 50°
  - lunge   : asymmetric knee flexion peak

For each rep we also score the *form* — depth, symmetry between sides, and
tempo (eccentric/concentric duration). Output mirrors the rest of the
biomech service so the backend can shovel it straight into Metric rows.

This is pragmatic rep detection, not lab-grade. The point is that it's
deterministic, fast, and fully offline. Good enough for real-time coaching.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy.signal import find_peaks

from .geometry import frame_angles

Exercise = Literal["squat", "pushup"]

# Minimum trough-to-peak swing (degrees) that we'll consider a real rep.
MIN_SWING_DEG = {"squat": 50.0, "pushup": 50.0}
# Maximum allowed asymmetry % between sides before we flag the rep.
MAX_OK_SYMMETRY = 20.0


@dataclass
class Rep:
    start_ms: int
    bottom_ms: int
    end_ms: int
    depth_deg: float            # peak-to-trough swing
    symmetry_pct: float          # Robinson SI between sides at peak
    ok: bool
    notes: list[str]


def _angle_series(frames: list[dict], exercise: Exercise) -> tuple[np.ndarray, np.ndarray]:
    """Return (ts_ms, primary-angle) arrays for the requested exercise."""
    ts = np.array([f["tsMs"] for f in frames], dtype=np.float64)
    primary = np.zeros(len(frames), dtype=np.float64)

    for i, f in enumerate(frames):
        kp = np.zeros((33, 4), dtype=np.float32)
        for p in f["keypoints"]:
            kp[p["i"]] = (p["x"], p["y"], p.get("z", 0.0), p.get("vis", 1.0))
        angles = frame_angles(kp)
        if exercise == "squat":
            primary[i] = (angles["left_knee"] + angles["right_knee"]) / 2.0
        elif exercise == "pushup":
            primary[i] = (angles["left_elbow"] + angles["right_elbow"]) / 2.0
        else:
            raise ValueError(f"unknown exercise: {exercise}")
    return ts, primary


def count(frames: list[dict], exercise: Exercise = "squat") -> dict:
    """Detect reps + per-rep form. Returns a serializable dict."""
    if len(frames) < 30:
        return {"exercise": exercise, "reps": [], "count": 0, "tempo_s": None}

    ts, ang = _angle_series(frames, exercise)
    duration_s = float((ts[-1] - ts[0]) / 1000.0) if ts[-1] > ts[0] else 1.0
    fps = len(frames) / max(duration_s, 1e-3)
    min_distance = max(int(0.4 * fps), 1)

    # A "rep" is a deep trough — knees bent, elbows bent. Find local minima.
    # `find_peaks` works on maxima, so invert the signal.
    troughs, _ = find_peaks(-ang, distance=min_distance, prominence=MIN_SWING_DEG[exercise] / 2)

    reps: list[Rep] = []
    for k, t_idx in enumerate(troughs):
        # Window the rep from the previous peak (or start) to the next.
        prev = troughs[k - 1] if k > 0 else 0
        nxt = troughs[k + 1] if k < len(troughs) - 1 else len(ang) - 1
        peak_before = prev + int(np.argmax(ang[prev:t_idx + 1]))
        peak_after = t_idx + int(np.argmax(ang[t_idx:nxt + 1]))

        depth = float(min(ang[peak_before], ang[peak_after]) - ang[t_idx])
        if depth < MIN_SWING_DEG[exercise]:
            continue

        # Side symmetry at the bottom of the rep.
        kp = np.zeros((33, 4), dtype=np.float32)
        for p in frames[t_idx]["keypoints"]:
            kp[p["i"]] = (p["x"], p["y"], p.get("z", 0.0), p.get("vis", 1.0))
        a = frame_angles(kp)
        if exercise == "squat":
            l, r = a["left_knee"], a["right_knee"]
        else:
            l, r = a["left_elbow"], a["right_elbow"]
        denom = 0.5 * (abs(l) + abs(r))
        sym = float(abs(l - r) / denom * 100.0) if denom else 0.0

        notes: list[str] = []
        if depth < 70 and exercise == "squat":
            notes.append("partial depth")
        if sym > MAX_OK_SYMMETRY:
            notes.append(f"asymmetric ({sym:.0f}%)")

        reps.append(Rep(
            start_ms=int(ts[peak_before]),
            bottom_ms=int(ts[t_idx]),
            end_ms=int(ts[peak_after]),
            depth_deg=depth,
            symmetry_pct=sym,
            ok=len(notes) == 0,
            notes=notes,
        ))

    tempo_s = None
    if reps:
        spans = [(r.end_ms - r.start_ms) / 1000.0 for r in reps]
        tempo_s = float(np.mean(spans))

    return {
        "exercise": exercise,
        "count": len(reps),
        "tempo_s": tempo_s,
        "reps": [r.__dict__ for r in reps],
    }
