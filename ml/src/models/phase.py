"""Sprint-phase classifier — temporal conv net over per-frame features.

Replaces (or augments) the heuristic phase timeline in `biomech/src/sprint.py`.
The model is intentionally small: ~30k params, runs on CPU, single
SavedModel artifact that the biomech service loads on startup. Output is a
softmax over 6 phases:

    0 acceleration   1 drive   2 transition
    3 max_velocity   4 speed_endurance   5 finish

Feature vector per frame is reused from `ml/src/utils/features.py` (107
dims). Window length is 16 frames (~0.5s @ 30fps) — short enough to fit
inside one sprint phase, long enough to discriminate posture + velocity
patterns.

For training, see `ml/src/training/train_phase.py`. Until labeled data
is available, the biomech service falls back to the heuristic
classifier in `sprint.py::_phase_timeline`.
"""
from __future__ import annotations

import tensorflow as tf

SPRINT_PHASES = [
    "acceleration",
    "drive",
    "transition",
    "max_velocity",
    "speed_endurance",
    "finish",
]
WINDOW_LEN = 16
PER_FRAME_DIM = 107


def build_phase_model(num_classes: int = len(SPRINT_PHASES)) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(WINDOW_LEN, PER_FRAME_DIM))
    x = tf.keras.layers.Conv1D(64, 3, padding="causal", activation="relu")(inputs)
    x = tf.keras.layers.Conv1D(64, 3, padding="causal", dilation_rate=2, activation="relu")(x)
    x = tf.keras.layers.Conv1D(64, 3, padding="causal", dilation_rate=4, activation="relu")(x)
    x = tf.keras.layers.GlobalAveragePooling1D()(x)
    x = tf.keras.layers.Dense(48, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs, name="phase_tcn")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model
