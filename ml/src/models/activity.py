"""Activity classifier — temporal model over a sliding window of frames.

Uses a small 1D conv stack (TCN-flavored) instead of an LSTM: easier to train,
faster on CPU, and the receptive field is sufficient for sub-second activities.
"""
from __future__ import annotations

import tensorflow as tf

ACTIVITY_CLASSES = ["idle", "walk", "run", "squat", "jump", "sit"]
WINDOW_LEN = 32
PER_FRAME_DIM = 107  # match posture features


def build_activity_model(num_classes: int = len(ACTIVITY_CLASSES)) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(WINDOW_LEN, PER_FRAME_DIM))
    x = tf.keras.layers.Conv1D(64, 5, padding="causal", activation="relu")(inputs)
    x = tf.keras.layers.Conv1D(64, 5, padding="causal", dilation_rate=2, activation="relu")(x)
    x = tf.keras.layers.Conv1D(64, 5, padding="causal", dilation_rate=4, activation="relu")(x)
    x = tf.keras.layers.GlobalAveragePooling1D()(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs, name="activity_tcn")
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model
