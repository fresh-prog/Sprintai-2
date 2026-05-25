"""Synthetic posture dataset generator.

Why this exists: the public posture-labeled MediaPipe datasets are small and
inconsistent. To bootstrap training we generate a labeled CSV by procedurally
distorting a canonical T-pose. The shapes are crude — slight trunk lean, hip
shift, knee bend — but enough for the MLP to learn separation between the
five posture classes, and the same generator doubles as a unit-test fixture.

Run:
    python -m src.data.synth_posture --out data/processed/posture.csv --n 5000
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from ..models.posture import POSTURE_CLASSES
from ..utils.features import feature_vector


def _canonical_landmarks() -> np.ndarray:
    """A neutral, front-facing T-pose in MediaPipe's [0,1] image coordinates.

    Y grows downward (image convention), so feet are at Y≈0.95.
    """
    lm = np.zeros((33, 4), dtype=np.float32)
    lm[:, 3] = 1.0  # visibility
    # head/torso
    lm[0]  = (0.50, 0.10, 0.0, 1.0)  # nose
    lm[11] = (0.42, 0.30, 0.0, 1.0)  # L shoulder
    lm[12] = (0.58, 0.30, 0.0, 1.0)  # R shoulder
    # arms (relaxed at sides)
    lm[13] = (0.40, 0.45, 0.0, 1.0); lm[15] = (0.39, 0.60, 0.0, 1.0)
    lm[14] = (0.60, 0.45, 0.0, 1.0); lm[16] = (0.61, 0.60, 0.0, 1.0)
    # hips
    lm[23] = (0.45, 0.55, 0.0, 1.0); lm[24] = (0.55, 0.55, 0.0, 1.0)
    # legs
    lm[25] = (0.45, 0.75, 0.0, 1.0); lm[27] = (0.45, 0.95, 0.0, 1.0)
    lm[26] = (0.55, 0.75, 0.0, 1.0); lm[28] = (0.55, 0.95, 0.0, 1.0)
    return lm


def _apply_posture(lm: np.ndarray, cls: str, rng: np.random.Generator) -> np.ndarray:
    """Mutate a canonical landmark array to fit one of the posture classes."""
    out = lm.copy()
    jitter = rng.normal(0, 0.01, size=(33, 2)).astype(np.float32)
    out[:, :2] += jitter

    if cls == "upright":
        return out

    if cls == "hunched":
        # Shift head/shoulders forward (+x toward 0.5) and down.
        head_idx = [0, 11, 12]
        out[head_idx, 1] += rng.uniform(0.04, 0.08)
        return out

    if cls == "leaning_left":
        out[:17, 0] -= rng.uniform(0.05, 0.10)  # upper body shifts left
        return out

    if cls == "leaning_right":
        out[:17, 0] += rng.uniform(0.05, 0.10)
        return out

    if cls == "slouched":
        # Round the upper back: pull shoulders & neck down, hips slightly forward.
        out[[0, 11, 12], 1] += rng.uniform(0.05, 0.09)
        out[[23, 24], 0] += rng.uniform(-0.01, 0.01)
        return out

    raise ValueError(f"unknown class: {cls}")


def generate(n: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    base = _canonical_landmarks()

    rows = []
    labels = []
    for _ in range(n):
        cls_idx = rng.integers(0, len(POSTURE_CLASSES))
        cls = POSTURE_CLASSES[cls_idx]
        lm = _apply_posture(base, cls, rng)
        fv = feature_vector(lm.flatten().tolist())
        rows.append(fv)
        labels.append(cls_idx)

    df = pd.DataFrame(rows, columns=[f"f{i}" for i in range(rows[0].shape[0])])
    df["label"] = labels
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("data/processed/posture.csv"))
    ap.add_argument("--n", type=int, default=5000)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    df = generate(args.n, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"wrote {len(df)} rows → {args.out}")


if __name__ == "__main__":
    main()
