"""Feature extraction from MediaPipe Pose landmarks.

Input is a (33, 4) array (x, y, z, visibility) in normalized image coords.
Output is a fixed-length vector suitable for an MLP classifier — translation
and scale invariant so the model isn't confused by camera position.
"""
from __future__ import annotations

import numpy as np

LM = dict(
    NOSE=0,
    LEFT_SHOULDER=11, RIGHT_SHOULDER=12,
    LEFT_ELBOW=13,    RIGHT_ELBOW=14,
    LEFT_WRIST=15,    RIGHT_WRIST=16,
    LEFT_HIP=23,      RIGHT_HIP=24,
    LEFT_KNEE=25,     RIGHT_KNEE=26,
    LEFT_ANKLE=27,    RIGHT_ANKLE=28,
)


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denom == 0:
        return 0.0
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


def normalize(landmarks: np.ndarray) -> np.ndarray:
    """Center on the hip midpoint and scale by shoulder-width."""
    hip_mid = (landmarks[LM["LEFT_HIP"]] + landmarks[LM["RIGHT_HIP"]]) / 2
    sh_width = np.linalg.norm(
        landmarks[LM["LEFT_SHOULDER"]][:3] - landmarks[LM["RIGHT_SHOULDER"]][:3]
    )
    sh_width = sh_width if sh_width > 1e-6 else 1.0
    out = landmarks.copy()
    out[:, :3] = (out[:, :3] - hip_mid[:3]) / sh_width
    return out


def joint_angles(landmarks: np.ndarray) -> dict[str, float]:
    p = landmarks[:, :3]
    return dict(
        left_elbow=_angle(p[LM["LEFT_SHOULDER"]], p[LM["LEFT_ELBOW"]], p[LM["LEFT_WRIST"]]),
        right_elbow=_angle(p[LM["RIGHT_SHOULDER"]], p[LM["RIGHT_ELBOW"]], p[LM["RIGHT_WRIST"]]),
        left_shoulder=_angle(p[LM["LEFT_ELBOW"]], p[LM["LEFT_SHOULDER"]], p[LM["LEFT_HIP"]]),
        right_shoulder=_angle(p[LM["RIGHT_ELBOW"]], p[LM["RIGHT_SHOULDER"]], p[LM["RIGHT_HIP"]]),
        left_hip=_angle(p[LM["LEFT_SHOULDER"]], p[LM["LEFT_HIP"]], p[LM["LEFT_KNEE"]]),
        right_hip=_angle(p[LM["RIGHT_SHOULDER"]], p[LM["RIGHT_HIP"]], p[LM["RIGHT_KNEE"]]),
        left_knee=_angle(p[LM["LEFT_HIP"]], p[LM["LEFT_KNEE"]], p[LM["LEFT_ANKLE"]]),
        right_knee=_angle(p[LM["RIGHT_HIP"]], p[LM["RIGHT_KNEE"]], p[LM["RIGHT_ANKLE"]]),
    )


def feature_vector(landmarks_flat: list[float]) -> np.ndarray:
    """Convert the 132-long (33×4) flat list the backend sends into a feature row."""
    arr = np.asarray(landmarks_flat, dtype=np.float32).reshape(33, 4)
    normed = normalize(arr)
    angles = joint_angles(arr)
    # Flatten normalized xyz (99) + 8 joint angles → 107 features.
    return np.concatenate([normed[:, :3].flatten(), np.array(list(angles.values()), dtype=np.float32)])
