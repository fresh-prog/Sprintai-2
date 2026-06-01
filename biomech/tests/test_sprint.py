"""Smoke tests for the sprint analysis module.

We synthesize a sprint-shaped landmark trajectory: hip moves linearly forward,
ankles oscillate vertically out of phase, trunk leans slightly forward. The
detector should then find heel strikes, a sane stride frequency, and produce
a positive sprint score.
"""
from __future__ import annotations

import numpy as np

from src.sprint import ELITE, analyze_sprint


def _synth_sprint(n_frames: int = 180, fps: float = 60.0, stride_hz: float = 4.5) -> list[dict]:
    """Build n_frames of a forward-moving athlete with alternating heel strikes.

    All values stay in MediaPipe-style [0, 1] image coords. The hip moves in
    +x; ankles bob up and down out of phase.
    """
    ts = np.arange(n_frames) / fps * 1000.0
    frames: list[dict] = []
    for i, t_ms in enumerate(ts):
        t_s = i / fps
        hip_x = 0.05 + 0.6 * (t_s / (n_frames / fps))
        hip_y = 0.50
        # Alternating ankle drop (Y up = small, Y down = large in image coords).
        l_ankle_y = 0.92 + 0.05 * max(0.0, np.sin(2 * np.pi * stride_hz * t_s))
        r_ankle_y = 0.92 + 0.05 * max(0.0, np.sin(2 * np.pi * stride_hz * t_s + np.pi))

        kp = [{"i": j, "x": 0.5, "y": 0.5, "z": 0.0, "vis": 1.0} for j in range(33)]
        # Shoulders slightly forward of hips for a small trunk lean.
        kp[11] = {"i": 11, "x": hip_x + 0.02, "y": hip_y - 0.30, "z": 0.0, "vis": 1.0}
        kp[12] = {"i": 12, "x": hip_x + 0.02, "y": hip_y - 0.30, "z": 0.0, "vis": 1.0}
        kp[23] = {"i": 23, "x": hip_x - 0.03, "y": hip_y, "z": 0.0, "vis": 1.0}
        kp[24] = {"i": 24, "x": hip_x + 0.03, "y": hip_y, "z": 0.0, "vis": 1.0}
        kp[25] = {"i": 25, "x": hip_x - 0.03, "y": hip_y + 0.18, "z": 0.0, "vis": 1.0}
        kp[26] = {"i": 26, "x": hip_x + 0.03, "y": hip_y + 0.18, "z": 0.0, "vis": 1.0}
        kp[27] = {"i": 27, "x": hip_x - 0.03, "y": hip_y + 0.36, "z": 0.0, "vis": 1.0}
        kp[28] = {"i": 28, "x": hip_x + 0.03, "y": hip_y + 0.36, "z": 0.0, "vis": 1.0}
        kp[29] = {"i": 29, "x": hip_x - 0.03, "y": l_ankle_y, "z": 0.0, "vis": 1.0}
        kp[30] = {"i": 30, "x": hip_x + 0.03, "y": r_ankle_y, "z": 0.0, "vis": 1.0}
        # Elbows + wrists to give a non-zero arm swing reading.
        sway = 0.05 * np.sin(2 * np.pi * stride_hz * t_s)
        kp[13] = {"i": 13, "x": hip_x - 0.10, "y": hip_y - 0.10 + sway, "z": 0.0, "vis": 1.0}
        kp[15] = {"i": 15, "x": hip_x - 0.15, "y": hip_y - 0.05 + sway, "z": 0.0, "vis": 1.0}
        kp[14] = {"i": 14, "x": hip_x + 0.10, "y": hip_y - 0.10 - sway, "z": 0.0, "vis": 1.0}
        kp[16] = {"i": 16, "x": hip_x + 0.15, "y": hip_y - 0.05 - sway, "z": 0.0, "vis": 1.0}

        frames.append({"frameIdx": i, "tsMs": int(t_ms), "keypoints": kp})
    return frames


def test_returns_no_op_for_short_sequences():
    out = analyze_sprint([])
    assert out["sprint_score"] == 0.0
    assert "reason" in out


def test_detects_sane_stride_frequency():
    frames = _synth_sprint(n_frames=180, fps=60.0, stride_hz=4.5)
    out = analyze_sprint(frames)
    # Detected stride frequency should be in the right ballpark — within 50%
    # of the synthesized value (we're lenient because peak detection on a
    # short window is noisy).
    assert 2.0 <= out["stride_freq_hz"] <= 7.0


def test_phase_timeline_is_non_empty_and_ordered():
    frames = _synth_sprint(n_frames=180, fps=60.0)
    out = analyze_sprint(frames)
    timeline = out["phase_timeline"]
    assert len(timeline) >= 1
    for prev, nxt in zip(timeline[:-1], timeline[1:]):
        assert prev["end_ms"] <= nxt["start_ms"]


def test_scores_are_in_range():
    frames = _synth_sprint(n_frames=180, fps=60.0)
    out = analyze_sprint(frames)
    assert 0.0 <= out["sprint_score"] <= 100.0
    assert 0.0 <= out["technique_score"] <= 100.0


def test_elite_benchmarks_exposed():
    frames = _synth_sprint(n_frames=180, fps=60.0)
    out = analyze_sprint(frames)
    assert out["benchmarks"] == ELITE
