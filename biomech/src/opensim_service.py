"""Biomechanics microservice.

Exposes joint angles, ROM, symmetry, and gait endpoints. The OpenSim inverse-
kinematics endpoint is gated behind the optional `opensim` package — if it's
not installed the route returns 503 with a clear message so the rest of the
stack stays green.
"""
from __future__ import annotations

import importlib.util
import logging
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .gait import cadence_from_frames
from .geometry import frame_angles, range_of_motion, robinson_symmetry

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("biomech")

app = FastAPI(title="SprintAI Biomech", version="0.1.0")

_OPENSIM_AVAILABLE = importlib.util.find_spec("opensim") is not None


# ---------- Schemas ----------

class Keypoint(BaseModel):
    i: int
    x: float
    y: float
    z: float = 0.0
    vis: float = 1.0


class Frame(BaseModel):
    frameIdx: int = 0
    tsMs: int
    keypoints: list[Keypoint] = Field(..., min_length=33, max_length=33)


class FrameBatch(BaseModel):
    frames: list[Frame]


class IkRequest(BaseModel):
    sessionId: str


# ---------- Helpers ----------

def _frames_to_array(frames: list[Frame]) -> list[np.ndarray]:
    out = []
    for f in frames:
        arr = np.zeros((33, 4), dtype=np.float32)
        for kp in f.keypoints:
            arr[kp.i] = (kp.x, kp.y, kp.z, kp.vis)
        out.append(arr)
    return out


# ---------- Routes ----------

@app.get("/healthz")
def healthz():
    return {"ok": True, "opensim": _OPENSIM_AVAILABLE}


@app.post("/angles")
def angles(batch: FrameBatch) -> dict[str, Any]:
    arrs = _frames_to_array(batch.frames)
    per_frame = [frame_angles(a) for a in arrs]
    return {"angles": per_frame}


@app.post("/rom")
def rom(batch: FrameBatch) -> dict[str, Any]:
    arrs = _frames_to_array(batch.frames)
    per_frame = [frame_angles(a) for a in arrs]
    return {"rom": range_of_motion(per_frame)}


@app.post("/symmetry")
def symmetry(batch: FrameBatch) -> dict[str, Any]:
    arrs = _frames_to_array(batch.frames)
    per_frame = [frame_angles(a) for a in arrs]
    if not per_frame:
        return {"symmetry": {}}
    avg = {k: float(np.mean([f[k] for f in per_frame])) for k in per_frame[0]}
    pairs = [
        ("knee",     "left_knee",     "right_knee"),
        ("hip",      "left_hip",      "right_hip"),
        ("elbow",    "left_elbow",    "right_elbow"),
    ]
    out = {name: robinson_symmetry(avg[l], avg[r]) for name, l, r in pairs}
    return {"symmetry": out}


@app.post("/gait")
def gait(batch: FrameBatch) -> dict[str, Any]:
    # Pydantic → dicts for the existing geometry helpers.
    frames = [f.model_dump() for f in batch.frames]
    return cadence_from_frames(frames)


@app.post("/ik/run")
def run_ik(req: IkRequest):
    if not _OPENSIM_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "OpenSim Python bindings not installed. "
                "Add `opensim==4.5.1` to biomech/requirements.txt to enable."
            ),
        )
    # Real implementation lands in Phase 4 — see docs/ROADMAP.md.
    # Outline:
    #   1. Pull pose_frames for sessionId from Postgres (via backend HTTP).
    #   2. Convert MediaPipe → TRC marker file (see opencap_processor pattern).
    #   3. Run InverseKinematicsTool against a scaled gait2354 model.
    #   4. Parse the .mot output, push joint angles back as Metric rows.
    return {"status": "queued", "sessionId": req.sessionId}
