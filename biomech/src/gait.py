"""Cadence + heel-strike detection from ankle Y trajectory.

This is a pragmatic, marker-less approximation — good enough for live coaching
and reports, not a substitute for a force plate. Returns steps/min and a list
of strike timestamps for each foot.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import find_peaks

LEFT_ANKLE = 27
RIGHT_ANKLE = 28


def cadence_from_frames(frames: list[dict]) -> dict:
    if len(frames) < 30:
        return dict(cadence_spm=0.0, left_strikes=[], right_strikes=[])

    ts = np.array([f["tsMs"] for f in frames], dtype=np.float64)
    duration_s = (ts[-1] - ts[0]) / 1000.0 if ts[-1] > ts[0] else 1.0

    def axis(kp_idx: int) -> np.ndarray:
        return np.array([f["keypoints"][kp_idx]["y"] for f in frames], dtype=np.float64)

    left_y = axis(LEFT_ANKLE)
    right_y = axis(RIGHT_ANKLE)

    # MediaPipe Y grows downward, so a heel-strike is a *peak* in Y.
    # Min separation: 0.25 s at observed fps.
    fps = len(frames) / max(duration_s, 0.001)
    min_dist = max(int(0.25 * fps), 1)

    left_peaks, _ = find_peaks(left_y, distance=min_dist, prominence=0.005)
    right_peaks, _ = find_peaks(right_y, distance=min_dist, prominence=0.005)

    strikes = len(left_peaks) + len(right_peaks)
    cadence_spm = strikes / duration_s * 60.0
    return dict(
        cadence_spm=float(cadence_spm),
        left_strikes=[int(ts[i]) for i in left_peaks],
        right_strikes=[int(ts[i]) for i in right_peaks],
    )
