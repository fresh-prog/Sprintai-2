"""Train the posture classifier.

Expects a CSV at data/processed/posture.csv with columns:
  f0, f1, ..., f106, label   (label ∈ {0..4})

Run: `python -m src.training.train_posture --data data/processed/posture.csv`
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split

from ..models.posture import POSTURE_CLASSES, build_posture_model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--out", type=Path, default=Path("checkpoints/posture"))
    args = ap.parse_args()

    df = pd.read_csv(args.data)
    y = df.pop("label").values.astype(np.int64)
    X = df.values.astype(np.float32)

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    model = build_posture_model()
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.5, min_lr=1e-5),
    ]

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch,
        callbacks=callbacks,
        verbose=2,
    )

    args.out.mkdir(parents=True, exist_ok=True)
    model.save(args.out / "model.keras")
    (args.out / "classes.txt").write_text("\n".join(POSTURE_CLASSES))
    print(f"saved → {args.out}")


if __name__ == "__main__":
    main()
