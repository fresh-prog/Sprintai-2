"""Per-frame technique error detection.

Pragmatic, explainable heuristics — no ML required. Each rule fires when
a specific biomechanical signature crosses a threshold; the output is a
list of `{tsMs, tag, joint?, severity, message}` records that the
frontend can overlay on the timeline.

Common faults the coaching literature flags during sprint:
* **Overstride** — heel lands well ahead of hips. Hip-x → ankle-x gap > 0.18.
* **Knee collapse** — knee crosses the midline at mid-stance. Knee-x past
  the opposite hip-x.
* **Trunk over-rotation** — shoulder-line not perpendicular to direction
  of travel.
* **Heel strike** — toe-up landing on the heel rather than mid/forefoot.
* **Arm cross-body** — wrist crosses the body midline.
* **Excessive trunk lean** — late in the run, lean > 18°.
"""
from __future__ import annotations

import numpy as np

from .geometry import frame_angles

LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_WRIST, RIGHT_WRIST = 15, 16
LEFT_HEEL, RIGHT_HEEL = 29, 30
LEFT_TOE, RIGHT_TOE = 31, 32


def detect_errors(frames: list[dict]) -> dict:
    """Return a list of fault tags + a per-fault count summary."""
    if not frames:
        return {"ok": False, "reason": "no frames", "errors": [], "counts": {}}

    errors = []
    counts: dict[str, int] = {}

    for f in frames:
        kp = np.zeros((33, 4), dtype=np.float32)
        for p in f["keypoints"]:
            kp[p["i"]] = (p["x"], p["y"], p.get("z", 0.0), p.get("vis", 1.0))

        ts = int(f["tsMs"])
        hip_mid_x = (kp[LEFT_HIP, 0] + kp[RIGHT_HIP, 0]) / 2

        # Overstride — heel lands well in front of hip.
        for side, ankle_i, joint_label in ((-1, LEFT_ANKLE, "left_ankle"), (+1, RIGHT_ANKLE, "right_ankle")):
            gap = float(kp[ankle_i, 0] - hip_mid_x) * side
            # gap positive = ankle is in front of hip in subject's facing direction.
            if gap > 0.18 and kp[ankle_i, 1] > 0.85:
                _add(errors, counts, ts, "overstride", joint_label, gap, severity_from(gap, 0.18, 0.30))

        # Knee collapse — knee crosses contralateral hip-x.
        if kp[LEFT_KNEE, 0] > kp[RIGHT_HIP, 0] + 0.05:
            _add(errors, counts, ts, "knee_collapse", "left_knee", float(kp[LEFT_KNEE, 0] - kp[RIGHT_HIP, 0]),
                 severity_from(float(kp[LEFT_KNEE, 0] - kp[RIGHT_HIP, 0]), 0.05, 0.15))
        if kp[RIGHT_KNEE, 0] < kp[LEFT_HIP, 0] - 0.05:
            _add(errors, counts, ts, "knee_collapse", "right_knee", float(kp[LEFT_HIP, 0] - kp[RIGHT_KNEE, 0]),
                 severity_from(float(kp[LEFT_HIP, 0] - kp[RIGHT_KNEE, 0]), 0.05, 0.15))

        # Heel strike — heel below toe at impact (toe-up landing).
        if kp[LEFT_HEEL, 1] > kp[LEFT_TOE, 1] + 0.02 and kp[LEFT_HEEL, 1] > 0.88:
            _add(errors, counts, ts, "heel_strike", "left_foot", float(kp[LEFT_HEEL, 1] - kp[LEFT_TOE, 1]),
                 severity_from(float(kp[LEFT_HEEL, 1] - kp[LEFT_TOE, 1]), 0.02, 0.08))
        if kp[RIGHT_HEEL, 1] > kp[RIGHT_TOE, 1] + 0.02 and kp[RIGHT_HEEL, 1] > 0.88:
            _add(errors, counts, ts, "heel_strike", "right_foot", float(kp[RIGHT_HEEL, 1] - kp[RIGHT_TOE, 1]),
                 severity_from(float(kp[RIGHT_HEEL, 1] - kp[RIGHT_TOE, 1]), 0.02, 0.08))

        # Arm cross-body — wrist crosses subject midline.
        if kp[LEFT_WRIST, 0] > hip_mid_x + 0.04:
            _add(errors, counts, ts, "arm_cross_body", "left_arm", float(kp[LEFT_WRIST, 0] - hip_mid_x),
                 severity_from(float(kp[LEFT_WRIST, 0] - hip_mid_x), 0.04, 0.12))
        if kp[RIGHT_WRIST, 0] < hip_mid_x - 0.04:
            _add(errors, counts, ts, "arm_cross_body", "right_arm", float(hip_mid_x - kp[RIGHT_WRIST, 0]),
                 severity_from(float(hip_mid_x - kp[RIGHT_WRIST, 0]), 0.04, 0.12))

        # Excessive trunk lean.
        sh_mid_y = (kp[LEFT_SHOULDER, 1] + kp[RIGHT_SHOULDER, 1]) / 2
        sh_mid_x = (kp[LEFT_SHOULDER, 0] + kp[RIGHT_SHOULDER, 0]) / 2
        hip_mid_y = (kp[LEFT_HIP, 1] + kp[RIGHT_HIP, 1]) / 2
        v = np.array([sh_mid_x - hip_mid_x, -(sh_mid_y - hip_mid_y)])
        n = np.linalg.norm(v)
        if n > 1e-6:
            cos = v[1] / n
            lean_deg = float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))
            if lean_deg > 18:
                _add(errors, counts, ts, "excessive_trunk_lean", "trunk", lean_deg,
                     severity_from(lean_deg, 18, 30))

    return {"ok": True, "errors": errors, "counts": counts}


def severity_from(value: float, low: float, high: float) -> str:
    if value < low: return "info"
    if value < (low + high) / 2: return "minor"
    if value < high: return "major"
    return "critical"


def _add(errors, counts, ts, tag, joint, value, severity):
    errors.append({
        "tsMs": ts,
        "tag": tag,
        "joint": joint,
        "value": round(float(value), 4),
        "severity": severity,
        "message": MESSAGES.get(tag, tag),
    })
    counts[tag] = counts.get(tag, 0) + 1


MESSAGES = {
    "overstride": "Heel lands ahead of hips — slows you down on contact.",
    "knee_collapse": "Knee tracks inward at mid-stance — wastes force + injury risk.",
    "heel_strike": "Landing on the heel rather than mid/forefoot — braking effect.",
    "arm_cross_body": "Arm swings across the midline — rotational energy leak.",
    "excessive_trunk_lean": "Trunk lean exceeds 18° at this point in the race — recover posture.",
}
