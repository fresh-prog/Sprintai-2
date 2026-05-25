import numpy as np
from src.gait import cadence_from_frames


def _frame(ts_ms: int, l_ankle_y: float, r_ankle_y: float) -> dict:
    kp = [{"i": i, "x": 0.5, "y": 0.5, "z": 0.0, "vis": 1.0} for i in range(33)]
    kp[27]["y"] = float(l_ankle_y)
    kp[28]["y"] = float(r_ankle_y)
    return {"frameIdx": ts_ms, "tsMs": ts_ms, "keypoints": kp}


def test_cadence_zero_when_too_few_frames():
    out = cadence_from_frames([_frame(i * 33, 0.5, 0.5) for i in range(10)])
    assert out["cadence_spm"] == 0.0


def test_cadence_detects_alternating_strikes():
    # 4 seconds @ 30 fps, ankles oscillate out-of-phase at ~1 Hz → ~120 spm.
    frames = []
    for i in range(120):
        t_s = i / 30
        l = 0.9 + 0.05 * np.sin(2 * np.pi * 1.0 * t_s)
        r = 0.9 + 0.05 * np.sin(2 * np.pi * 1.0 * t_s + np.pi)
        frames.append(_frame(i * 33, l, r))

    out = cadence_from_frames(frames)
    # Expect ~ 2 strikes/s total (1 per foot/s) → 120 spm. Tolerate a wide band
    # because peak detection on a short window is noisy.
    assert 60 <= out["cadence_spm"] <= 200
    assert len(out["left_strikes"]) >= 1
    assert len(out["right_strikes"]) >= 1
