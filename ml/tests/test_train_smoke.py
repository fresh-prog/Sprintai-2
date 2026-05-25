"""End-to-end smoke test for the posture training pipeline.

Generates a tiny synthetic dataset, builds the MLP, trains for one epoch,
and asserts that prediction shapes are sensible. Catches regressions where
the feature vector length, model input layer, or class count drift apart.

Skipped if TensorFlow isn't importable so a barebones CI machine can still
run the rest of the suite.
"""
from __future__ import annotations

import numpy as np
import pytest

tf = pytest.importorskip("tensorflow")

from src.data.synth_posture import generate
from src.models.posture import FEATURE_DIM, POSTURE_CLASSES, build_posture_model


def test_posture_pipeline_round_trips():
    df = generate(n=200, seed=0)
    y = df.pop("label").to_numpy(dtype=np.int64)
    X = df.to_numpy(dtype=np.float32)
    assert X.shape == (200, FEATURE_DIM)

    model = build_posture_model()
    history = model.fit(X, y, epochs=1, batch_size=32, verbose=0)
    assert "loss" in history.history

    probs = model.predict(X[:5], verbose=0)
    assert probs.shape == (5, len(POSTURE_CLASSES))
    # Softmax outputs should sum ~ 1 per row.
    assert np.allclose(probs.sum(axis=1), 1.0, atol=1e-4)
