"""FastAPI inference server.

If trained checkpoints aren't present yet, the server still starts but returns
a deterministic stub prediction so the rest of the stack can be developed
end-to-end. Swap in real checkpoints under ./checkpoints to enable real
inference.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

from .models.activity import ACTIVITY_CLASSES, PER_FRAME_DIM, WINDOW_LEN
from .models.posture import FEATURE_DIM, POSTURE_CLASSES
from .models.phase import SPRINT_PHASES, WINDOW_LEN as PHASE_WIN
from .utils.features import feature_vector

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ml")

app = FastAPI(title="SprintAI ML", version="0.1.0")

POSTURE_DIR = Path(os.getenv("POSTURE_MODEL_DIR", "checkpoints/posture"))
ACTIVITY_DIR = Path(os.getenv("ACTIVITY_MODEL_DIR", "checkpoints/activity"))
PHASE_DIR = Path(os.getenv("PHASE_MODEL_DIR", "checkpoints/phase"))

_posture_model = None
_activity_model = None
_phase_model = None


def _try_load(path: Path):
    if not (path / "model.keras").exists():
        return None
    try:
        import tensorflow as tf
        log.info("loading %s", path)
        return tf.keras.models.load_model(path / "model.keras")
    except Exception as e:  # noqa: BLE001
        log.warning("failed to load %s: %s", path, e)
        return None


@app.on_event("startup")
def _startup():
    global _posture_model, _activity_model, _phase_model
    _posture_model = _try_load(POSTURE_DIR)
    _activity_model = _try_load(ACTIVITY_DIR)
    _phase_model = _try_load(PHASE_DIR)
    log.info(
        "posture=%s activity=%s phase=%s",
        bool(_posture_model), bool(_activity_model), bool(_phase_model),
    )


# ---------- Schemas ----------

class PostureRequest(BaseModel):
    features: list[float] = Field(..., description="33×4 = 132 raw landmark scalars")


class WindowRequest(BaseModel):
    # Each frame is the 132-scalar landmark dump; we featurize on the server.
    window: list[list[float]]


class Prediction(BaseModel):
    label: str
    confidence: float
    probs: Optional[dict[str, float]] = None


# ---------- Routes ----------

@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "posture": bool(_posture_model),
        "activity": bool(_activity_model),
        "phase": bool(_phase_model),
    }


class PhaseRequest(BaseModel):
    # Each frame is the 132-scalar landmark dump; we featurize on the server.
    window: list[list[float]]


@app.post("/predict/phase", response_model=Prediction)
def predict_phase(req: PhaseRequest):
    """Sprint phase classifier. Falls back to a deterministic stub if no
    checkpoint has been published; the biomech service still gets a valid
    label so the heuristic path can be kept as the default."""
    if not req.window:
        return Prediction(label="acceleration", confidence=0.0)
    feats = np.stack([feature_vector(f) for f in req.window[-PHASE_WIN:]])
    if feats.shape[0] < PHASE_WIN:
        pad = np.zeros((PHASE_WIN - feats.shape[0], PER_FRAME_DIM), dtype=np.float32)
        feats = np.concatenate([pad, feats], axis=0)
    x = feats.reshape(1, PHASE_WIN, PER_FRAME_DIM)
    if _phase_model is None:
        idx = int(abs(x.sum())) % len(SPRINT_PHASES)
        return Prediction(label=SPRINT_PHASES[idx], confidence=0.0)
    probs = _phase_model.predict(x, verbose=0)[0]
    idx = int(np.argmax(probs))
    return Prediction(
        label=SPRINT_PHASES[idx],
        confidence=float(probs[idx]),
        probs={c: float(p) for c, p in zip(SPRINT_PHASES, probs)},
    )


@app.post("/predict/posture", response_model=Prediction)
def predict_posture(req: PostureRequest):
    if len(req.features) != 33 * 4:
        return Prediction(label="unknown", confidence=0.0)
    x = feature_vector(req.features).reshape(1, FEATURE_DIM)
    if _posture_model is None:
        # Stub: pick the class deterministically from the feature signature.
        idx = int(abs(x.sum())) % len(POSTURE_CLASSES)
        return Prediction(label=POSTURE_CLASSES[idx], confidence=0.5)
    probs = _posture_model.predict(x, verbose=0)[0]
    idx = int(np.argmax(probs))
    return Prediction(
        label=POSTURE_CLASSES[idx],
        confidence=float(probs[idx]),
        probs={c: float(p) for c, p in zip(POSTURE_CLASSES, probs)},
    )


@app.post("/predict/activity", response_model=Prediction)
def predict_activity(req: WindowRequest):
    if not req.window:
        return Prediction(label="idle", confidence=0.0)
    # Featurize each frame, pad/crop to WINDOW_LEN.
    feats = np.stack([feature_vector(f) for f in req.window[-WINDOW_LEN:]])
    if feats.shape[0] < WINDOW_LEN:
        pad = np.zeros((WINDOW_LEN - feats.shape[0], PER_FRAME_DIM), dtype=np.float32)
        feats = np.concatenate([pad, feats], axis=0)
    x = feats.reshape(1, WINDOW_LEN, PER_FRAME_DIM)
    if _activity_model is None:
        return Prediction(label="idle", confidence=0.3)
    probs = _activity_model.predict(x, verbose=0)[0]
    idx = int(np.argmax(probs))
    return Prediction(
        label=ACTIVITY_CLASSES[idx],
        confidence=float(probs[idx]),
        probs={c: float(p) for c, p in zip(ACTIVITY_CLASSES, probs)},
    )
