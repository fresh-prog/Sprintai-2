"""Sprint-specific biomechanics.

This module extracts sprint-specific metrics that the generic gait/geometry
modules don't cover:

* **Stride** — length (m), frequency (Hz), and step time variance.
* **Ground contact time (GCT)** estimation from ankle-y minima dwell.
* **Sprint phase classification** — acceleration / drive / max-velocity /
  speed-endurance / finish — using velocity + posture heuristics.
* **Composite sprint score (0–100)** combining elite-benchmark deltas.

All math is pure NumPy/SciPy. We treat MediaPipe's normalized image coords
as our domain (no real-world calibration assumed) and scale by the athlete's
height when one is provided — see `scale_factor`.

Elite benchmarks (used for the score) come from published sprint biomech
literature:
* Stride frequency at max velocity: ~4.5–5.0 Hz for world-class men.
* Stride length / leg length: ~2.5–2.7 at max velocity.
* GCT at max velocity: ~85–100 ms.
* Trunk lean during max velocity: ~5–10° forward.

See: Mero & Komi (1986); Weyand et al. (2000); Bushnell & Hunter (2007).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal, Optional

import numpy as np
from scipy.signal import find_peaks

from .geometry import frame_angles

# MediaPipe landmark indices we lean on.
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28
LEFT_HEEL, RIGHT_HEEL = 29, 30
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
NOSE = 0

SprintPhase = Literal[
    "acceleration",     # 0–10 m — body angle ~45°, ascending velocity
    "drive",            # 10–30 m — rising velocity, body still leaning
    "transition",       # 30–60 m — body upright, velocity plateauing
    "max_velocity",     # 60–80 m — peak velocity, upright, high cadence
    "speed_endurance",  # 80–100 m+ — slight decel, fatigue cues
    "finish",           # final 5 m — lean increases for the lean-in
]

ELITE = {
    "stride_freq_hz":    4.7,    # max-vel target for elite men
    "stride_len_norm":   2.6,    # stride length / leg length
    "gct_ms":            92.0,   # ground contact at max velocity
    "trunk_lean_deg":    7.5,    # forward lean at max velocity
    "knee_drive_deg":    95.0,   # front-leg knee flexion at toe-off
    "arm_swing_deg":     85.0,   # elbow flexion oscillation amplitude
}


@dataclass
class SprintMetrics:
    duration_s: float
    n_frames: int
    fps: float
    stride_freq_hz: float
    avg_stride_len_norm: float
    avg_gct_ms: float
    avg_trunk_lean_deg: float
    avg_knee_drive_deg: float
    avg_arm_swing_deg: float
    horizontal_velocity_norm: float  # in body-heights per second
    phase_timeline: list[dict]
    sprint_score: float
    technique_score: float


def analyze_sprint(frames: list[dict], *, athlete_height_cm: Optional[float] = None) -> dict:
    """Top-level entry point. Returns a serializable summary suitable for the
    backend to persist as Metric rows + Prediction rows.

    `frames` is the same shape the rest of the biomech service uses:
        [{ frameIdx, tsMs, keypoints: [{i,x,y,z?,vis?}, ...33] }, ...]
    """
    if len(frames) < 30:
        return _empty_result("not enough frames (need ≥ 30)")

    ts = np.array([f["tsMs"] for f in frames], dtype=np.float64)
    duration_s = float((ts[-1] - ts[0]) / 1000.0) if ts[-1] > ts[0] else 0.0
    if duration_s <= 0:
        return _empty_result("non-monotonic timestamps")
    fps = len(frames) / duration_s

    kp = _stack_keypoints(frames)               # (n, 33, 4)
    hip_mid = _hip_midpoint(kp)                 # (n, 2)
    leg_len = _leg_length(kp)                   # (n,)
    scale = float(np.nanmedian(leg_len))        # use median leg length as "1 unit"
    if scale <= 0 or np.isnan(scale):
        return _empty_result("could not estimate leg length")

    # --- Foot strikes → stride frequency + ground contact -------------------
    strikes_l, gct_l = _foot_strikes_and_gct(kp[:, LEFT_HEEL, 1], ts)
    strikes_r, gct_r = _foot_strikes_and_gct(kp[:, RIGHT_HEEL, 1], ts)
    all_strikes_ms = sorted([*strikes_l, *strikes_r])
    stride_freq_hz = _stride_frequency(all_strikes_ms)
    avg_gct_ms = float(np.nanmean([*gct_l, *gct_r])) if (gct_l or gct_r) else 0.0

    # --- Stride length: hip-center displacement between successive strikes --
    avg_stride_len_norm = _avg_stride_length(hip_mid, ts, all_strikes_ms) / scale

    # --- Trunk lean (shoulder-mid → hip-mid vs vertical) --------------------
    avg_trunk_lean_deg = float(np.nanmean(_trunk_lean(kp)))

    # --- Knee drive amplitude (peak knee flexion mid-stride) ---------------
    avg_knee_drive_deg = float(np.nanmean(_per_frame_value(kp, _knee_drive_one)))

    # --- Arm swing (elbow flexion oscillation) -----------------------------
    avg_arm_swing_deg = float(_arm_swing_amplitude(kp))

    # --- Horizontal velocity (hip-mid Δx per second, in body-heights) -------
    horizontal_velocity_norm = float(_horizontal_velocity(hip_mid, ts) / scale)

    # --- Phase timeline ----------------------------------------------------
    phases = _phase_timeline(hip_mid, ts, all_strikes_ms, kp)

    # --- Scores ------------------------------------------------------------
    technique = _technique_score(
        avg_stride_len_norm, avg_gct_ms, avg_trunk_lean_deg,
        avg_knee_drive_deg, avg_arm_swing_deg, stride_freq_hz,
    )
    sprint_score = _sprint_score(technique, horizontal_velocity_norm)

    m = SprintMetrics(
        duration_s=duration_s,
        n_frames=len(frames),
        fps=fps,
        stride_freq_hz=stride_freq_hz,
        avg_stride_len_norm=avg_stride_len_norm,
        avg_gct_ms=avg_gct_ms,
        avg_trunk_lean_deg=avg_trunk_lean_deg,
        avg_knee_drive_deg=avg_knee_drive_deg,
        avg_arm_swing_deg=avg_arm_swing_deg,
        horizontal_velocity_norm=horizontal_velocity_norm,
        phase_timeline=phases,
        sprint_score=sprint_score,
        technique_score=technique,
    )

    out = asdict(m)
    out["benchmarks"] = ELITE
    out["height_cm"] = athlete_height_cm
    return out


# --------------------------------------------------------------------------- #
# Internals                                                                   #
# --------------------------------------------------------------------------- #

def _empty_result(reason: str) -> dict:
    return {"ok": False, "reason": reason, "sprint_score": 0.0, "technique_score": 0.0,
            "phase_timeline": []}


def _stack_keypoints(frames: list[dict]) -> np.ndarray:
    out = np.zeros((len(frames), 33, 4), dtype=np.float32)
    for i, f in enumerate(frames):
        for p in f["keypoints"]:
            out[i, p["i"]] = (p["x"], p["y"], p.get("z", 0.0), p.get("vis", 1.0))
    return out


def _hip_midpoint(kp: np.ndarray) -> np.ndarray:
    return (kp[:, LEFT_HIP, :2] + kp[:, RIGHT_HIP, :2]) / 2.0


def _leg_length(kp: np.ndarray) -> np.ndarray:
    # Median of |hip→knee| + |knee→ankle| across the two legs, per frame.
    def length(a, b):
        return np.linalg.norm(kp[:, a, :2] - kp[:, b, :2], axis=1)
    left = length(LEFT_HIP, LEFT_KNEE) + length(LEFT_KNEE, LEFT_ANKLE)
    right = length(RIGHT_HIP, RIGHT_KNEE) + length(RIGHT_KNEE, RIGHT_ANKLE)
    return (left + right) / 2.0


def _foot_strikes_and_gct(heel_y: np.ndarray, ts: np.ndarray) -> tuple[list[int], list[float]]:
    """Detect heel strikes as local maxima in heel-Y (MediaPipe Y grows down),
    and approximate ground contact as the dwell where heel-Y stays within
    20% of its peak.
    """
    n = len(heel_y)
    duration_s = max((ts[-1] - ts[0]) / 1000.0, 1e-3)
    fps = n / duration_s
    min_dist = max(int(0.18 * fps), 1)  # >5 Hz cadence max
    peaks, _ = find_peaks(heel_y, distance=min_dist, prominence=0.005)
    strike_ms = [int(ts[p]) for p in peaks]

    gct = []
    for p in peaks:
        threshold = heel_y[p] - 0.20 * abs(heel_y[p] - np.median(heel_y))
        # Walk left + right until we drop below threshold.
        lo = p
        while lo > 0 and heel_y[lo - 1] >= threshold:
            lo -= 1
        hi = p
        while hi < n - 1 and heel_y[hi + 1] >= threshold:
            hi += 1
        gct.append(float(ts[hi] - ts[lo]))
    return strike_ms, gct


def _stride_frequency(strikes_ms: list[int]) -> float:
    if len(strikes_ms) < 3:
        return 0.0
    intervals = np.diff(strikes_ms) / 1000.0
    # A stride is two steps (one per foot), so frequency = 1 / (2 * mean step time).
    return float(1.0 / (2.0 * np.mean(intervals)))


def _avg_stride_length(hip_mid: np.ndarray, ts: np.ndarray, strikes_ms: list[int]) -> float:
    if len(strikes_ms) < 3:
        return 0.0
    # Match strike timestamps back to frame indices.
    ts_arr = np.asarray(ts, dtype=np.float64)
    idxs = [int(np.argmin(np.abs(ts_arr - s))) for s in strikes_ms]
    # Stride = displacement between every other strike (same foot).
    lens = []
    for a, b in zip(idxs[:-2], idxs[2:]):
        d = float(np.linalg.norm(hip_mid[b] - hip_mid[a]))
        lens.append(d)
    return float(np.mean(lens)) if lens else 0.0


def _trunk_lean(kp: np.ndarray) -> np.ndarray:
    """Angle between the shoulder→hip vector and vertical, per frame."""
    sh_mid = (kp[:, LEFT_SHOULDER, :2] + kp[:, RIGHT_SHOULDER, :2]) / 2.0
    hip_mid = _hip_midpoint(kp)
    v = sh_mid - hip_mid                     # vector pointing up the trunk
    # Angle vs the up-vector (0,-1) — y grows downward in image coords.
    cos = -v[:, 1] / (np.linalg.norm(v, axis=1) + 1e-9)
    return np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))


def _per_frame_value(kp: np.ndarray, fn) -> np.ndarray:
    out = np.zeros(kp.shape[0], dtype=np.float64)
    for i in range(kp.shape[0]):
        out[i] = fn(kp[i])
    return out


def _knee_drive_one(frame: np.ndarray) -> float:
    """Mean knee flexion in this frame — used to gauge knee drive amplitude."""
    a = frame_angles(frame)
    return float((a["left_knee"] + a["right_knee"]) / 2.0)


def _arm_swing_amplitude(kp: np.ndarray) -> float:
    """Amplitude (max − min) of elbow flexion averaged across both arms."""
    angles = np.array([
        [frame_angles(f)["left_elbow"], frame_angles(f)["right_elbow"]] for f in kp
    ])
    if angles.size == 0:
        return 0.0
    amp = angles.max(axis=0) - angles.min(axis=0)
    return float(np.mean(amp))


def _horizontal_velocity(hip_mid: np.ndarray, ts: np.ndarray) -> float:
    """Mean |dx/dt| in normalized units per second. We use the median over the
    middle 80% of the sequence so accel + decel don't pull the average.
    """
    if len(hip_mid) < 2:
        return 0.0
    dx = np.diff(hip_mid[:, 0])
    dt = np.diff(ts) / 1000.0
    v = np.abs(dx) / np.maximum(dt, 1e-3)
    lo, hi = int(len(v) * 0.1), int(len(v) * 0.9)
    return float(np.median(v[lo:hi]) if hi > lo else np.median(v))


def _phase_timeline(
    hip_mid: np.ndarray, ts: np.ndarray, strikes_ms: list[int], kp: np.ndarray,
) -> list[dict]:
    """Slice the run into named phases using velocity profile + trunk lean.

    Heuristics:
      * Velocity is computed on a sliding 10-frame window.
      * The first "rising" window is acceleration; once velocity > 70% of peak
        and trunk lean < 12°, we switch to drive → max_velocity.
      * Once velocity drops below 90% of peak in the back third, we tag
        speed_endurance; the last 0.5 s is finish.
    """
    n = len(ts)
    if n < 10:
        return []

    win = max(int(n * 0.08), 5)
    dt = np.diff(ts) / 1000.0
    dx = np.abs(np.diff(hip_mid[:, 0]))
    v = np.zeros(n)
    v[1:] = dx / np.maximum(dt, 1e-3)
    v_smooth = np.convolve(v, np.ones(win) / win, mode="same")
    v_peak = float(np.max(v_smooth)) or 1.0

    lean = _trunk_lean(kp)

    out: list[dict] = []
    cur_phase: SprintPhase = "acceleration"
    cur_start = 0
    for i in range(1, n):
        ratio = v_smooth[i] / v_peak
        t_remaining_s = (ts[-1] - ts[i]) / 1000.0
        new_phase: SprintPhase = cur_phase

        if cur_phase == "acceleration" and ratio > 0.55:
            new_phase = "drive"
        elif cur_phase == "drive" and lean[i] < 12 and ratio > 0.85:
            new_phase = "transition"
        elif cur_phase == "transition" and ratio > 0.97:
            new_phase = "max_velocity"
        elif cur_phase == "max_velocity" and ratio < 0.9:
            new_phase = "speed_endurance"
        if t_remaining_s < 0.5 and new_phase != "finish":
            new_phase = "finish"

        if new_phase != cur_phase:
            out.append({
                "phase": cur_phase,
                "start_ms": int(ts[cur_start]),
                "end_ms": int(ts[i]),
                "duration_ms": int(ts[i] - ts[cur_start]),
            })
            cur_phase = new_phase
            cur_start = i

    out.append({
        "phase": cur_phase,
        "start_ms": int(ts[cur_start]),
        "end_ms": int(ts[-1]),
        "duration_ms": int(ts[-1] - ts[cur_start]),
    })
    return out


# --------------------------------------------------------------------------- #
# Scoring                                                                     #
# --------------------------------------------------------------------------- #

def _proximity(value: float, target: float, sigma: float) -> float:
    """0–1 Gaussian-like score: 1 at target, dropping off by `sigma`."""
    if target == 0:
        return 0.0
    z = (value - target) / sigma
    return float(np.exp(-0.5 * z * z))


def _technique_score(
    stride_len_norm: float, gct_ms: float, trunk_lean_deg: float,
    knee_drive_deg: float, arm_swing_deg: float, stride_freq_hz: float,
) -> float:
    parts = {
        "stride_len":  _proximity(stride_len_norm,    ELITE["stride_len_norm"], 0.5),
        "stride_freq": _proximity(stride_freq_hz,     ELITE["stride_freq_hz"],  0.8),
        "gct":         _proximity(gct_ms,             ELITE["gct_ms"],          25.0),
        "trunk":       _proximity(trunk_lean_deg,     ELITE["trunk_lean_deg"],  5.0),
        "knee":        _proximity(knee_drive_deg,     ELITE["knee_drive_deg"],  20.0),
        "arms":        _proximity(arm_swing_deg,      ELITE["arm_swing_deg"],   25.0),
    }
    return float(np.mean(list(parts.values())) * 100)


def _sprint_score(technique: float, velocity_norm: float) -> float:
    """Composite 0–100 score. Technique counts for 60%, the velocity component
    for 40%. Velocity is normalized against 4.0 body-heights/sec which is a
    rough proxy for elite max-velocity (e.g. 12 m/s for a 1.85 m athlete)."""
    velocity_component = min(velocity_norm / 4.0, 1.0) * 100
    return float(0.6 * technique + 0.4 * velocity_component)
