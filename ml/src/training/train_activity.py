"""Train the activity (TCN) classifier on windowed pose features.

Expects an NPZ at data/processed/activity.npz with:
  X: (N, WINDOW_LEN, PER_FRAME_DIM)
  y: (N,)
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

from ..models.activity import ACTIVITY_CLASSES, build_activity_model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--out", type=Path, default=Path("checkpoints/activity"))
    args = ap.parse_args()

    npz = np.load(args.data)
    X, y = npz["X"].astype(np.float32), npz["y"].astype(np.int64)
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    model = build_activity_model()
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
    (args.out / "classes.txt").write_text("\n".join(ACTIVITY_CLASSES))
    print(f"saved → {args.out}")


if __name__ == "__main__":
    main()
