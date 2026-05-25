"""Pure-Python angle/ROM/symmetry math. Kept dependency-light so the hot path
can run even if the OpenSim wheel isn't installed."""
from __future__ import annotations

import numpy as np

LM = dict(
    LEFT_SHOULDER=11, RIGHT_SHOULDER=12,
    LEFT_ELBOW=13,    RIGHT_ELBOW=14,
    LEFT_WRIST=15,    RIGHT_WRIST=16,
    LEFT_HIP=23,      RIGHT_HIP=24,
    LEFT_KNEE=25,     RIGHT_KNEE=26,
    LEFT_ANKLE=27,    RIGHT_ANKLE=28,
)


def angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = float(np.linalg.norm(ba) * np.linalg.norm(bc))
    if denom == 0:
        return 0.0
    cos = float(np.clip(np.dot(ba, bc) / denom, -1.0, 1.0))
    return float(np.degrees(np.arccos(cos)))


def frame_angles(kp: np.ndarray) -> dict[str, float]:
    p = kp[:, :3]
    return dict(
        left_elbow=angle(p[LM["LEFT_SHOULDER"]], p[LM["LEFT_ELBOW"]], p[LM["LEFT_WRIST"]]),
        right_elbow=angle(p[LM["RIGHT_SHOULDER"]], p[LM["RIGHT_ELBOW"]], p[LM["RIGHT_WRIST"]]),
        left_hip=angle(p[LM["LEFT_SHOULDER"]], p[LM["LEFT_HIP"]], p[LM["LEFT_KNEE"]]),
        right_hip=angle(p[LM["RIGHT_SHOULDER"]], p[LM["RIGHT_HIP"]], p[LM["RIGHT_KNEE"]]),
        left_knee=angle(p[LM["LEFT_HIP"]], p[LM["LEFT_KNEE"]], p[LM["LEFT_ANKLE"]]),
        right_knee=angle(p[LM["RIGHT_HIP"]], p[LM["RIGHT_KNEE"]], p[LM["RIGHT_ANKLE"]]),
    )


def range_of_motion(series: list[dict[str, float]]) -> dict[str, dict[str, float]]:
    """Aggregate min/max/range per joint over a sequence of per-frame angle dicts."""
    out: dict[str, dict[str, float]] = {}
    if not series:
        return out
    keys = series[0].keys()
    for k in keys:
        vals = [s[k] for s in series if k in s]
        if not vals:
            continue
        lo, hi = min(vals), max(vals)
        out[k] = dict(min=lo, max=hi, range=hi - lo, mean=float(np.mean(vals)))
    return out


def robinson_symmetry(left: float, right: float) -> float:
    denom = 0.5 * (abs(left) + abs(right))
    if denom == 0:
        return 0.0
    return abs(left - right) / denom * 100.0
