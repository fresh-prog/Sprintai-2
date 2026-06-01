"""Video → MediaPipe Pose frame extractor.

Used by the backend when a user uploads an MP4/MOV/etc. We open the video
with OpenCV, run MediaPipe Pose on every Nth frame (controlled by the
`stride` parameter — default 2, so ~15 fps from a 30 fps source), and emit
a list of pose-frame dicts in the same shape Postgres stores.

Designed to run on a CPU-only container. ~50 fps on a modern laptop for
480p input.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose


def extract_frames(
    video_path: str | Path,
    *,
    stride: int = 2,
    max_frames: int = 6000,
    min_confidence: float = 0.5,
) -> dict:
    """Run MediaPipe Pose over the video and return a serializable dict:

        {
          "ok": True,
          "fps": 30.0,
          "width": 1920,
          "height": 1080,
          "frames": [
            { "frameIdx": 0, "tsMs": 0,
              "keypoints": [{"i": 0, "x": .., "y": .., "z": .., "vis": ..}, ...33],
              "confidence": 0.94 },
            ...
          ]
        }

    Returns `{ok: False, reason: "..."}` if the file can't be opened or
    no usable frames are found.
    """
    path = str(video_path)
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return {"ok": False, "reason": f"cannot open {path}"}

    fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    frames: list[dict] = []
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,        # 0=lite, 1=full, 2=heavy
        enable_segmentation=False,
        min_detection_confidence=min_confidence,
        min_tracking_confidence=min_confidence,
    ) as pose:
        out_idx = 0
        for src_idx in range(min(total, max_frames * max(stride, 1))):
            ok, bgr = cap.read()
            if not ok:
                break
            if src_idx % stride != 0:
                continue

            # MediaPipe wants RGB.
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if not result.pose_landmarks:
                continue

            ts_ms = int((src_idx / fps) * 1000)
            kp = []
            visibilities = []
            for i, lm in enumerate(result.pose_landmarks.landmark):
                kp.append({
                    "i": i,
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "z": float(lm.z),
                    "vis": float(lm.visibility),
                })
                visibilities.append(float(lm.visibility))
            confidence = float(np.mean(visibilities)) if visibilities else 0.0

            frames.append({
                "frameIdx": out_idx,
                "tsMs": ts_ms,
                "keypoints": kp,
                "confidence": confidence,
            })
            out_idx += 1
            if out_idx >= max_frames:
                break

    cap.release()
    if not frames:
        return {"ok": False, "reason": "no pose detected in video"}

    return {
        "ok": True,
        "fps": fps,
        "width": width,
        "height": height,
        "totalFrames": total,
        "extracted": len(frames),
        "frames": frames,
    }


def stream_frames(video_path: str | Path, **kwargs) -> Iterator[dict]:
    """Generator variant — yields pose frames one at a time. Useful when
    you want to write to the database incrementally instead of building
    the full list in memory."""
    result = extract_frames(video_path, **kwargs)
    if result.get("ok"):
        yield from result["frames"]
