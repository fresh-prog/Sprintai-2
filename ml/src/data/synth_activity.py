"""Synthetic activity dataset generator.

Generates windows of per-frame features that loosely mimic six activities:
idle, walk, run, squat, jump, sit. The trajectories are parametric (sine
waves on hip/knee for the lower body, linear translation for walk/run)
rather than mocap-grade — but they let the activity TCN learn realistic
temporal patterns without scraping a third-party dataset.

Run:
    python -m src.data.synth_activity --out data/processed/activity.npz --n 4000
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from ..models.activity import ACTIVITY_CLASSES, PER_FRAME_DIM, WINDOW_LEN
from ..utils.features import feature_vector
from .synth_posture import _canonical_landmarks


def _sequence(cls: str, rng: np.random.Generator) -> np.ndarray:
    """Return a (WINDOW_LEN, 33, 4) landmark trajectory for one example."""
    base = _canonical_landmarks()
    out = np.tile(base, (WINDOW_LEN, 1, 1))
    t = np.linspace(0, 2 * np.pi, WINDOW_LEN)

    if cls == "idle":
        sway = 0.005 * np.sin(t * 0.5)
        out[:, :, 1] += sway[:, None]
        return out

    if cls == "walk":
        # Alternating knee bend + small vertical bob.
        l_knee_dy = 0.04 * np.maximum(0, np.sin(t * 2))
        r_knee_dy = 0.04 * np.maximum(0, np.sin(t * 2 + np.pi))
        out[:, 25, 1] += l_knee_dy
        out[:, 27, 1] += l_knee_dy * 1.5
        out[:, 26, 1] += r_knee_dy
        out[:, 28, 1] += r_knee_dy * 1.5
        bob = 0.01 * np.sin(t * 4)
        out[:, :, 1] += bob[:, None]
        return out

    if cls == "run":
        amp_knee = 0.10
        amp_bob = 0.04
        l = amp_knee * np.maximum(0, np.sin(t * 4))
        r = amp_knee * np.maximum(0, np.sin(t * 4 + np.pi))
        out[:, [25, 27], 1] += l[:, None]
        out[:, [26, 28], 1] += r[:, None]
        out[:, :, 1] += (amp_bob * np.sin(t * 8))[:, None]
        return out

    if cls == "squat":
        # Both knees bend in unison; hips drop.
        depth = 0.12 * (0.5 - 0.5 * np.cos(t))  # 0 → 0.12 → 0
        out[:, [23, 24], 1] += depth[:, None]
        out[:, [25, 26], 1] += depth[:, None] * 1.4
        return out

    if cls == "jump":
        # Brief upward translation (negative dy) mid-window.
        impulse = -0.15 * np.exp(-((t - np.pi) ** 2) / 0.4)
        out[:, :, 1] += impulse[:, None]
        return out

    if cls == "sit":
        # Static lower-body bent ~ 90°.
        out[:, [25, 26], 1] += 0.10
        out[:, [27, 28], 1] += 0.05
        out[:, [27, 28], 0] += 0.05 * np.array([-1, 1])
        return out

    raise ValueError(f"unknown activity: {cls}")


def generate(n: int, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X = np.zeros((n, WINDOW_LEN, PER_FRAME_DIM), dtype=np.float32)
    y = np.zeros(n, dtype=np.int64)
    for i in range(n):
        cls_idx = int(rng.integers(0, len(ACTIVITY_CLASSES)))
        cls = ACTIVITY_CLASSES[cls_idx]
        seq = _sequence(cls, rng)
        # add small per-frame noise
        seq[:, :, :2] += rng.normal(0, 0.005, size=seq[:, :, :2].shape).astype(np.float32)
        for f_i in range(WINDOW_LEN):
            X[i, f_i] = feature_vector(seq[f_i].flatten().tolist())
        y[i] = cls_idx
    return X, y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("data/processed/activity.npz"))
    ap.add_argument("--n", type=int, default=4000)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    X, y = generate(args.n, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(args.out, X=X, y=y)
    print(f"wrote X={X.shape}, y={y.shape} → {args.out}")


if __name__ == "__main__":
    main()
