"""Posture classifier — tiny MLP, fast to train, fast to serve.

5 classes: upright, hunched, leaning_left, leaning_right, slouched.
"""
from __future__ import annotations

import tensorflow as tf

POSTURE_CLASSES = ["upright", "hunched", "leaning_left", "leaning_right", "slouched"]
FEATURE_DIM = 107  # see utils/features.feature_vector


def build_posture_model(num_classes: int = len(POSTURE_CLASSES)) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(FEATURE_DIM,))
    x = tf.keras.layers.Dense(128, activation="relu")(inputs)
    x = tf.keras.layers.Dropout(0.2)(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs, name="posture_mlp")
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model
