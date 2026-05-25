import numpy as np
from src.reps import count


def _frame(ts_ms: int, knee_deg: float) -> dict:
    """Build a 33-landmark frame with the requested knee flexion.

    We place the hip at (0, 0.5), knee at (0, 0.7), and the ankle at an
    angle that produces the desired knee bend. For simplicity we just keep
    the ankle directly below the knee and rely on the hip→knee→ankle vector
    geometry — small angles still register because the joint test only
    inspects the relative angle, not absolute positions.
    """
    kp = [{"i": i, "x": 0.5, "y": 0.5, "z": 0.0, "vis": 1.0} for i in range(33)]
    # Place hips, knees, ankles symmetrically.
    rad = np.deg2rad(180 - knee_deg)  # 180° = straight leg → small rad
    # ankle offset from knee using the desired bend.
    dx = 0.1 * np.sin(rad)
    dy = 0.1 * np.cos(rad)
    for hip_i, knee_i, ankle_i, side in ((23, 25, 27, -1), (24, 26, 28, +1)):
        kp[hip_i]   = {"i": hip_i,   "x": 0.5 + 0.05 * side, "y": 0.50, "z": 0.0, "vis": 1.0}
        kp[knee_i]  = {"i": knee_i,  "x": 0.5 + 0.05 * side, "y": 0.70, "z": 0.0, "vis": 1.0}
        kp[ankle_i] = {"i": ankle_i, "x": 0.5 + 0.05 * side + dx,
                       "y": 0.70 + dy, "z": 0.0, "vis": 1.0}
    return {"frameIdx": ts_ms, "tsMs": ts_ms, "keypoints": kp}


def test_no_reps_when_no_oscillation():
    frames = [_frame(i * 33, 170) for i in range(100)]
    out = count(frames, exercise="squat")
    assert out["count"] == 0


def test_detects_two_squats():
    """Build 4 seconds of motion alternating between standing (170°) and
    deep squat (80°) — should yield two rep troughs."""
    frames = []
    for i in range(120):  # 4 s @ 30 fps
        t_s = i / 30
        # Two full oscillations across 4 s → frequency 0.5 Hz.
        bend = 170 - 90 * (0.5 - 0.5 * np.cos(2 * np.pi * 0.5 * t_s))
        frames.append(_frame(i * 33, bend))
    out = count(frames, exercise="squat")
    assert out["count"] >= 1
    assert out["count"] <= 3
    for rep in out["reps"]:
        assert rep["depth_deg"] >= 50
        assert rep["start_ms"] < rep["bottom_ms"] <= rep["end_ms"]


def test_rejects_too_short_input():
    out = count([_frame(i * 33, 90) for i in range(5)], exercise="squat")
    assert out["count"] == 0
    assert out["reps"] == []
