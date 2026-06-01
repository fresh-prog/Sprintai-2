"""Train the sprint-phase TCN.

Expects an NPZ at data/processed/phase.npz with:
  X: (N, WINDOW_LEN=16, PER_FRAME_DIM=107)
  y: (N,) — integers 0..5 mapping to SPRINT_PHASES

A synth generator (`src.data.synth_phase`) builds a stand-in dataset by
labeling windows from `synth_activity` — running cadence patterns at
different intensities. Replace with real labeled phase data once the
research cohort (see RESEARCH_METHODOLOGY.md §5) is annotated.

Run:
    python -m src.training.train_phase --data data/processed/phase.npz
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

from ..models.phase import SPRINT_PHASES, build_phase_model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--out", type=Path, default=Path("checkpoints/phase"))
    args = ap.parse_args()

    npz = np.load(args.data)
    X, y = npz["X"].astype(np.float32), npz["y"].astype(np.int64)
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    model = build_phase_model()
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.5, min_lr=1e-5),
    ]

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs, batch_size=args.batch,
        callbacks=callbacks, verbose=2,
    )

    args.out.mkdir(parents=True, exist_ok=True)
    model.save(args.out / "model.keras")
    (args.out / "classes.txt").write_text("\n".join(SPRINT_PHASES))
    print(f"saved → {args.out}")


if __name__ == "__main__":
    main()
